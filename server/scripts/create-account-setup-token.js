require("dotenv").config();

const crypto = require("crypto");
const readline = require("readline");
const pool = require("../src/config/database");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  const email = (await ask("Enter the account email: "))
    .trim()
    .toLowerCase();

  if (!email) {
    throw new Error("Email is required.");
  }

  const result = await pool.query(
    `SELECT userid, email, passwordhash, isblocked, status
     FROM app_user
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("Account not found.");
  }

  if (user.isblocked) {
    throw new Error("This account is blocked.");
  }

  if (user.status?.toLowerCase() !== "active") {
    throw new Error("This account is not active.");
  }

  if (user.passwordhash) {
    throw new Error("This account already has a password.");
  }

  // Generate a cryptographically secure, random 256-bit token.
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Store only the SHA-256 hash, never the original token.
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Invalidate any previous unused setup tokens for this account.
    await client.query(
      `UPDATE account_setup_token
       SET is_used = TRUE
       WHERE user_id = $1 AND is_used = FALSE`,
      [user.userid]
    );

    // Save the new token with a 30-minute expiration.
    await client.query(
      `INSERT INTO account_setup_token
       (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [user.userid, tokenHash]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  console.log("\nAccount setup token generated successfully.");
  console.log("Account:", user.email);
  console.log("Expires in: 30 minutes");
  console.log("\nONE-TIME TOKEN (keep private):");
  console.log(rawToken);
}

main()
  .catch((error) => {
    console.error("Token generation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await pool.end();
  });