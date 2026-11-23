const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const pool = require("../../src/config/database");

async function runHrDemoData() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL was not found in server/.env");
    }

    const seedPath = path.join(__dirname, "006_demo_hr_data.sql");
    const seedSql = fs.readFileSync(seedPath, "utf8");
    await pool.query(seedSql);

    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.department
         WHERE deptcode IN ('D90', 'D91', 'D92', 'D93')) AS departments,
        (SELECT COUNT(*)::int FROM public.job
         WHERE jobcode IN ('D901', 'D902', 'D903', 'D904', 'D905', 'D906', 'D907', 'D908')) AS jobs,
        (SELECT COUNT(*)::int FROM public.employee
         WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')) AS employees,
        (SELECT COUNT(*)::int FROM public.employee
         WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
           AND sepdate IS NULL) AS active_employees,
        (SELECT COUNT(*)::int FROM public.employee
         WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
           AND sepdate IS NOT NULL) AS separated_employees,
        (SELECT COUNT(*)::int FROM public.jobhistory
         WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')) AS job_history,
        (SELECT COUNT(*)::int FROM public.jobhistory
         WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
           AND salary IS NOT NULL) AS salary_records,
        (SELECT COUNT(*)::int FROM public.vw_employee_current_job_department
         WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')) AS current_assignments
    `);

    const counts = result.rows[0];
    const expected = {
      departments: 4,
      jobs: 8,
      employees: 8,
      active_employees: 6,
      separated_employees: 2,
      job_history: 14,
      salary_records: 14,
      current_assignments: 8,
    };

    for (const [key, expectedCount] of Object.entries(expected)) {
      if (counts[key] !== expectedCount) {
        throw new Error(
          `HR demo data verification failed: expected ${expectedCount} ${key}, found ${counts[key]}.`
        );
      }
    }

    console.log("HR demo data seed executed and verified successfully:");
    console.table(counts);
  } catch (error) {
    console.error("HR demo data seed failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runHrDemoData();
