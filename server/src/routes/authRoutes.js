
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const createSupabaseAuthClient = require("../config/supabaseAuth");
const rateLimit = require("express-rate-limit");
const pool = require("../config/database");
const supabaseAdmin = require("../config/supabase");
const { sendPasswordResetEmail } = require("../services/emailService");

const router = express.Router();

// Limit repeated login attempts to help prevent brute-force attacks.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

// Limit repeated first-time password setup attempts.
const passwordSetupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many password setup attempts. Please try again after 15 minutes.",
  },
});

// Limit repeated forgot-password requests.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many password reset requests. Please try again after 15 minutes.",
  },
});

// Limit repeated password reset attempts.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many password reset attempts. Please try again after 15 minutes.",
  },
});

// POST /login - Authenticate through Supabase Auth.
router.post("/login", loginLimiter, async (req, res) => {
  const body = req.body ?? {};

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password = body.password;

  if (!email || typeof password !== "string" || password.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "Email and password are required.",
    });
  }

  try {
    // Find the corresponding ERP account.
    const result = await pool.query(
      `SELECT
         u.userid,
         u.firstname,
         u.lastname,
         u.email,
         u.supabase_uid,
         u.isblocked,
         u.status,
         u.role_id,
         r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE LOWER(u.email) = $1
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }

    // Enforce ERP account restrictions before authentication.
    if (user.isblocked) {
      return res.status(403).json({
        status: "error",
        message: "Your account is blocked. Please contact an administrator.",
      });
    }

    if (user.status?.toLowerCase() !== "active") {
      return res.status(403).json({
        status: "error",
        message: "Your account is pending approval or inactive.",
      });
    }

    // Only accounts linked to Supabase can use this login flow.
    if (!user.supabase_uid) {
      return res.status(403).json({
        status: "error",
        code: "AUTH_SETUP_REQUIRED",
        message:
          "Your account has not yet been configured for secure login. Please contact an administrator.",
      });
    }

    // Authenticate the password through Supabase Auth.
    const supabaseAuth = createSupabaseAuthClient();

    const { data: authData, error: authError } =
      await supabaseAuth.auth.signInWithPassword({
        email: user.email,
        password,
      });

    if (authError) {
      if (
        authError.code === "invalid_credentials" ||
        authError.status === 400
      ) {
        return res.status(401).json({
          status: "error",
          message: "Invalid email or password.",
        });
      }

      throw authError;
    }

    // Ensure the authenticated Supabase identity belongs to this ERP user.
    if (
      !authData.user ||
      authData.user.id !== user.supabase_uid
    ) {
      console.error(
        `Supabase identity mismatch for ERP user ${user.userid}.`
      );

      return res.status(401).json({
        status: "error",
        message: "Unable to authenticate this account.",
      });
    }

    // Regenerate the existing Express session.
    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Retrieve the user's currently assigned permissions.
    const permissionsResult = await pool.query(
      `SELECT right_code
       FROM user_permission
       WHERE user_id = $1
         AND is_deleted = FALSE`,
      [user.userid]
    );

    const permissions = permissionsResult.rows.map(
      (row) => row.right_code
    );

    // Preserve the existing ERP session structure.
    req.session.user = {
      userid: user.userid,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      permissions,
    };

    await new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    return res.status(200).json({
      status: "success",
      message: "Login successful.",
      user: req.session.user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      status: "error",
      message: "Something went wrong during login.",
    });
  }
});

// POST /register
router.post("/register", async (req, res) => {
  const body = req.body ?? {};

  const firstName =
    typeof body.firstName === "string"
      ? body.firstName.trim()
      : "";

  const lastName =
    typeof body.lastName === "string"
      ? body.lastName.trim()
      : "";

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      status: "error",
      message: "First name, last name, and email are required.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: "error",
      message: "Please provide a valid email address.",
    });
  }

  try {
    const existingUser = await pool.query(
      "SELECT userid FROM app_user WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "This email is already registered.",
      });
    }

    const result = await pool.query(
      `WITH new_user AS (
        INSERT INTO app_user (firstname, lastname, email, role_id)
        VALUES (
          $1,
          $2,
          $3,
          (SELECT role_id FROM role WHERE role_name = 'User')
        )
        RETURNING userid, firstname, lastname, email, role_id, status, stamp
      )
      SELECT
        u.userid,
        u.firstname,
        u.lastname,
        u.email,
        r.role_name AS role,
        u.status,
        u.stamp
      FROM new_user u
      JOIN role r ON r.role_id = u.role_id`,
      [firstName, lastName, email]
    );

    return res.status(201).json({
      status: "success",
      message:
        "Registration submitted successfully. Your account is pending approval.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "This email is already registered.",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Something went wrong during registration.",
    });
  }
});

// GET /me - Verify the current login session.
router.get("/me", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      status: "error",
      message: "You are not logged in.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         u.userid,
         u.firstname,
         u.lastname,
         u.email,
         u.isblocked,
         u.status,
         u.role_id,
         r.role_name,
         COALESCE(
           ARRAY(
             SELECT up.right_code
             FROM user_permission up
             WHERE up.user_id = u.userid
               AND up.is_deleted = FALSE
           ),
           ARRAY[]::varchar[]
         ) AS permissions
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.userid = $1`,
      [req.session.user.userid]
    );

    const user = result.rows[0];

    if (
      !user ||
      user.isblocked ||
      user.status?.toLowerCase() !== "active"
    ) {
      return req.session.destroy((error) => {
        if (error) {
          console.error("Session destruction error:", error);
        }

        res.clearCookie("hope.sid", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });

        return res.status(401).json({
          status: "error",
          message: "Your session is no longer valid. Please log in again.",
        });
      });
    }

    // Refresh the session's permission data.
    req.session.user.permissions = user.permissions;

    return res.status(200).json({
      status: "success",
      user: {
        userid: user.userid,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to verify your session.",
    });
  }
});

// POST /logout - Destroy the current login session.
router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.status(200).json({
      status: "success",
      message: "You are already logged out.",
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to log out. Please try again.",
      });
    }

    res.clearCookie("hope.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      status: "success",
      message: "You have successfully logged out.",
    });
  });
});

// POST /set-password - Complete first-time password setup.
router.post("/set-password", passwordSetupLimiter, async (req, res) => {
  const { token, password } = req.body ?? {};

  if (
    typeof token !== "string" ||
    !token.trim() ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "A valid setup token and password of at least 8 characters are required.",
    });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token.trim())
    .digest("hex");

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT
         t.account_setup_token_id,
         t.user_id,
         u.supabase_uid,
         u.isblocked,
         u.status,
         u.passwordhash
       FROM account_setup_token t
       JOIN app_user u ON u.userid = t.user_id
       WHERE t.token_hash = $1
         AND t.is_used = FALSE
         AND t.expires_at > NOW()
       FOR UPDATE OF t, u`,
      [tokenHash]
    );

    const record = result.rows[0];

    if (!record) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        status: "error",
        message: "The setup token is invalid, expired, or already used.",
      });
    }

    if (record.isblocked || record.status?.toLowerCase() !== "active") {
      await client.query("ROLLBACK");

      return res.status(403).json({
        status: "error",
        message: "This account cannot complete password setup.",
      });
    }

    if (record.passwordhash) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: "This account already has a password.",
      });
    }

    if (!record.supabase_uid) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        code: "SUPABASE_ACCOUNT_NOT_FOUND",
        message:
          "This account has not yet been configured for secure login. Please contact an administrator.",
      });
    }

    // Update the password in Supabase Auth.
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(
        record.supabase_uid,
        {
          password,
          email_confirm: true,
        }
      );

    if (authError || !authData?.user) {
      console.error("Supabase password update error:", authError);

      await client.query("ROLLBACK");

      return res.status(500).json({
        status: "error",
        message:
          "Unable to set your password. Please try again.",
      });
    }

    // Preserve the existing ERP bcrypt password hash.
    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `UPDATE app_user
       SET passwordhash = $1
       WHERE userid = $2`,
      [passwordHash, record.user_id]
    );

    // Mark the setup token as used.
    await client.query(
      `UPDATE account_setup_token
       SET is_used = TRUE
       WHERE account_setup_token_id = $1`,
      [record.account_setup_token_id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      status: "success",
      message: "Password setup completed. You can now log in.",
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Transaction rollback error:", rollbackError);
      }
    }

    console.error("Password setup error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to complete password setup. Please try again.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /forgot-password - Request a password reset email.
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  const genericResponse = {
    status: "success",
    message:
      "If an eligible account exists for that email, a password reset link will be sent.",
  };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(200).json(genericResponse);
  }

  try {
    const result = await pool.query(
      `SELECT userid, email
       FROM app_user
       WHERE LOWER(email) = $1
         AND LOWER(status) = 'active'
         AND isblocked = FALSE
         AND passwordhash IS NOT NULL
         AND supabase_uid IS NOT NULL
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const tokenResult = await pool.query(
      `INSERT INTO password_reset_token
         (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')
       RETURNING password_reset_token_id`,
      [user.userid, tokenHash]
    );

    const newTokenId =
      tokenResult.rows[0].password_reset_token_id;

    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (emailError) {
      await pool.query(
        `UPDATE password_reset_token
         SET is_used = TRUE
         WHERE password_reset_token_id = $1`,
        [newTokenId]
      );

      throw emailError;
    }

    // Invalidate previous reset links after the new email is sent.
    await pool.query(
      `UPDATE password_reset_token
       SET is_used = TRUE
       WHERE user_id = $1
         AND password_reset_token_id <> $2
         AND is_used = FALSE`,
      [user.userid, newTokenId]
    );

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to process your request. Please try again later.",
    });
  }
});

// POST /reset-password - Reset password using a valid reset token.
router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const { token, password } = req.body || {};

  if (
    typeof token !== "string" ||
    !token.trim() ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "A valid password reset token and a password of at least 8 characters are required.",
    });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token.trim())
    .digest("hex");

  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT
         prt.password_reset_token_id,
         prt.user_id,
         u.isblocked,
         u.status,
         u.passwordhash,
         u.supabase_uid
       FROM password_reset_token prt
       JOIN app_user u ON u.userid = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.is_used = FALSE
         AND prt.expires_at > NOW()
       FOR UPDATE OF prt, u`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        status: "error",
        message:
          "This password reset link is invalid, expired, or already used.",
      });
    }

    const user = result.rows[0];

    if (
      user.isblocked ||
      user.status?.toLowerCase() !== "active" ||
      !user.passwordhash ||
      !user.supabase_uid
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        status: "error",
        message:
          "This password reset link is invalid or unavailable.",
      });
    }

    // Prepare the ERP password hash.
    const passwordHash = await bcrypt.hash(password, 12);

    // Update the password in Supabase Auth first.
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(
        user.supabase_uid,
        {
          password,
        }
      );

    if (authError || !authData?.user) {
      console.error("Supabase password reset error:", authError);

      await client.query("ROLLBACK");

      return res.status(500).json({
        status: "error",
        message:
          "Unable to update your password. Please try again later.",
      });
    }

    // Synchronize the ERP password hash.
    await client.query(
      `UPDATE app_user
       SET passwordhash = $1
       WHERE userid = $2`,
      [passwordHash, user.user_id]
    );

    // Invalidate all reset tokens belonging to this user.
    await client.query(
      `UPDATE password_reset_token
       SET is_used = TRUE
       WHERE user_id = $1
         AND is_used = FALSE`,
      [user.user_id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      status: "success",
      message:
        "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Reset password error:", error);

    return res.status(500).json({
      status: "error",
      message:
        "Unable to reset your password. Please try again later.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
