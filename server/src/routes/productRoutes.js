
const express = require("express");
const pool = require("../config/database");

const router = express.Router();

const VALID_UNITS = ["pc", "ea", "mtr", "pkg", "ltr"];

const PRICE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PRICE_AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;

// Validate price history input.
function validatePriceInput(body) {
  const effdate =
    typeof body.effdate === "string" ? body.effdate.trim() : "";

  const unitprice = body.unitprice;

  if (!PRICE_DATE_REGEX.test(effdate)) {
    return { error: "A valid effective date is required (YYYY-MM-DD)." };
  }

  const parsedDate = new Date(`${effdate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== effdate
  ) {
    return { error: "Invalid effective date." };
  }

  if (
    unitprice === undefined ||
    unitprice === null ||
    !PRICE_AMOUNT_REGEX.test(String(unitprice).trim())
  ) {
    return { error: "Unit price must be a valid amount with up to 2 decimal places." };
  }

  if (Number(unitprice) <= 0) {
    return { error: "Unit price must be greater than zero." };
  }

  return {
    price: {
      effdate,
      unitprice: String(unitprice).trim(),
    },
  };
}

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

// GET /api/products/:prodcode/prices?status=active|inactive|all
router.get("/:prodcode/prices", async (req, res) => {
  try {
    const { prodcode } = req.params;
    const status = (req.query.status || "active").toLowerCase();

    if (!["active", "inactive", "all"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid price history status. Use active, inactive, or all.",
      });
    }

    // Make sure the product exists.
    const productResult = await pool.query(
      `SELECT prodcode, description, unit
       FROM product
       WHERE prodcode = $1`,
      [prodcode]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Product not found.",
      });
    }

    const conditions = ["ph.prodcode = $1"];

    if (status === "active") {
      conditions.push("ph.is_deleted = FALSE");
    } else if (status === "inactive") {
      conditions.push("ph.is_deleted = TRUE");
    }

    const result = await pool.query(
      `SELECT
          ph.effdate::text AS effdate,
          ph.prodcode,
          ph.unitprice,
          ph.is_deleted,
          ph.created_at,
          ph.created_by,
          ph.updated_at,
          ph.updated_by,
          COALESCE(
            NULLIF(TRIM(CONCAT(c.firstname, ' ', c.lastname)), ''),
            'System'
          ) AS created_by_name,
          COALESCE(
            NULLIF(TRIM(CONCAT(u.firstname, ' ', u.lastname)), ''),
            'System'
          ) AS updated_by_name
       FROM pricehist ph
       LEFT JOIN app_user c ON c.userid = ph.created_by
       LEFT JOIN app_user u ON u.userid = ph.updated_by
       WHERE ${conditions.join(" AND ")}
       ORDER BY ph.effdate DESC`,
      [prodcode]
    );

    return res.json({
      status: "success",
      product: productResult.rows[0],
      prices: result.rows,
    });
  } catch (error) {
    console.error("Price history retrieval error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve price history.",
    });
  }
});

// POST /api/products/:prodcode/prices - Add price history
router.post("/:prodcode/prices", async (req, res) => {
  const client = await pool.connect();

  try {
    if (!(await requireProductPermission("prices.add", req, res))) {
      return;
    }

    const { prodcode } = req.params;
    const validation = validatePriceInput(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }

    const { effdate, unitprice } = validation.price;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Confirm that the product exists and is active.
    const productResult = await client.query(
      `SELECT prodcode
       FROM product
       WHERE prodcode = $1
         AND is_deleted = FALSE
       FOR UPDATE`,
      [prodcode]
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        status: "error",
        message: "Active product not found.",
      });
    }

    // Prevent duplicate effective dates for the same product.
    const existingResult = await client.query(
      `SELECT effdate, is_deleted
       FROM pricehist
       WHERE prodcode = $1
         AND effdate = $2`,
      [prodcode, effdate]
    );

    if (existingResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: existingResult.rows[0].is_deleted
          ? "A deleted price record already exists for this effective date. Edit or restore that record instead."
          : "A price record already exists for this effective date.",
      });
    }

    const result = await client.query(
      `INSERT INTO pricehist (
          effdate,
          prodcode,
          unitprice,
          created_by
       )
       VALUES ($1, $2, $3, $4)
       RETURNING effdate, prodcode, unitprice, is_deleted, created_at, created_by`,
      [effdate, prodcode, unitprice, userId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      status: "success",
      message: "Price added successfully.",
      price: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "A price record already exists for this effective date.",
      });
    }

    console.error("Price creation error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to add price.",
    });
  } finally {
    client.release();
  }
});

// PUT /api/products/:prodcode/prices/:effdate - Edit price history
router.put("/:prodcode/prices/:effdate", async (req, res) => {
  const client = await pool.connect();

  try {
    if (!(await requireProductPermission("prices.edit", req, res))) {
      return;
    }

    const { prodcode, effdate: oldEffdate } = req.params;
    const validation = validatePriceInput(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }

    // Validate the original effective date from the URL.
    if (!PRICE_DATE_REGEX.test(oldEffdate)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid original effective date.",
      });
    }

    const parsedOldDate = new Date(`${oldEffdate}T00:00:00Z`);

    if (
      Number.isNaN(parsedOldDate.getTime()) ||
      parsedOldDate.toISOString().slice(0, 10) !== oldEffdate
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid original effective date.",
      });
    }

    const { effdate: newEffdate, unitprice } = validation.price;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Lock the original price record.
    const existingResult = await client.query(
      `SELECT effdate, prodcode
       FROM pricehist
       WHERE prodcode = $1
         AND effdate = $2
         AND is_deleted = FALSE
       FOR UPDATE`,
      [prodcode, oldEffdate]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        status: "error",
        message: "Active price record not found.",
      });
    }

    // Check whether the new effective date belongs to another record.
    const duplicateResult = await client.query(
      `SELECT 1
       FROM pricehist
       WHERE prodcode = $1
         AND effdate = $2
         AND effdate <> $3`,
      [prodcode, newEffdate, oldEffdate]
    );

    if (duplicateResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: "Another price record already exists for the new effective date.",
      });
    }

    const result = await client.query(
      `UPDATE pricehist
       SET effdate = $1,
           unitprice = $2,
           updated_at = NOW(),
           updated_by = $3
       WHERE prodcode = $4
         AND effdate = $5
         AND is_deleted = FALSE
       RETURNING effdate, prodcode, unitprice, is_deleted,
                 created_at, created_by, updated_at, updated_by`,
      [newEffdate, unitprice, userId, prodcode, oldEffdate]
    );

    await client.query("COMMIT");

    return res.json({
      status: "success",
      message: "Price updated successfully.",
      price: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "Another price record already exists for the new effective date.",
      });
    }

    console.error("Price update error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update price.",
    });
  } finally {
    client.release();
  }
});

// DELETE /api/products/:prodcode/prices/:effdate - Soft-delete price history
router.delete("/:prodcode/prices/:effdate", async (req, res) => {
  try {
    if (!(await requireProductPermission("prices.delete", req, res))) {
      return;
    }

    const { prodcode, effdate } = req.params;

    // Validate the effective date.
    if (!PRICE_DATE_REGEX.test(effdate)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid effective date.",
      });
    }

    const parsedDate = new Date(`${effdate}T00:00:00Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== effdate
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid effective date.",
      });
    }

    const result = await pool.query(
      `UPDATE pricehist
       SET is_deleted = TRUE,
           updated_at = NOW(),
           updated_by = $1
       WHERE prodcode = $2
         AND effdate = $3
         AND is_deleted = FALSE
       RETURNING effdate, prodcode, unitprice, is_deleted,
                 created_at, created_by, updated_at, updated_by`,
      [req.session.user.userid, prodcode, effdate]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Active price record not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Price deleted successfully.",
      price: result.rows[0],
    });
  } catch (error) {
    console.error("Price deletion error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to delete price.",
    });
  }
});

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
