
const express = require("express");
const pool = require("./config/database");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "HOPE ERP backend is running",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    res.status(200).json({
      status: "ok",
      message: "Supabase database connected successfully",
      databaseTime: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      message: "Database connection failed. Check the server terminal.",
    });
  }
});

module.exports = app;
