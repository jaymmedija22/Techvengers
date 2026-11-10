
const express = require("express");
const pool = require("../config/database");
const crypto = require("crypto");
const { sendAccountSetupEmail } = require("../services/emailService");
const supabaseAdmin = require("../config/supabase");

const router = express.Router();

// Check whether someone is logged in and retrieve their current role.
async function requireUserManagementAccess(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      status: "error",
      message: "You must be logged in.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT u.userid, r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.userid = $1
         AND u.isblocked = FALSE
         AND LOWER(u.status) = 'active'`,
      [req.session.user.userid]
    );

    const currentUser = result.rows[0];

    if (!currentUser) {
      return res.status(401).json({
        status: "error",
        message: "Your account is inactive or unavailable.",
      });
    }

    if (!["Admin", "Superadmin"].includes(currentUser.role_name)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to manage users.",
      });
    }

    // Use the current database role, not an old session role.
    req.currentUser = currentUser;

    next();
  } catch (error) {
    console.error("User management authorization error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to verify your permissions.",
    });
  }
}

// Only Superadmins can approve pending accounts.
function requireSuperadmin(req, res, next) {
  if (req.currentUser?.role_name !== "Superadmin") {
    return res.status(403).json({
      status: "error",
      message: "Only Superadmins can approve user accounts.",
    });
  }

  next();
}

// All user-management endpoints require this authorization check.
router.use(requireUserManagementAccess);

// GET /api/users - Retrieve users according to the current role.
router.get("/", async (req, res) => {
  try {
    let query = `
      SELECT
        u.userid,
        u.firstname,
        u.lastname,
        u.email,
        r.role_name,
        u.status,
        u.isblocked,
        u.stamp
      FROM app_user u
      JOIN role r ON r.role_id = u.role_id
    `;

    const values = [];

    // Admins can only see ordinary User accounts.
    if (req.currentUser.role_name === "Admin") {
      query += ` WHERE r.role_name = $1`;
      values.push("User");
    }

    query += ` ORDER BY u.stamp DESC`;

    const result = await pool.query(query, values);

    return res.status(200).json({
      status: "success",
      users: result.rows,
    });
  } catch (error) {
    console.error("Fetch users error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve users.",
    });
  }
});

// PATCH /api/users/:id/approve
// Approve a pending ERP account, create its Supabase identity,
// and send the password setup email.
router.patch("/:id/approve", requireSuperadmin, async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "A valid user ID is required.",
    });
  }

  let client;
  let supabaseUserId = null;
  let transactionCommitted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Lock the target account while approving it.
    const targetResult = await client.query(
      `SELECT
         userid,
         firstname,
         lastname,
         email,
         status,
         isblocked,
         passwordhash,
         supabase_uid
       FROM app_user
       WHERE userid = $1
       FOR UPDATE`,
      [userId]
    );

    const targetUser = targetResult.rows[0];

    if (!targetUser) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        status: "error",
        message: "User account not found.",
      });
    }

    if (targetUser.isblocked) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        status: "error",
        message: "Blocked accounts cannot be approved.",
      });
    }

    if (targetUser.status?.toLowerCase() !== "pending") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: "This account is not awaiting approval.",
      });
    }

    if (targetUser.passwordhash) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: "This account already has a password.",
      });
    }

    if (targetUser.supabase_uid) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: "This account is already linked to Supabase Auth.",
      });
    }

    // Create the user's Supabase Auth identity.
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: targetUser.email,
        email_confirm: true,
        user_metadata: {
          erp_user_id: targetUser.userid,
          first_name: targetUser.firstname,
          last_name: targetUser.lastname,
        },
      });

    if (authError || !authData?.user) {
      console.error("Supabase account creation error:", authError);

      await client.query("ROLLBACK");

      return res.status(500).json({
        status: "error",
        message:
          "Unable to create the user's Supabase Auth account. Please try again.",
      });
    }

    supabaseUserId = authData.user.id;

    // Generate a secure password setup token.
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Store only the hashed token.
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Invalidate previous unused setup tokens.
    await client.query(
      `UPDATE account_setup_token
       SET is_used = TRUE
       WHERE user_id = $1
         AND is_used = FALSE`,
      [userId]
    );

    // Save the Supabase UUID and activate the ERP account.
    await client.query(
      `UPDATE app_user
       SET status = 'Active',
           supabase_uid = $1
       WHERE userid = $2`,
      [supabaseUserId, userId]
    );

    // Save the new setup token with a 30-minute expiration.
    await client.query(
      `INSERT INTO account_setup_token (
         user_id,
         token_hash,
         expires_at
       )
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [userId, tokenHash]
    );

    // Send the password setup email.
    await sendAccountSetupEmail(targetUser.email, rawToken);

    await client.query("COMMIT");
    transactionCommitted = true;

    return res.status(200).json({
      status: "success",
      message:
        "User approved. Supabase account created and password setup email sent.",
    });
  } catch (error) {
    if (client && !transactionCommitted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Approval rollback error:", rollbackError);
      }
    }

    // Remove the newly created Supabase identity if the
    // ERP transaction did not successfully commit.
    if (supabaseUserId && !transactionCommitted) {
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

      if (deleteError) {
        console.error(
          "Supabase account cleanup error:",
          deleteError
        );
      }
    }

    console.error("Approve user error:", error);

    return res.status(500).json({
      status: "error",
      message:
        "Unable to approve the account or send its password setup email. Please try again.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /api/users
// Create an ERP account, create its Supabase Auth identity,
// link both accounts, and send the password setup email.
router.post("/", async (req, res) => {
  const firstName = req.body.firstName?.trim();
  const lastName = req.body.lastName?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const requestedRole = req.body.role?.trim();

  // 1. Validate submitted information.
  if (
    !firstName ||
    !lastName ||
    !email ||
    !requestedRole ||
    firstName.length > 50 ||
    lastName.length > 50 ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      status: "error",
      message: "Please provide valid first name, last name, email, and role.",
    });
  }

  // 2. Enforce role-assignment restrictions.
  const allowedRoles =
    req.currentUser.role_name === "Superadmin"
      ? ["User", "Admin"]
      : ["User"];

  if (!allowedRoles.includes(requestedRole)) {
    return res.status(403).json({
      status: "error",
      message: "You are not allowed to assign this role.",
    });
  }

  let client;
  let supabaseUserId = null;
  let transactionCommitted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // 3. Look up the requested role.
    const roleResult = await client.query(
      `SELECT role_id
       FROM role
       WHERE role_name = $1`,
      [requestedRole]
    );

    if (roleResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        status: "error",
        message: "The selected role does not exist.",
      });
    }

    const roleId = roleResult.rows[0].role_id;

    // 4. Create the ERP account first.
    const userResult = await client.query(
      `INSERT INTO app_user (
         firstname,
         lastname,
         email,
         passwordhash,
         role_id,
         isblocked,
         status
       )
       VALUES ($1, $2, $3, NULL, $4, FALSE, 'Active')
       RETURNING userid, firstname, lastname, email`,
      [firstName, lastName, email, roleId]
    );

    const newUser = userResult.rows[0];

    // 5. Create the corresponding Supabase Auth identity.
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: newUser.email,
        email_confirm: true,
        user_metadata: {
          erp_user_id: newUser.userid,
          first_name: newUser.firstname,
          last_name: newUser.lastname,
        },
      });

    if (authError || !authData?.user) {
      console.error("Supabase account creation error:", authError);

      await client.query("ROLLBACK");

      return res.status(500).json({
        status: "error",
        message:
          "Unable to create the user's Supabase Auth account.",
      });
    }

    supabaseUserId = authData.user.id;

    // 6. Link the Supabase UUID to the ERP account.
    await client.query(
      `UPDATE app_user
       SET supabase_uid = $1
       WHERE userid = $2`,
      [supabaseUserId, newUser.userid]
    );

    // 7. Generate a secure password setup token.
    const rawToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // 8. Store the hashed token with a 30-minute expiration.
    await client.query(
      `INSERT INTO account_setup_token (
         user_id,
         token_hash,
         expires_at
       )
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [newUser.userid, tokenHash]
    );

    // 9. Send the password setup email.
    await sendAccountSetupEmail(newUser.email, rawToken);

    // 10. Commit the ERP account and setup token.
    await client.query("COMMIT");
    transactionCommitted = true;

    return res.status(201).json({
      status: "success",
      message:
        "User account created, linked to Supabase Auth, and setup email sent.",
      user: {
        ...newUser,
        role_name: requestedRole,
        status: "Active",
        isblocked: false,
        supabase_uid: supabaseUserId,
      },
    });
  } catch (error) {
    if (client && !transactionCommitted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Create user rollback error:", rollbackError);
      }
    }

    // Clean up the Supabase identity if the ERP transaction failed.
    if (supabaseUserId && !transactionCommitted) {
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

      if (deleteError) {
        console.error(
          "Supabase account cleanup error:",
          deleteError
        );
      }
    }

    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists.",
      });
    }

    console.error("Add user error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create the user account. Please try again.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// PUT /api/users/:id - Update an existing user account.
router.put("/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const firstName = req.body.firstName?.trim();
  const lastName = req.body.lastName?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const requestedRole = req.body.role?.trim();

  // 1. Validate the user ID and submitted information.
  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !firstName ||
    !lastName ||
    !email ||
    !requestedRole ||
    firstName.length > 50 ||
    lastName.length > 50 ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      status: "error",
      message: "Please provide valid user information.",
    });
  }

  // 2. Admins may assign only User. Superadmins may assign User or Admin.
  const allowedRoles =
    req.currentUser.role_name === "Superadmin"
      ? ["User", "Admin"]
      : ["User"];

  if (!allowedRoles.includes(requestedRole)) {
    return res.status(403).json({
      status: "error",
      message: "You are not allowed to assign this role.",
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // 3. Lock the Superadmin role row.
    // This serializes role changes that could reduce the number
    // of remaining Superadmin accounts.
    await client.query(
      `SELECT role_id
       FROM role
       WHERE role_name = 'Superadmin'
       FOR UPDATE`
    );

    // 4. Retrieve and lock the target account.
    const targetResult = await client.query(
      `SELECT u.userid, r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.userid = $1
       FOR UPDATE OF u`,
      [userId]
    );

    const targetUser = targetResult.rows[0];

    if (!targetUser) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        status: "error",
        message: "User account not found.",
      });
    }

    // 5. Admins may modify ordinary User accounts only.
    if (
      req.currentUser.role_name === "Admin" &&
      targetUser.role_name !== "User"
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        status: "error",
        message: "You can only edit ordinary User accounts.",
      });
    }

    // 6. Prevent changing your own role through this endpoint.
    if (
      req.currentUser.userid === userId &&
      requestedRole !== targetUser.role_name
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        status: "error",
        message: "You cannot change your own role.",
      });
    }

    // 7. Prevent demoting the last remaining Superadmin.
    if (
      targetUser.role_name === "Superadmin" &&
      requestedRole !== "Superadmin"
    ) {
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM app_user
         WHERE role_id = (
           SELECT role_id
           FROM role
           WHERE role_name = 'Superadmin'
         )`
      );

      const superadminCount = countResult.rows[0].total;

      if (superadminCount <= 1) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message: "The last remaining Superadmin cannot be demoted.",
        });
      }
    }

    // 8. Look up the requested role ID.
    const roleResult = await client.query(
      `SELECT role_id
       FROM role
       WHERE role_name = $1`,
      [requestedRole]
    );

    if (roleResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        status: "error",
        message: "The selected role does not exist.",
      });
    }

    // 9. Update the account.
    const updateResult = await client.query(
      `UPDATE app_user
       SET firstname = $1,
           lastname = $2,
           email = $3,
           role_id = $4
       WHERE userid = $5
       RETURNING userid, firstname, lastname, email`,
      [
        firstName,
        lastName,
        email,
        roleResult.rows[0].role_id,
        userId,
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      status: "success",
      message: "User account updated successfully.",
      user: {
        ...updateResult.rows[0],
        role_name: requestedRole,
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Update user rollback error:", rollbackError);
      }
    }

    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists.",
      });
    }

    console.error("Update user error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update the user account.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// PATCH /api/users/:id/block - Block or unblock a user account.
router.patch("/:id/block", async (req, res) => {
  const userId = Number(req.params.id);
  const isBlocked = req.body.isBlocked;

  // Validate the target ID and requested action.
  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    typeof isBlocked !== "boolean"
  ) {
    return res.status(400).json({
      status: "error",
      message: "A valid user ID and block status are required.",
    });
  }

  try {
    // Find the target account and its role.
    const targetResult = await pool.query(
      `SELECT u.userid, r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.userid = $1`,
      [userId]
    );

    const targetUser = targetResult.rows[0];

    if (!targetUser) {
      return res.status(404).json({
        status: "error",
        message: "User account not found.",
      });
    }

    // Prevent blocking or unblocking your own account.
    if (req.currentUser.userid === userId) {
      return res.status(403).json({
        status: "error",
        message: "You cannot block or unblock your own account.",
      });
    }

    // Admins can manage User accounts only.
    if (
      req.currentUser.role_name === "Admin" &&
      targetUser.role_name !== "User"
    ) {
      return res.status(403).json({
        status: "error",
        message: "You can only manage ordinary User accounts.",
      });
    }

    // Superadmin accounts cannot be blocked or unblocked here.
    if (targetUser.role_name === "Superadmin") {
      return res.status(403).json({
        status: "error",
        message: "Superadmin accounts cannot be modified here.",
      });
    }

    // Update the account's block status.
    await pool.query(
      `UPDATE app_user
       SET isblocked = $1
       WHERE userid = $2`,
      [isBlocked, userId]
    );

    return res.status(200).json({
      status: "success",
      message: isBlocked
        ? "User account blocked successfully."
        : "User account unblocked successfully.",
    });
  } catch (error) {
    console.error("Block/unblock user error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update the user's block status.",
    });
  }
});

// GET /api/users/:id/rights - Retrieve all modules and a user's assigned rights.
router.get("/:id/rights", async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "A valid user ID is required.",
    });
  }

  try {
    // Find the target user and check their role.
    const targetResult = await pool.query(
      `SELECT u.userid, r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.userid = $1`,
      [userId]
    );

    const targetUser = targetResult.rows[0];

    if (!targetUser) {
      return res.status(404).json({
        status: "error",
        message: "User account not found.",
      });
    }

    // Admins can manage User accounts only.
    // Superadmins can manage User and Admin accounts.
    const allowedRoles =
      req.currentUser.role_name === "Superadmin"
        ? ["User", "Admin"]
        : ["User"];

    if (!allowedRoles.includes(targetUser.role_name)) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to manage this user's rights.",
      });
    }

    // Retrieve every available right and indicate whether
    // the target user currently has that right assigned.
    const rightsResult = await pool.query(
      `SELECT
         m.module_id,
         m.module_code,
         m.module_name,
         r.right_code,
         r.description,
         (up.user_permission_id IS NOT NULL) AS assigned
       FROM module m
       JOIN rights r
         ON r.module_id = m.module_id
       LEFT JOIN user_permission up
         ON up.right_code = r.right_code
         AND up.user_id = $1
         AND up.is_deleted = FALSE
       ORDER BY m.module_id, r.right_code`,
      [userId]
    );

    // Group the rights under their respective modules.
    const modulesMap = new Map();

    for (const row of rightsResult.rows) {
      if (!modulesMap.has(row.module_id)) {
        modulesMap.set(row.module_id, {
          module_id: row.module_id,
          module_code: row.module_code,
          module_name: row.module_name,
          rights: [],
        });
      }

      modulesMap.get(row.module_id).rights.push({
        right_code: row.right_code,
        description: row.description,
        assigned: row.assigned,
      });
    }

    return res.status(200).json({
      status: "success",
      userId,
      modules: Array.from(modulesMap.values()),
    });
  } catch (error) {
    console.error("Fetch user rights error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve user rights.",
    });
  }
});

// PUT /api/users/:id/rights - Save a user's assigned rights.
router.put("/:id/rights", async (req, res) => {
  const userId = Number(req.params.id);
  const rightCodes = req.body.rightCodes;

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Array.isArray(rightCodes) ||
    rightCodes.some(
      (code) => typeof code !== "string" || !code.trim()
    )
  ) {
    return res.status(400).json({
      status: "error",
      message: "A valid user ID and array of right codes are required.",
    });
  }

  // Remove whitespace and duplicate codes.
  const requestedRights = [
    ...new Set(rightCodes.map((code) => code.trim())),
  ];

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Pass the logged-in ERP user ID to the database audit trigger.
    // TRUE makes this setting local to the current transaction.
    await client.query(
      "SELECT set_config('app.current_user_id', $1, TRUE)",
      [String(req.currentUser.userid)]
    );

    // Lock the target account while changing its rights.
    const targetResult = await client.query(
      `SELECT u.userid, r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.userid = $1
       FOR UPDATE OF u`,
      [userId]
    );

    const targetUser = targetResult.rows[0];

    if (!targetUser) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        status: "error",
        message: "User account not found.",
      });
    }

    // Admins can manage User accounts only.
    // Superadmins can manage User and Admin accounts.
    const allowedRoles =
      req.currentUser.role_name === "Superadmin"
        ? ["User", "Admin"]
        : ["User"];

    if (!allowedRoles.includes(targetUser.role_name)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        status: "error",
        message: "You are not allowed to manage this user's rights.",
      });
    }

    // Validate every submitted right against the rights table.
    const validRightsResult = await client.query(
      `SELECT right_code
       FROM rights
       WHERE right_code = ANY($1::varchar[])`,
      [requestedRights]
    );

    const validRights = validRightsResult.rows.map(
      (row) => row.right_code
    );

    if (validRights.length !== requestedRights.length) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        status: "error",
        message: "One or more submitted rights are invalid.",
      });
    }

    // Retrieve the user's currently active rights.
    const currentRightsResult = await client.query(
      `SELECT right_code
       FROM user_permission
       WHERE user_id = $1
         AND is_deleted = FALSE
       FOR UPDATE`,
      [userId]
    );

    const currentRights = currentRightsResult.rows.map(
      (row) => row.right_code
    );

    const currentSet = new Set(currentRights);
    const requestedSet = new Set(requestedRights);

    // Identify actual additions and removals.
    const rightsToGrant = requestedRights.filter(
      (code) => !currentSet.has(code)
    );

    const rightsToRevoke = currentRights.filter(
      (code) => !requestedSet.has(code)
    );

    // Revoke removed rights while preserving their history.
    // The database trigger automatically records each revocation.
    if (rightsToRevoke.length > 0) {
      await client.query(
        `UPDATE user_permission
         SET is_deleted = TRUE,
             deleted_at = NOW()
         WHERE user_id = $1
           AND right_code = ANY($2::varchar[])
           AND is_deleted = FALSE`,
        [userId, rightsToRevoke]
      );
    }

    // Grant newly selected rights.
    // The database trigger automatically records each grant.
    if (rightsToGrant.length > 0) {
      await client.query(
        `INSERT INTO user_permission (
           user_id,
           right_code,
           is_deleted,
           created_at,
           deleted_at
         )
         SELECT $1, unnest($2::varchar[]), FALSE, NOW(), NULL`,
        [userId, rightsToGrant]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      status: "success",
      message: "User rights updated successfully.",
      granted: rightsToGrant,
      revoked: rightsToRevoke,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rights update rollback error:", rollbackError);
      }
    }

    console.error("Update user rights error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update user rights.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
