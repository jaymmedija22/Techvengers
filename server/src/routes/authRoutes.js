
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const pool = require("../config/database");

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many password setup attempts. Please try again after 15 minutes.",
  },
});

// POST /login
router.post("/login", loginLimiter, async (req, res) => {
  const body = req.body ?? {};

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password = body.password;

  // Validate required fields.
  if (!email || typeof password !== "string" || password.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "Email and password are required.",
    });
  }

  try {
    // Find the account and its role.
    const result = await pool.query(
      `SELECT
         u.userid,
         u.firstname,
         u.lastname,
         u.email,
         u.passwordhash,
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

    // Use a generic response for unknown emails and incorrect passwords.
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }

    // Reject blocked accounts.
    if (user.isblocked) {
      return res.status(403).json({
        status: "error",
        message: "Your account is blocked. Please contact an administrator.",
      });
    }

    // Only approved and active accounts may sign in.
    if (user.status?.toLowerCase() !== "active") {
      return res.status(403).json({
        status: "error",
        message: "Your account is pending approval or inactive.",
      });
    }

    // Accounts without a password need first-time password setup.
    if (!user.passwordhash) {
      return res.status(403).json({
        status: "error",
        code: "PASSWORD_SETUP_REQUIRED",
        message: "Your account requires first-time password setup.",
      });
    }

    // Verify the submitted password against the stored bcrypt hash.
    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordhash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }

    // Regenerate the session ID after successful authentication.
    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Store only safe user information in the session.
    req.session.user = {
      userid: user.userid,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
    };

    // Save the session before responding to the frontend.
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

  // Check required fields.
  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      status: "error",
      message: "First name, last name, and email are required.",
    });
  }

  // Check email format.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: "error",
      message: "Please provide a valid email address.",
    });
  }

  try {
    // Check if email already exists.
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

    // Insert new user into the database.
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

    // Handle duplicate email constraint.
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
         r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.userid = $1`,
      [req.session.user.userid]
    );

    const user = result.rows[0];

    // Invalidate the session if the account no longer exists,
    // is blocked, or is not active.
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

    // Return fresh account information, not stale session data.
    return res.status(200).json({
      status: "success",
      user: {
        userid: user.userid,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name,
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
    // Acquire the database connection inside the try block.
    client = await pool.connect();

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT
         t.account_setup_token_id,
         t.user_id,
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

    // Hash the new password using bcrypt.
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
    // Roll back only if a database connection was acquired.
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
    // Release the connection only if it was successfully acquired.
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
