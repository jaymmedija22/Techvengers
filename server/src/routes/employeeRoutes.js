const express = require("express");
const pool = require("../config/database");

const router = express.Router();

async function requireEmployeeViewAccess(req, res, next) {
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

    if (account.role_name !== "Superadmin") {
      const permissionResult = await pool.query(
        `SELECT 1
         FROM public.user_permission
         WHERE user_id = $1
           AND right_code = 'employees.view'
           AND is_deleted = FALSE
         LIMIT 1`,
        [account.userid]
      );

      if (permissionResult.rowCount === 0) {
        return res.status(403).json({
          status: "error",
          message: "You do not have permission to view employees.",
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
}

router.use(requireEmployeeViewAccess);

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

    const result = await pool.query(
      `SELECT
         employee.empno,
         employee.firstname,
         employee.lastname,
         employee.gender,
         employee.hiredate,
         employee.sepdate,
         current_assignment.jobcode,
         current_assignment.jobdesc,
         current_assignment.deptcode,
         current_assignment.deptname
       FROM public.employee AS employee
       LEFT JOIN public.vw_employee_current_job_department AS current_assignment
         ON current_assignment.empno = employee.empno
       ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY employee.lastname NULLS LAST,
                employee.firstname NULLS LAST,
                employee.empno`,
      values
    );

    return res.json({
      status: "success",
      employees: result.rows,
    });
  } catch (error) {
    console.error("Employee list error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve employees.",
    });
  }
});

module.exports = router;
