
const fs = require("fs");
const path = require("path");

// Load environment variables from server/.env
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

// Import database connection AFTER loading .env
const pool = require("../../src/config/database");

async function runDemoData() {
  try {
    console.log("Checking database configuration...");

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL was not found in server/.env");
    }

    console.log("Database URL found.");
    console.log("Executing demo data seed...");

    const filePath = path.join(
      __dirname,
      "005_demo_customer_product_pricehist.sql"
    );

    const sql = fs.readFileSync(filePath, "utf8");

    await pool.query(sql);
    const result = await pool.query(`
  SELECT
    (SELECT COUNT(*) FROM customer
     WHERE custno IN (
       'D9001', 'D9002', 'D9003', 'D9004', 'D9005',
       'D9006', 'D9007', 'D9008', 'D9009', 'D9010'
     )) AS demo_customers,

    (SELECT COUNT(*) FROM product
     WHERE prodcode IN (
       'D90001', 'D90002', 'D90003', 'D90004',
       'D90005', 'D90006', 'D90007', 'D90008',
       'D90009', 'D90010', 'D90011', 'D90012'
     )) AS demo_products,

    (SELECT COUNT(*) FROM pricehist
     WHERE prodcode IN (
       'D90001', 'D90002', 'D90003', 'D90004',
       'D90005', 'D90006', 'D90007', 'D90008',
       'D90009', 'D90010', 'D90011', 'D90012'
     )) AS demo_price_history;
`);

console.log("\nDemo data verification:");
console.log("Customers:", result.rows[0].demo_customers, "/ 10");
console.log("Products:", result.rows[0].demo_products, "/ 12");
console.log("Price History:", result.rows[0].demo_price_history, "/ 24");

    console.log("Demo data seed executed successfully!");

  } catch (error) {
    console.error("Seed execution failed:");
    console.error(error);

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDemoData();
