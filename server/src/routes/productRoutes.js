const express = require("express");
const pool = require("../config/database");

const router = express.Router();

const VALID_UNITS = ["pc", "ea", "mtr", "pkg", "ltr"];

// Require an active account and products.view permission.
async function requireProductViewAccess(req, res, next) {
  if (!req.session?.user?.userid) {
    return res.status(401).json({
      status: "error",
      message: "You must be logged in.",
    });
  }

  try {
    const userResult = await pool.query(
      `SELECT u.userid, r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.userid = $1
         AND u.isblocked = FALSE
         AND LOWER(u.status) = 'active'`,
      [req.session.user.userid]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Your account is inactive or unavailable.",
      });
    }

    const currentUser = userResult.rows[0];

    if (currentUser.role_name === "Superadmin") {
      return next();
    }

    const permissionResult = await pool.query(
      `SELECT 1
       FROM user_permission
       WHERE user_id = $1
         AND right_code = 'products.view'
         AND is_deleted = FALSE
       LIMIT 1`,
      [currentUser.userid]
    );

    if (permissionResult.rows.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to view products.",
      });
    }

    return next();
  } catch (error) {
    console.error("Product authorization error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to verify your permissions.",
    });
  }
}

router.use(requireProductViewAccess);

// GET /api/products?q=...&unit=...
router.get("/", async (req, res) => {
  try {
    const search = (req.query.q || "").trim();
    const unit = (req.query.unit || "").trim().toLowerCase();

    if (unit && !VALID_UNITS.includes(unit)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid product unit.",
      });
    }

    const values = [];
    const conditions = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(prodcode ILIKE $${values.length}
          OR COALESCE(description, '') ILIKE $${values.length})`
      );
    }

    if (unit) {
      values.push(unit);
      conditions.push(`unit = $${values.length}`);
    }

    const query = `
      SELECT prodcode, description, unit
      FROM vw_active_products
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY prodcode ASC
    `;

    const result = await pool.query(query, values);

    return res.json({
      status: "success",
      products: result.rows,
    });
  } catch (error) {
    console.error("Product list error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve products.",
    });
  }
});

module.exports = router;
