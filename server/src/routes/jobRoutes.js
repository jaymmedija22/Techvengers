const express = require("express");
const pool = require("../config/database");

const router = express.Router();

function requireJobPermission(rightCode) {
  return async function authorizeJobRequest(req, res, next) {
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
             AND right_code = $2
             AND is_deleted = FALSE
           LIMIT 1`,
          [account.userid, rightCode]
        );

        if (permissionResult.rowCount === 0) {
          return res.status(403).json({
            status: "error",
            message: "You do not have permission to perform this job action.",
          });
        }
      }

      return next();
    } catch (error) {
      console.error("Job authorization error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to verify your job permissions.",
      });
    }
  };
}

function validateJobCode(value) {
  if (typeof value !== "string") {
    return { error: "Job Code is required." };
  }

  const jobCode = value.trim().toUpperCase();

  if (!/^[A-Z0-9]{1,4}$/.test(jobCode)) {
    return { error: "Job Code must contain 1 to 4 letters or numbers." };
  }

  return { jobCode };
}

function validateJobDescription(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { error: "Job Description is required." };
  }

  const jobDesc = value.trim();

  if ([...jobDesc].length > 20) {
    return { error: "Job Description cannot exceed 20 characters." };
  }

  return { jobDesc };
}

router.use(requireJobPermission("jobs.view"));

router.get("/", async (req, res) => {
  try {
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const values = [];
    let searchCondition = "";

    if (search) {
      values.push(`%${search}%`);
      searchCondition = `WHERE j.jobcode ILIKE $1 OR j.jobdesc ILIKE $1`;
    }

    const result = await pool.query(
      `SELECT
         j.jobcode,
         j.jobdesc,
         COUNT(jh.jobcode)::int AS assignment_count,
         COUNT(DISTINCT jh.empno)::int AS employee_count
       FROM public.job j
       LEFT JOIN public.jobhistory jh ON jh.jobcode = j.jobcode
       ${searchCondition}
       GROUP BY j.jobcode, j.jobdesc
       ORDER BY j.jobcode`,
      values
    );

    return res.json({
      status: "success",
      jobs: result.rows,
    });
  } catch (error) {
    console.error("Job list error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve jobs.",
    });
  }
});

router.post("/", requireJobPermission("jobs.add"), async (req, res) => {
  const codeValidation = validateJobCode(req.body?.jobCode);
  const descriptionValidation = validateJobDescription(req.body?.jobDesc);

  if (codeValidation.error || descriptionValidation.error) {
    return res.status(400).json({
      status: "error",
      message: codeValidation.error || descriptionValidation.error,
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.job (jobcode, jobdesc)
       VALUES ($1, $2)
       RETURNING jobcode, jobdesc`,
      [codeValidation.jobCode, descriptionValidation.jobDesc]
    );

    return res.status(201).json({
      status: "success",
      message: "Job created successfully.",
      job: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "A job with this Job Code already exists.",
      });
    }

    console.error("Job creation error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create job.",
    });
  }
});

router.put("/:jobCode", requireJobPermission("jobs.edit"), async (req, res) => {
  const codeValidation = validateJobCode(req.params.jobCode);
  const descriptionValidation = validateJobDescription(req.body?.jobDesc);

  if (codeValidation.error || descriptionValidation.error) {
    return res.status(400).json({
      status: "error",
      message: codeValidation.error || descriptionValidation.error,
    });
  }

  try {
    const result = await pool.query(
      `UPDATE public.job
       SET jobdesc = $1
       WHERE jobcode = $2
       RETURNING jobcode, jobdesc`,
      [descriptionValidation.jobDesc, codeValidation.jobCode]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Job not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Job updated successfully.",
      job: result.rows[0],
    });
  } catch (error) {
    console.error("Job update error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update job.",
    });
  }
});

router.delete("/:jobCode", requireJobPermission("jobs.delete"), async (req, res) => {
  const codeValidation = validateJobCode(req.params.jobCode);

  if (codeValidation.error) {
    return res.status(400).json({
      status: "error",
      message: codeValidation.error,
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM public.job
       WHERE jobcode = $1
       RETURNING jobcode, jobdesc`,
      [codeValidation.jobCode]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Job not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Job deleted successfully.",
      job: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        status: "error",
        message: "This job cannot be deleted because employee job history uses it.",
      });
    }

    console.error("Job deletion error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to delete job.",
    });
  }
});

module.exports = router;
