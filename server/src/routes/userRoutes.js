
    const express = require("express");
    const pool = require("../config/database");
    const crypto = require("crypto");
    const { sendAccountSetupEmail } = require("../services/emailService");

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

    // POST /api/users - Create a new user account.
    router.post("/", async (req, res) => {
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const requestedRole = req.body.role?.trim();

    // 1. Validate the submitted information.
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

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // 3. Look up the role ID by its name.
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

        // 4. Generate a secure setup token and store only its hash.
        const rawToken = crypto.randomBytes(32).toString("hex");

        const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

        // 5. Create the account.
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

        // 6. Save the setup token with a 30-minute expiration.
        await client.query(
        `INSERT INTO account_setup_token (
            user_id,
            token_hash,
            expires_at
        )
        VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [newUser.userid, tokenHash]
        );

        // 7. Send the setup email before committing.
        await sendAccountSetupEmail(newUser.email, rawToken);

        // 8. Commit the account and token together.
        await client.query("COMMIT");

        return res.status(201).json({
        status: "success",
        message: "User account created and setup email sent.",
        user: {
            ...newUser,
            role_name: requestedRole,
            status: "Active",
            isblocked: false,
        },
        });
    } catch (error) {
        if (client) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Add user rollback error:", rollbackError);
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

  try {
    // 3. Check whether the target account exists and retrieve its role.
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

    // 4. Admins may modify ordinary User accounts only.
    if (
      req.currentUser.role_name === "Admin" &&
      targetUser.role_name !== "User"
    ) {
      return res.status(403).json({
        status: "error",
        message: "You can only edit ordinary User accounts.",
      });
    }

    // 5. Prevent changing your own role through this endpoint.
    if (
      req.currentUser.userid === userId &&
      requestedRole !== targetUser.role_name
    ) {
      return res.status(403).json({
        status: "error",
        message: "You cannot change your own role.",
      });
    }

    const roleResult = await pool.query(
      `SELECT role_id
       FROM role
       WHERE role_name = $1`,
      [requestedRole]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "The selected role does not exist.",
      });
    }

    // 6. Update the account.
    const updateResult = await pool.query(
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

    return res.status(200).json({
      status: "success",
      message: "User account updated successfully.",
      user: {
        ...updateResult.rows[0],
        role_name: requestedRole,
      },
    });
  } catch (error) {
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

    // Superadmins cannot manage other Superadmin accounts here.
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

    module.exports = router;
