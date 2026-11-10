
const express = require("express");
const pool = require("../config/database");

const router = express.Router();

// Require an active, authenticated account with customers.view permission.
async function requireCustomerViewAccess(req, res, next) {
  if (!req.session?.user?.userid) {
    return res.status(401).json({
      status: "error",
      message: "You must be logged in.",
    });
  }

  try {
    const userResult = await pool.query(
      `SELECT userid
       FROM app_user
       WHERE userid = $1
         AND isblocked = FALSE
         AND LOWER(status) = 'active'`,
      [req.session.user.userid]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Your account is inactive or unavailable.",
      });
    }

    const permissionResult = await pool.query(
      `SELECT 1
       FROM user_permission
       WHERE user_id = $1
         AND right_code = 'customers.view'
         AND is_deleted = FALSE
       LIMIT 1`,
      [req.session.user.userid]
    );

    if (permissionResult.rows.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to view customers.",
      });
    }

    next();
  } catch (error) {
    console.error("Customer authorization error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to verify your permissions.",
    });
  }
}

// All customer-list requests require customers.view.
router.use(requireCustomerViewAccess);

// GET /api/customers?q=...&payterm=...
router.get("/", async (req, res) => {
  try {
    const search = (req.query.q || "").trim();
    const payterm = (req.query.payterm || "").trim().toUpperCase();

    const values = [];
    const conditions = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(custno ILIKE $${values.length}
          OR COALESCE(custname, '') ILIKE $${values.length}
          OR COALESCE(address, '') ILIKE $${values.length})`
      );
    }

    if (payterm) {
      values.push(payterm);
      conditions.push(`payterm = $${values.length}`);
    }

    let query = `
      SELECT custno, custname, address, payterm
      FROM vw_active_customers
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY custno ASC`;

    const result = await pool.query(query, values);

    return res.json({
      status: "success",
      customers: result.rows,
    });
  } catch (error) {
    console.error("Customer list error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve customers.",
    });
  }
});

module.exports = router;
