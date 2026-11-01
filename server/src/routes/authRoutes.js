
const express = require("express");
const pool = require("../config/database");

const router = express.Router();

// POST /register
router.post("/register", async (req, res) => {
  const firstName = req.body.firstName?.trim();
  const lastName = req.body.lastName?.trim();
  const email = req.body.email?.trim().toLowerCase();

  // Check required fields
  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      status: "error",
      message: "First name, last name, and email are required.",
    });
  }

  // Check email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: "error",
      message: "Please provide a valid email address.",
    });
  }

  try {
    // Check if email already exists
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

    // Insert new user into the database
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

    // Handle duplicate email constraint
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

module.exports = router;
