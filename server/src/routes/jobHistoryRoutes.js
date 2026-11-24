const express = require("express");
const pool = require("../config/database");

const router = express.Router();

function requireJobHistoryPermission(rightCode) {
  return async function authorizeJobHistoryRequest(req, res, next) {
    if (!req.session?.user?.userid) {
      return res.status(401).json({
        status: "error",
        message: "You must be logged in.",
      });
    }

    try {
      const accountResult = await pool.query(
        `SELECT u.userid, r.role_name
         FROM public.app_user AS u
         JOIN public.role AS r ON r.role_id = u.role_id
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
            message: `You do not have permission to perform this job history action (${rightCode}).`,
          });
        }
      }

      return next();
    } catch (error) {
      console.error("Job history authorization error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to verify your job history permissions.",
      });
    }
  };
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

function validateRecord(body) {
  const empno =
    typeof body?.empno === "string" ? body.empno.trim().toUpperCase() : "";
  const jobcode =
    typeof body?.jobcode === "string" ? body.jobcode.trim().toUpperCase() : "";
  const deptcode =
    typeof body?.deptcode === "string" ? body.deptcode.trim().toUpperCase() : "";
  const effdate = typeof body?.effdate === "string" ? body.effdate.trim() : "";
  const salaryText =
    typeof body?.salary === "number" || typeof body?.salary === "string"
      ? String(body.salary).trim()
      : "";
  const salary = Number(salaryText);

  if (!/^[A-Z0-9]{1,5}$/.test(empno)) {
    return { error: "Select a valid employee." };
  }
  if (!/^[A-Z0-9]{1,4}$/.test(jobcode)) {
    return { error: "Select a valid job." };
  }
  if (!/^[A-Z0-9]{1,3}$/.test(deptcode)) {
    return { error: "Select a valid department." };
  }
  if (!isValidDate(effdate)) {
    return { error: "Enter a valid effective date." };
  }
  if (
    !/^\d+(?:\.\d{1,2})?$/.test(salaryText) ||
    !Number.isFinite(salary) ||
    salary > 99999999.99
  ) {
    return {
      error: "Salary is required and must be a non-negative amount with up to 2 decimal places.",
    };
  }

  return {
    record: { empno, jobcode, deptcode, effdate, salary },
  };
}

async function validateEmployeeDate(client, empno, effdate) {
  const result = await client.query(
    `SELECT hiredate::text AS hiredate, sepdate::text AS sepdate
     FROM public.employee
     WHERE empno = $1
     FOR UPDATE`,
    [empno]
  );

  if (result.rowCount === 0) {
    return { error: "Employee not found.", status: 404 };
  }

  const employee = result.rows[0];
  if (employee.hiredate && effdate < employee.hiredate) {
    return {
      error: "Effective date cannot be earlier than the employee's hire date.",
      status: 400,
    };
  }
  if (employee.sepdate && effdate > employee.sepdate) {
    return {
      error: "Effective date cannot be later than the employee's separation date.",
      status: 400,
    };
  }

  return { employee };
}

async function validateReferences(client, record) {
  const [jobResult, departmentResult] = await Promise.all([
    client.query("SELECT 1 FROM public.job WHERE jobcode = $1", [
      record.jobcode,
    ]),
    client.query("SELECT 1 FROM public.department WHERE deptcode = $1", [
      record.deptcode,
    ]),
  ]);

  if (jobResult.rowCount === 0) {
    return "Selected job does not exist.";
  }
  if (departmentResult.rowCount === 0) {
    return "Selected department does not exist.";
  }

  return null;
}

router.get(
  "/employees",
  requireJobHistoryPermission("job_history.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           empno,
           firstname,
           lastname,
           hiredate::text AS hiredate,
           sepdate::text AS sepdate
         FROM public.employee
         ORDER BY lastname NULLS LAST, firstname NULLS LAST, empno`
      );

      return res.json({
        status: "success",
        employees: result.rows,
      });
    } catch (error) {
      console.error("Job history employee list error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to retrieve employees for job history.",
      });
    }
  }
);

router.get(
  "/options",
  requireJobHistoryPermission("job_history.view"),
  async (req, res) => {
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
      console.error("Job history options error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to retrieve job history options.",
      });
    }
  }
);

router.get(
  "/:empno",
  requireJobHistoryPermission("job_history.view"),
  async (req, res) => {
    const empno = req.params.empno.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,5}$/.test(empno)) {
      return res.status(400).json({
        status: "error",
        message: "Select a valid employee.",
      });
    }

    try {
      const result = await pool.query(
        `SELECT
           history.empno,
           history.jobcode,
           job.jobdesc,
           history.deptcode,
           department.deptname,
           history.effdate::text AS effdate,
           history.salary::text AS salary
         FROM public.jobhistory AS history
         JOIN public.job AS job ON job.jobcode = history.jobcode
         LEFT JOIN public.department AS department
           ON department.deptcode = history.deptcode
         WHERE history.empno = $1
         ORDER BY history.effdate DESC, history.jobcode`,
        [empno]
      );

      return res.json({
        status: "success",
        jobHistory: result.rows,
      });
    } catch (error) {
      console.error("Job history list error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to retrieve employee job history.",
      });
    }
  }
);

router.post(
  "/",
  requireJobHistoryPermission("job_history.add"),
  async (req, res) => {
    const validation = validateRecord(req.body);
    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }

    const { record } = validation;
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const employeeValidation = await validateEmployeeDate(
        client,
        record.empno,
        record.effdate
      );
      if (employeeValidation.error) {
        await client.query("ROLLBACK");
        return res.status(employeeValidation.status).json({
          status: "error",
          message: employeeValidation.error,
        });
      }

      const referenceError = await validateReferences(client, record);
      if (referenceError) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: referenceError,
        });
      }

      await client.query(
        `INSERT INTO public.jobhistory
           (empno, jobcode, effdate, salary, deptcode)
         VALUES ($1, $2, $3, $4, $5)`,
        [record.empno, record.jobcode, record.effdate, record.salary, record.deptcode]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        status: "success",
        message: "Job history record added successfully.",
        jobHistory: record,
      });
    } catch (error) {
      if (client) await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          status: "error",
          message: "This employee already has a job history record for that effective date.",
        });
      }
      if (error.code === "23503") {
        return res.status(409).json({
          status: "error",
          message: "The selected employee, job, or department is no longer available.",
        });
      }

      console.error("Job history creation error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to add job history record.",
      });
    } finally {
      client?.release();
    }
  }
);

router.put(
  "/:empno/:effdate",
  requireJobHistoryPermission("job_history.edit"),
  async (req, res) => {
    const empno = req.params.empno.trim().toUpperCase();
    const originalDate = req.params.effdate;
    const validation = validateRecord({ ...req.body, empno });

    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }
    if (!isValidDate(originalDate)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid original effective date.",
      });
    }
    if (validation.record.empno !== empno) {
      return res.status(400).json({
        status: "error",
        message: "A job history record cannot be moved to another employee.",
      });
    }

    const { record } = validation;
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const employeeValidation = await validateEmployeeDate(
        client,
        empno,
        record.effdate
      );
      if (employeeValidation.error) {
        await client.query("ROLLBACK");
        return res.status(employeeValidation.status).json({
          status: "error",
          message: employeeValidation.error,
        });
      }

      const existingResult = await client.query(
        `SELECT 1
         FROM public.jobhistory
         WHERE empno = $1 AND effdate = $2
         FOR UPDATE`,
        [empno, originalDate]
      );
      if (existingResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Job history record not found.",
        });
      }

      const referenceError = await validateReferences(client, record);
      if (referenceError) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: referenceError,
        });
      }

      await client.query(
        `UPDATE public.jobhistory
         SET jobcode = $1,
             deptcode = $2,
             effdate = $3,
             salary = $4
         WHERE empno = $5 AND effdate = $6`,
        [
          record.jobcode,
          record.deptcode,
          record.effdate,
          record.salary,
          empno,
          originalDate,
        ]
      );

      await client.query("COMMIT");

      return res.json({
        status: "success",
        message: "Job history record updated successfully.",
        jobHistory: record,
      });
    } catch (error) {
      if (client) await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          status: "error",
          message: "This employee already has a job history record for that effective date.",
        });
      }
      if (error.code === "23503") {
        return res.status(409).json({
          status: "error",
          message: "The selected job or department is no longer available.",
        });
      }

      console.error("Job history update error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to update job history record.",
      });
    } finally {
      client?.release();
    }
  }
);

router.delete(
  "/:empno/:effdate",
  requireJobHistoryPermission("job_history.delete"),
  async (req, res) => {
    const empno = req.params.empno.trim().toUpperCase();
    const effdate = req.params.effdate;

    if (!/^[A-Z0-9]{1,5}$/.test(empno) || !isValidDate(effdate)) {
      return res.status(400).json({
        status: "error",
        message: "Select a valid employee and effective date.",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const employeeResult = await client.query(
        "SELECT 1 FROM public.employee WHERE empno = $1 FOR UPDATE",
        [empno]
      );
      if (employeeResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Employee not found.",
        });
      }

      const historyResult = await client.query(
        `SELECT jobcode, deptcode, salary::text AS salary
         FROM public.jobhistory
         WHERE empno = $1 AND effdate = $2
         FOR UPDATE`,
        [empno, effdate]
      );
      if (historyResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Job history record not found.",
        });
      }

      const countResult = await client.query(
        `SELECT COUNT(*)::int AS history_count
         FROM public.jobhistory
         WHERE empno = $1`,
        [empno]
      );
      if (countResult.rows[0].history_count <= 1) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          status: "error",
          message: "The employee's only job history record cannot be deleted.",
        });
      }

      await client.query(
        "DELETE FROM public.jobhistory WHERE empno = $1 AND effdate = $2",
        [empno, effdate]
      );
      await client.query("COMMIT");

      return res.json({
        status: "success",
        message: "Job history record deleted successfully.",
        jobHistory: {
          empno,
          effdate,
          ...historyResult.rows[0],
        },
      });
    } catch (error) {
      if (client) await client.query("ROLLBACK");

      console.error("Job history deletion error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to delete job history record.",
      });
    } finally {
      client?.release();
    }
  }
);

module.exports = router;
