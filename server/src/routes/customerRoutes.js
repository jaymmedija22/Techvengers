
const express = require("express");
const pool = require("../config/database");

const router = express.Router();


// Require an active account.
// Superadmins automatically have access; other roles need customers.view.
async function requireCustomerViewAccess(req, res, next) {
  if (!req.session?.user?.userid) {
    return res.status(401).json({
      status: "error",
      message: "You must be logged in.",
    });
  }

  try {
    // Verify the account status and retrieve its current database role.
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

    // Superadmins automatically have customer-list access.
    if (currentUser.role_name === "Superadmin") {
      return next();
    }

    // Other roles must have the customers.view permission.
    const permissionResult = await pool.query(
      `SELECT 1
       FROM user_permission
       WHERE user_id = $1
         AND right_code = 'customers.view'
         AND is_deleted = FALSE
       LIMIT 1`,
      [currentUser.userid]
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

// GET /api/customers?status=active|deleted&q=...&payterm=...
router.get("/", async (req, res) => {
  try {
    const search = (req.query.q || "").trim();
    const payterm = (req.query.payterm || "").trim().toUpperCase();
    const status = (req.query.status || "active").trim().toLowerCase();

    if (!["active", "deleted"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid customer status.",
      });
    }

    const values = [];
    const conditions = ["is_deleted = $1"];
    values.push(status === "deleted");

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

    const query = `
      SELECT custno, custname, address, payterm
      FROM customer
      WHERE ${conditions.join(" AND ")}
      ORDER BY custno ASC
    `;

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


const VALID_PAYMENT_TERMS = ["COD", "30D", "45D"];

function validateCustomerInput(body) {
  const custno = (body.custno || "").trim().toUpperCase();
  const custname = (body.custname || "").trim();
  const address = (body.address || "").trim();
  const payterm = (body.payterm || "").trim().toUpperCase();

  if (!custno || !custname) {
    return { error: "Customer No. and Customer Name are required." };
  }

  if (custno.length > 5 || custname.length > 20 || address.length > 50) {
    return { error: "One or more fields exceed the allowed length." };
  }

  if (payterm && !VALID_PAYMENT_TERMS.includes(payterm)) {
    return { error: "Invalid payment term. Use COD, 30D, or 45D." };
  }

  return {
    customer: { custno, custname, address, payterm: payterm || null },
  };
}

// Check add/edit permission. Superadmins are automatically allowed.
async function requireCustomerPermission(rightCode, req, res) {
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

// POST /api/customers - Create customer
router.post("/", async (req, res) => {
  try {
    if (!(await requireCustomerPermission("customers.add", req, res))) {
      return;
    }

    const validation = validateCustomerInput(req.body);

    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }

    const { custno, custname, address, payterm } = validation.customer;

    const result = await pool.query(
      `INSERT INTO customer (custno, custname, address, payterm)
       VALUES ($1, $2, $3, $4)
       RETURNING custno, custname, address, payterm`,
      [custno, custname, address || null, payterm]
    );

    return res.status(201).json({
      status: "success",
      message: "Customer created successfully.",
      customer: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "A customer with this Customer No. already exists.",
      });
    }

    console.error("Customer creation error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create customer.",
    });
  }
});

// PUT /api/customers/:custno - Update customer
router.put("/:custno", async (req, res) => {
  try {
    if (!(await requireCustomerPermission("customers.edit", req, res))) {
      return;
    }

    const validation = validateCustomerInput({
      ...req.body,
      custno: req.params.custno,
    });

    if (validation.error) {
      return res.status(400).json({
        status: "error",
        message: validation.error,
      });
    }

    const { custno, custname, address, payterm } = validation.customer;

    const result = await pool.query(
      `UPDATE customer
       SET custname = $1,
           address = $2,
           payterm = $3
       WHERE custno = $4
         AND is_deleted = FALSE
       RETURNING custno, custname, address, payterm`,
      [custname, address || null, payterm, custno]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Customer updated successfully.",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Customer update error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update customer.",
    });
  }
});

// DELETE /api/customers/:custno - Soft delete customer
router.delete("/:custno", async (req, res) => {
  try {
    if (!(await requireCustomerPermission("customers.delete", req, res))) {
      return;
    }

    const result = await pool.query(
      `UPDATE customer
       SET is_deleted = TRUE
       WHERE custno = $1
         AND is_deleted = FALSE
       RETURNING custno, custname`,
      [req.params.custno]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Active customer not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Customer moved to deleted records.",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Customer soft delete error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to delete customer.",
    });
  }
});

// PATCH /api/customers/:custno/restore - Restore customer
router.patch("/:custno/restore", async (req, res) => {
  try {
    if (!(await requireCustomerPermission("customers.delete", req, res))) {
      return;
    }

    const result = await pool.query(
      `UPDATE customer
       SET is_deleted = FALSE
       WHERE custno = $1
         AND is_deleted = TRUE
       RETURNING custno, custname`,
      [req.params.custno]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Deleted customer not found.",
      });
    }

    return res.json({
      status: "success",
      message: "Customer restored successfully.",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Customer restore error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to restore customer.",
    });
  }
});


const VALID_UNITS = ["pc", "ea", "mtr", "pkg", "ltr"];

// Validate product information before inserting or updating.
function validateProductInput(body, isCreate = true) {
  const prodcode = (body.prodcode || "").trim();
  const description = (body.description || "").trim();
  const unit = (body.unit || "").trim().toLowerCase();

  if (isCreate && !prodcode) {
    return { error: "Product Code is required." };
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

// Check add/edit permission.
// Superadmins are automatically allowed.
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

// POST /api/products - Create product
router.post("/", async (req, res) => {
  try {
    if (!(await requireProductPermission("products.add", req, res))) {
      return;
    }

    const validation = validateProductInput(req.body);

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
      ...req.body,
      prodcode: req.params.prodcode,
    }, false);

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


module.exports = router;
