const express = require("express");
const pool = require("../config/database");

const router = express.Router();

function requireDepartmentPermission(rightCode) {
  return async function authorizeDepartmentRequest(req, res, next) {
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
            message: "You do not have permission to perform this department action.",
          });
        }
      }

      return next();
    } catch (error) {
      console.error("Department authorization error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to verify your department permissions.",
      });
    }
  };
}

function validateDepartmentCode(value) {
  if (typeof value !== "string") {
    return { error: "Department Code is required." };
  }

  const deptCode = value.trim().toUpperCase();

  if (!/^[A-Z0-9]{1,3}$/.test(deptCode)) {
    return {
      error: "Department Code must contain 1 to 3 letters or numbers.",
    };
  }

  return { deptCode };
}

function validateDepartmentName(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { error: "Department Name is required." };
  }

  const deptName = value.trim();

  if ([...deptName].length > 20) {
    return { error: "Department Name cannot exceed 20 characters." };
  }

  return { deptName };
}

router.use(requireDepartmentPermission("departments.view"));

router.get("/", async (req, res) => {
  try {
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const values = [];
    let searchCondition = "";

    if (search) {
      values.push(`%${search}%`);
      searchCondition = `WHERE d.deptcode ILIKE $1 OR d.deptname ILIKE $1`;
    }

    const result = await pool.query(
      `SELECT
         d.deptcode,
         d.deptname,
         COUNT(jh.deptcode)::int AS job_history_count
       FROM public.department d
       LEFT JOIN public.jobhistory jh ON jh.deptcode = d.deptcode
       ${searchCondition}
       GROUP BY d.deptcode, d.deptname
       ORDER BY d.deptcode`,
      values
    );

    return res.json({
      status: "success",
      departments: result.rows,
    });
  } catch (error) {
    console.error("Department list error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve departments.",
    });
  }
});

router.post("/", requireDepartmentPermission("departments.add"), async (req, res) => {
  const codeValidation = validateDepartmentCode(req.body?.deptCode);
  const nameValidation = validateDepartmentName(req.body?.deptName);

  if (codeValidation.error || nameValidation.error) {
    return res.status(400).json({
      status: "error",
      message: codeValidation.error || nameValidation.error,
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.department (deptcode, deptname)
       VALUES ($1, $2)
       RETURNING deptcode, deptname`,
      [codeValidation.deptCode, nameValidation.deptName]
    );

    return res.status(201).json({
      status: "success",
      message: "Department created successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "A department with this Department Code already exists.",
      });
    }

    console.error("Department creation error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create department.",
    });
  }
});

router.put("/:deptCode", requireDepartmentPermission("departments.edit"), async (req, res) => {
  const codeValidation = validateDepartmentCode(req.params.deptCode);
  const nameValidation = validateDepartmentName(req.body?.deptName);

  if (codeValidation.error || nameValidation.error) {
    return res.status(400).json({
      status: "error",
      message: codeValidation.error || nameValidation.error,
    });
  }

  try {
    const result = await pool.query(
      `UPDATE public.department
       SET deptname = $1
       WHERE deptcode = $2
       RETURNING deptcode, deptname`,
      [nameValidation.deptName, codeValidation.deptCode]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Department not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Department updated successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    console.error("Department update error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update department.",
    });
  }
});

router.delete("/:deptCode", requireDepartmentPermission("departments.delete"), async (req, res) => {
  const codeValidation = validateDepartmentCode(req.params.deptCode);

  if (codeValidation.error) {
    return res.status(400).json({
      status: "error",
      message: codeValidation.error,
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM public.department
       WHERE deptcode = $1
       RETURNING deptcode, deptname`,
      [codeValidation.deptCode]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Department not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Department deleted successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        status: "error",
        message: "This department cannot be deleted because employee job history uses it.",
      });
    }

    console.error("Department deletion error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to delete department.",
    });
  }
});

module.exports = router;
