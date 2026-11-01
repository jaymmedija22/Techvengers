
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
      "SELECT userid FROM users WHERE email = $1",
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
      `INSERT INTO users (firstname, lastname, email)
       VALUES ($1, $2, $3)
       RETURNING userid, firstname, lastname, email, role, status, stamp`,
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
