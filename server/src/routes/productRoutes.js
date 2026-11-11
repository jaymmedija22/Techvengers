
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

// Validate product information.
function validateProductInput(body) {
  const prodcode =
    typeof body.prodcode === "string" ? body.prodcode.trim() : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

  const unit =
    typeof body.unit === "string"
      ? body.unit.trim().toLowerCase()
      : "";

  if (!prodcode) {
  return { error: "Product Code is required." };
}

if (prodcode.length > 6) {
  return {
    error: "Product Code must not exceed 6 characters.",
  };
}

  if (!unit || !VALID_UNITS.includes(unit)) {
    return {
      error: "Invalid product unit. Use pc, ea, mtr, pkg, or ltr.",
    };
  }

  return {
    product: {
      prodcode,
      description: description || null,
      unit,
    },
  };
}

// Check permission for creating or editing products.
async function requireProductPermission(rightCode, req, res) {
  const result = await pool.query(
    `SELECT r.role_name
     FROM app_user u
     JOIN role r ON r.role_id = u.role_id
     WHERE u.userid = $1
       AND u.isblocked = FALSE
       AND LOWER(u.status) = 'active'`,
    [req.session.user.userid]
  );

  if (result.rows.length === 0) {
    res.status(401).json({
      status: "error",
      message: "Your account is inactive or unavailable.",
    });
    return false;
  }

  if (result.rows[0].role_name === "Superadmin") {
    return true;
  }

  const permission = await pool.query(
    `SELECT 1
     FROM user_permission
     WHERE user_id = $1
       AND right_code = $2
       AND is_deleted = FALSE
     LIMIT 1`,
    [req.session.user.userid, rightCode]
  );

  if (permission.rows.length === 0) {
    res.status(403).json({
      status: "error",
      message: "You do not have permission to perform this action.",
    });
    return false;
  }

  return true;
}

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

// GET /api/products/deleted - Retrieve deleted products
router.get("/deleted", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT prodcode, description, unit
       FROM product
       WHERE is_deleted = TRUE
       ORDER BY prodcode ASC`
    );

    return res.json({
      status: "success",
      products: result.rows,
    });
  } catch (error) {
    console.error("Deleted product list error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve deleted products.",
    });
  }
});

// POST /api/products - Create product
router.post("/", async (req, res) => {
  try {
    if (!(await requireProductPermission("products.add", req, res))) {
      return;
    }

    const validation = validateProductInput(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }

    const { prodcode, description, unit } = validation.product;

    const result = await pool.query(
      `INSERT INTO product (prodcode, description, unit)
       VALUES ($1, $2, $3)
       RETURNING prodcode, description, unit`,
      [prodcode, description, unit]
    );

    return res.status(201).json({
      status: "success",
      message: "Product created successfully.",
      product: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "A product with this Product Code already exists.",
      });
    }

    console.error("Product creation error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create product.",
    });
  }
});

// PUT /api/products/:prodcode - Update product
router.put("/:prodcode", async (req, res) => {
  try {
    if (!(await requireProductPermission("products.edit", req, res))) {
      return;
    }

    const validation = validateProductInput({
      ...(req.body || {}),
      prodcode: req.params.prodcode,
    });

    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }

    const { description, unit } = validation.product;
    const prodcode = req.params.prodcode;

    const result = await pool.query(
      `UPDATE product
       SET description = $1,
           unit = $2
       WHERE prodcode = $3
         AND is_deleted = FALSE
       RETURNING prodcode, description, unit`,
      [description, unit, prodcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Active product not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Product updated successfully.",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Product update error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update product.",
    });
  }
});

// DELETE /api/products/:prodcode - Soft-delete product
router.delete("/:prodcode", async (req, res) => {
  try {
    if (!(await requireProductPermission("products.delete", req, res))) {
      return;
    }

    const { prodcode } = req.params;

    const result = await pool.query(
      `UPDATE product
       SET is_deleted = TRUE
       WHERE prodcode = $1
         AND is_deleted = FALSE
       RETURNING prodcode, description, unit`,
      [prodcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Active product not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Product deleted successfully.",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Product deletion error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to delete product.",
    });
  }
});

// PATCH /api/products/:prodcode/restore - Restore deleted product
router.patch("/:prodcode/restore", async (req, res) => {
  try {
    if (!(await requireProductPermission("products.restore", req, res))) {
      return;
    }

    const { prodcode } = req.params;

    const result = await pool.query(
      `UPDATE product
       SET is_deleted = FALSE
       WHERE prodcode = $1
         AND is_deleted = TRUE
       RETURNING prodcode, description, unit`,
      [prodcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Deleted product not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Product restored successfully.",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Product restoration error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to restore product.",
    });
  }
});

module.exports = router;
