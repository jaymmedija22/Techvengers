const express = require("express");
const pool = require("../config/database");

const router = express.Router();

function requireEmployeePermission(rightCode) {
  return async function authorizeEmployeeRequest(req, res, next) {
    if (!req.session?.user?.userid) {
      return res.status(401).json({
        status: "error",
        message: "You must be logged in.",
      });
    }

    try {
      const accountResult = await pool.query(
        `SELECT u.userid, r.role_name
         FROM public.app_user u
         JOIN public.role r ON r.role_id = u.role_id
         WHERE u.userid = $1
           AND u.isblocked = FALSE
           AND LOWER(u.status) = 'active'`,
        [req.session.user.userid]
      );

      const account = accountResult.rows[0];

      if (!account) {
        return res.status(401).json({
          status: "error",
          message: "Your account is inactive or unavailable.",
        });
      }
      req.employeeAccount = account;

      if (account.role_name !== "Superadmin") {
        const permissionResult = await pool.query(
          `SELECT 1
           FROM public.user_permission
           WHERE user_id = $1
             AND right_code = $2
             AND is_deleted = FALSE
           LIMIT 1`,
          [account.userid, rightCode]
        );

        if (permissionResult.rowCount === 0) {
          return res.status(403).json({
            status: "error",
            message: `You do not have permission to perform this employee action (${rightCode}).`,
          });
        }
      }

      return next();
    } catch (error) {
      console.error("Employee authorization error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to verify your employee permissions.",
      });
    }
  };
}

async function canViewEmployeeJobHistory(req) {
  if (req.employeeAccount?.role_name === "Superadmin") {
    return true;
  }

  const permissionResult = await pool.query(
    `SELECT 1
     FROM public.user_permission
     WHERE user_id = $1
       AND right_code = 'job_history.view'
       AND is_deleted = FALSE
     LIMIT 1`,
    [req.employeeAccount.userid]
  );

  return permissionResult.rowCount > 0;
}

function validateEmployeeData(body) {
  const empno =
    typeof body?.empno === "string" ? body.empno.trim().toUpperCase() : "";
  const firstname =
    typeof body?.firstname === "string" ? body.firstname.trim() : "";
  const lastname =
    typeof body?.lastname === "string" ? body.lastname.trim() : "";
  const gender =
    typeof body?.gender === "string" ? body.gender.trim().toUpperCase() : "";
  const birthdate =
    typeof body?.birthdate === "string" ? body.birthdate.trim() : "";
  const hiredate =
    typeof body?.hiredate === "string" ? body.hiredate.trim() : "";
  const sepdate =
    typeof body?.sepdate === "string" && body.sepdate.trim()
      ? body.sepdate.trim()
      : null;

  if (!/^[A-Z0-9]{1,5}$/.test(empno)) {
    return { error: "Employee number must contain 1 to 5 letters or numbers." };
  }
  if (!firstname || [...firstname].length > 15) {
    return { error: "First name is required and cannot exceed 15 characters." };
  }
  if (!lastname || [...lastname].length > 15) {
    return { error: "Last name is required and cannot exceed 15 characters." };
  }
  if (!["M", "F"].includes(gender)) {
    return { error: "Select a valid gender." };
  }
  if (!isValidDate(birthdate) || !isValidDate(hiredate)) {
    return { error: "Enter a valid birth date and hire date." };
  }
  if (sepdate && !isValidDate(sepdate)) {
    return { error: "Enter a valid separation date." };
  }
  if (birthdate >= hiredate) {
    return { error: "Birth date must be earlier than the hire date." };
  }
  if (sepdate && sepdate < hiredate) {
    return { error: "Separation date cannot be earlier than the hire date." };
  }

  const deptcode =
    typeof body?.deptcode === "string" ? body.deptcode.trim().toUpperCase() : "";
  const jobcode =
    typeof body?.jobcode === "string" ? body.jobcode.trim().toUpperCase() : "";
  const salaryIsSet =
    body?.salary !== "" &&
    body?.salary !== null &&
    body?.salary !== undefined;
  const salary = salaryIsSet ? Number(body.salary) : null;
  const salaryText =
    salaryIsSet && (typeof body.salary === "number" || typeof body.salary === "string")
      ? String(body.salary)
      : "";

  if (!/^[A-Z0-9]{1,3}$/.test(deptcode)) {
    return { error: "Select a valid department." };
  }
  if (!/^[A-Z0-9]{1,4}$/.test(jobcode)) {
    return { error: "Select a valid job." };
  }
  if (
    salaryIsSet &&
    (!/^\d+(?:\.\d{1,2})?$/.test(salaryText) ||
      !Number.isFinite(salary) ||
      salary > 99999999.99)
  ) {
    return {
      error: "Salary must be a non-negative amount with up to 2 decimal places.",
    };
  }

  const assignmentEffectiveDate =
    typeof body?.assignmentEffectiveDate === "string"
      ? body.assignmentEffectiveDate.trim()
      : "";

  if (assignmentEffectiveDate && !isValidDate(assignmentEffectiveDate)) {
    return { error: "Enter a valid assignment effective date." };
  }

  return {
    employee: {
      empno,
      firstname,
      lastname,
      gender,
      birthdate,
      hiredate,
      sepdate,
    },
    assignment: {
      deptcode,
      jobcode,
      salary,
      effectiveDate: assignmentEffectiveDate || hiredate,
    },
  };
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function validateAssignmentReferences(client, assignment) {
  const [department, job] = await Promise.all([
    client.query(
      "SELECT 1 FROM public.department WHERE deptcode = $1",
      [assignment.deptcode]
    ),
    client.query("SELECT 1 FROM public.job WHERE jobcode = $1", [
      assignment.jobcode,
    ]),
  ]);

  if (department.rowCount === 0) {
    return "Selected department does not exist.";
  }
  if (job.rowCount === 0) {
    return "Selected job does not exist.";
  }

  return null;
}

router.use(requireEmployeePermission("employees.view"));

router.get("/options", async (req, res) => {
  try {
    const [departments, jobs] = await Promise.all([
      pool.query(
        `SELECT deptcode, deptname
         FROM public.department
         ORDER BY deptname, deptcode`
      ),
      pool.query(
        `SELECT jobcode, jobdesc
         FROM public.job
         ORDER BY jobdesc, jobcode`
      ),
    ]);

    return res.json({
      status: "success",
      departments: departments.rows,
      jobs: jobs.rows,
    });
  } catch (error) {
    console.error("Employee filter options error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve employee filter options.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const status =
      typeof req.query.status === "string"
        ? req.query.status.trim().toLowerCase()
        : "active";
    const department =
      typeof req.query.department === "string"
        ? req.query.department.trim()
        : "";
    const job =
      typeof req.query.job === "string" ? req.query.job.trim() : "";

    if (!["active", "separated", "all"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid employment status filter.",
      });
    }

    const values = [];
    const conditions = [];

    if (status === "active") {
      conditions.push("employee.sepdate IS NULL");
    } else if (status === "separated") {
      conditions.push("employee.sepdate IS NOT NULL");
    }

    if (department) {
      values.push(department);
      conditions.push(`current_assignment.deptcode = $${values.length}`);
    }

    if (job) {
      values.push(job);
      conditions.push(`current_assignment.jobcode = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const parameter = `$${values.length}`;
      conditions.push(`(
        employee.empno ILIKE ${parameter}
        OR COALESCE(employee.firstname, '') ILIKE ${parameter}
        OR COALESCE(employee.lastname, '') ILIKE ${parameter}
        OR BTRIM(CONCAT_WS(' ', employee.firstname, employee.lastname)) ILIKE ${parameter}
        OR COALESCE(current_assignment.jobcode, '') ILIKE ${parameter}
        OR COALESCE(current_assignment.jobdesc, '') ILIKE ${parameter}
        OR COALESCE(current_assignment.deptcode, '') ILIKE ${parameter}
        OR COALESCE(current_assignment.deptname, '') ILIKE ${parameter}
      )`);
    }

    const includeSalary = await canViewEmployeeJobHistory(req);
    const result = await pool.query(
      `SELECT
         employee.empno,
         employee.firstname,
         employee.lastname,
         employee.gender,
         employee.birthdate::text AS birthdate,
         employee.hiredate::text AS hiredate,
         employee.sepdate::text AS sepdate,
         current_assignment.jobcode,
         current_assignment.jobdesc,
         current_assignment.deptcode,
         current_assignment.deptname,
         latest_history.salary,
         current_assignment.effdate::text AS effdate
       FROM public.employee AS employee
       LEFT JOIN public.vw_employee_current_job_department AS current_assignment
         ON current_assignment.empno = employee.empno
       LEFT JOIN public.jobhistory AS latest_history
         ON latest_history.empno = employee.empno
        AND latest_history.effdate = current_assignment.effdate
       ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY employee.lastname NULLS LAST,
                employee.firstname NULLS LAST,
                employee.empno`,
      values
    );

    return res.json({
      status: "success",
      employees: includeSalary
        ? result.rows
        : result.rows.map(({ salary, ...employee }) => employee),
    });
  } catch (error) {
    console.error("Employee list error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve employees.",
    });
  }
});

router.get("/:empno/profile", async (req, res) => {
  const empno =
    typeof req.params.empno === "string"
      ? req.params.empno.trim().toUpperCase()
      : "";

  if (!/^[A-Z0-9]{1,5}$/.test(empno)) {
    return res.status(400).json({
      status: "error",
      message: "Employee number must contain 1 to 5 letters or numbers.",
    });
  }

  try {
    const canViewJobHistory = await canViewEmployeeJobHistory(req);
    const historyFields = canViewJobHistory
      ? ", assignment.effdate::text AS assignment_effdate"
      : "";
    const historyJoin = canViewJobHistory
      ? `LEFT JOIN public.jobhistory AS current_history
           ON current_history.empno = employee.empno
          AND current_history.effdate = assignment.effdate`
      : "";
    const salarySelect = canViewJobHistory
      ? ", current_history.salary::text AS current_salary"
      : "";
    const employeeResult = await pool.query(
      `SELECT
           employee.empno,
           employee.firstname,
           employee.lastname,
           employee.gender,
           employee.birthdate::text AS birthdate,
           employee.hiredate::text AS hiredate,
           employee.sepdate::text AS sepdate,
           assignment.jobcode,
           assignment.jobdesc,
           assignment.deptcode,
           assignment.deptname
           ${historyFields}
           ${salarySelect}
         FROM public.employee AS employee
         LEFT JOIN public.vw_employee_current_job_department AS assignment
           ON assignment.empno = employee.empno
         ${historyJoin}
         WHERE employee.empno = $1`,
      [empno]
    );

    if (employeeResult.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found.",
      });
    }

    const historyResult = canViewJobHistory
      ? await pool.query(
        `SELECT
           history.empno,
           history.jobcode,
           COALESCE(job.jobdesc, history.jobcode) AS jobdesc,
           history.deptcode,
           department.deptname,
           history.effdate::text AS effdate
           ${canViewJobHistory ? ", history.salary::text AS salary" : ""}
         FROM public.jobhistory AS history
         LEFT JOIN public.job AS job ON job.jobcode = history.jobcode
         LEFT JOIN public.department AS department
           ON department.deptcode = history.deptcode
         WHERE history.empno = $1
         ORDER BY history.effdate ASC, history.jobcode`,
        [empno]
      )
      : { rows: [] };

    return res.json({
      status: "success",
      employee: employeeResult.rows[0],
      jobHistory: historyResult.rows,
      canViewJobHistory,
      canViewSalary: canViewJobHistory,
    });
  } catch (error) {
    console.error("Employee profile error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve employee profile.",
    });
  }
});

router.post("/", requireEmployeePermission("employees.add"), async (req, res) => {
  if (Object.hasOwn(req.body || {}, "sepdate")) {
    return res.status(400).json({
      status: "error",
      message: "Use the employee separation action to record a separation date.",
    });
  }

  const validation = validateEmployeeData(req.body);

  if (validation.error) {
    return res.status(400).json({
      status: "error",
      message: validation.error,
    });
  }

  const { employee, assignment } = validation;
  assignment.effectiveDate = employee.hiredate;
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const referenceError = await validateAssignmentReferences(client, assignment);
    if (referenceError) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "error",
        message: referenceError,
      });
    }

    await client.query(
      `INSERT INTO public.employee
         (empno, firstname, lastname, gender, birthdate, hiredate, sepdate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        employee.empno,
        employee.firstname,
        employee.lastname,
        employee.gender,
        employee.birthdate,
        employee.hiredate,
        employee.sepdate,
      ]
    );

    await client.query(
      `INSERT INTO public.jobhistory (empno, jobcode, effdate, salary, deptcode)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        employee.empno,
        assignment.jobcode,
        assignment.effectiveDate,
        assignment.salary,
        assignment.deptcode,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      status: "success",
      message: "Employee created successfully.",
      empno: employee.empno,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "An employee with this employee number already exists.",
      });
    }
    if (error.code === "23503") {
      return res.status(409).json({
        status: "error",
        message: "The selected department or job is no longer available.",
      });
    }

    console.error("Employee creation error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create employee.",
    });
  } finally {
    client?.release();
  }
});

router.patch(
  "/:empno/separate",
  requireEmployeePermission("employees.delete"),
  async (req, res) => {
    const empno =
      typeof req.params.empno === "string"
        ? req.params.empno.trim().toUpperCase()
        : "";
    const sepdate =
      typeof req.body?.sepdate === "string" ? req.body.sepdate.trim() : "";

    if (!/^[A-Z0-9]{1,5}$/.test(empno)) {
      return res.status(400).json({
        status: "error",
        message: "Employee number must contain 1 to 5 letters or numbers.",
      });
    }
    if (!isValidDate(sepdate)) {
      return res.status(400).json({
        status: "error",
        message: "A valid separation date is required.",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const employeeResult = await client.query(
        `SELECT
           employee.hiredate::text AS hiredate,
           employee.sepdate::text AS sepdate,
           (
             SELECT TO_CHAR(MAX(jobhistory.effdate), 'YYYY-MM-DD')
             FROM public.jobhistory
             WHERE jobhistory.empno = employee.empno
           ) AS latest_assignment_date
         FROM public.employee
         WHERE employee.empno = $1
         FOR UPDATE`,
        [empno]
      );

      if (employeeResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Employee not found.",
        });
      }

      const employee = employeeResult.rows[0];
      if (employee.sepdate) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          status: "error",
          message: "This employee is already separated.",
        });
      }
      if (sepdate < employee.hiredate) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: "Separation date cannot be earlier than the hire date.",
        });
      }
      if (
        employee.latest_assignment_date &&
        sepdate < employee.latest_assignment_date
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: "Separation date cannot be earlier than the latest job assignment.",
        });
      }

      const updateResult = await client.query(
        `UPDATE public.employee
         SET sepdate = $1
         WHERE empno = $2
           AND sepdate IS NULL
         RETURNING empno, sepdate::text AS sepdate`,
        [sepdate, empno]
      );

      if (updateResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          status: "error",
          message: "This employee has already been separated.",
        });
      }

      await client.query("COMMIT");

      return res.json({
        status: "success",
        message: "Employee marked as separated. The employee record was retained.",
        employee: updateResult.rows[0],
      });
    } catch (error) {
      if (client) await client.query("ROLLBACK");

      console.error("Employee separation error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to separate employee.",
      });
    } finally {
      client?.release();
    }
  }
);

router.patch(
  "/:empno/restore",
  requireEmployeePermission("employees.restore"),
  async (req, res) => {
    const empno =
      typeof req.params.empno === "string"
        ? req.params.empno.trim().toUpperCase()
        : "";

    if (!/^[A-Z0-9]{1,5}$/.test(empno)) {
      return res.status(400).json({
        status: "error",
        message: "Employee number must contain 1 to 5 letters or numbers.",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const employeeResult = await client.query(
        `SELECT empno, sepdate::text AS sepdate
         FROM public.employee
         WHERE empno = $1
         FOR UPDATE`,
        [empno]
      );

      if (employeeResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Employee not found.",
        });
      }
      if (!employeeResult.rows[0].sepdate) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          status: "error",
          message: "This employee is already active.",
        });
      }

      const updateResult = await client.query(
        `UPDATE public.employee
         SET sepdate = NULL
         WHERE empno = $1
         RETURNING empno, sepdate::text AS sepdate`,
        [empno]
      );

      await client.query("COMMIT");

      return res.json({
        status: "success",
        message: "Employee restored successfully. Existing employee information was retained.",
        employee: updateResult.rows[0],
      });
    } catch (error) {
      if (client) await client.query("ROLLBACK");

      console.error("Employee restore error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to restore employee.",
      });
    } finally {
      client?.release();
    }
  }
);

router.put(
  "/:empno",
  requireEmployeePermission("employees.edit"),
  async (req, res) => {
    if (Object.hasOwn(req.body || {}, "sepdate")) {
      return res.status(400).json({
        status: "error",
        message: "Use the employee separation or restore action to change employment status.",
      });
    }

    const validation = validateEmployeeData({
      ...req.body,
      empno: req.params.empno,
      sepdate: null,
    });

    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }

    const { employee, assignment } = validation;
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const existingResult = await client.query(
        `SELECT e.hiredate::text AS hiredate, e.sepdate::text AS sepdate
         FROM public.employee AS e
         WHERE e.empno = $1
         FOR UPDATE`,
        [employee.empno]
      );

      if (existingResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Employee not found.",
        });
      }
      employee.sepdate = existingResult.rows[0].sepdate;

      const referenceError = await validateAssignmentReferences(
        client,
        assignment
      );
      if (referenceError) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: referenceError,
        });
      }

      const historyResult = await client.query(
        `SELECT jobcode, deptcode, salary,
                TO_CHAR(effdate, 'YYYY-MM-DD') AS effdate
         FROM public.jobhistory
         WHERE empno = $1
         ORDER BY effdate DESC
         LIMIT 1
         FOR UPDATE`,
        [employee.empno]
      );
      const initialHistoryResult = await client.query(
        `SELECT TO_CHAR(MIN(effdate), 'YYYY-MM-DD') AS first_effdate
         FROM public.jobhistory
         WHERE empno = $1`,
        [employee.empno]
      );

      const currentAssignment = historyResult.rows[0];
      const firstEffectiveDate = initialHistoryResult.rows[0].first_effdate;
      if (
        currentAssignment &&
        !(await canViewEmployeeSalary(req))
      ) {
        assignment.salary =
          currentAssignment.salary === null
            ? null
            : Number(currentAssignment.salary);
      }

      if (
        firstEffectiveDate &&
        employee.hiredate > firstEffectiveDate
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: "Hire date cannot be later than the employee's first job assignment.",
        });
      }
      if (
        existingResult.rows[0].sepdate &&
        employee.hiredate > existingResult.rows[0].sepdate
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: "Hire date cannot be later than the employee's separation date.",
        });
      }

      const assignmentChanged =
        !currentAssignment ||
        currentAssignment.jobcode !== assignment.jobcode ||
        currentAssignment.deptcode !== assignment.deptcode ||
        (currentAssignment.salary === null
          ? assignment.salary !== null
          : assignment.salary === null ||
            Number(currentAssignment.salary) !== assignment.salary);

      if (currentAssignment && employee.sepdate) {
        const latestEffectiveDate = currentAssignment.effdate;
        if (employee.sepdate < latestEffectiveDate) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: "Separation date cannot be earlier than the latest job assignment.",
          });
        }
      }

      if (assignmentChanged) {
        const effectiveDate = assignment.effectiveDate;
        const minimumEffectiveDate = currentAssignment
          ? currentAssignment.effdate
          : employee.hiredate;

        if (
          effectiveDate < minimumEffectiveDate ||
          (effectiveDate === minimumEffectiveDate && currentAssignment)
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: "A new job assignment must take effect after the current assignment.",
          });
        }
        if (
          effectiveDate < employee.hiredate ||
          (employee.sepdate && effectiveDate > employee.sepdate)
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: "Assignment effective date must be between the hire and separation dates.",
          });
        }
      }

      await client.query(
        `UPDATE public.employee
         SET firstname = $1,
             lastname = $2,
             gender = $3,
             birthdate = $4,
             hiredate = $5
         WHERE empno = $6`,
        [
          employee.firstname,
          employee.lastname,
          employee.gender,
          employee.birthdate,
          employee.hiredate,
          employee.empno,
        ]
      );

      if (assignmentChanged) {
        await client.query(
          `INSERT INTO public.jobhistory (empno, jobcode, effdate, salary, deptcode)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            employee.empno,
            assignment.jobcode,
            assignment.effectiveDate,
            assignment.salary,
            assignment.deptcode,
          ]
        );
      }

      await client.query("COMMIT");

      return res.json({
        status: "success",
        message: "Employee updated successfully.",
        empno: employee.empno,
        assignmentUpdated: assignmentChanged,
      });
    } catch (error) {
      if (client) await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          status: "error",
          message: "A job history record already exists for that effective date.",
        });
      }
      if (error.code === "23503") {
        return res.status(409).json({
          status: "error",
          message: "The selected department or job is no longer available.",
        });
      }

      console.error("Employee update error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to update employee.",
      });
    } finally {
      client?.release();
    }
  }
);

module.exports = router;
