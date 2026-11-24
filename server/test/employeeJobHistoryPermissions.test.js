const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

const userPermissions = new Map([
  ["employee-only", new Set(["employees.view", "employees.salary.view"])],
  ["history-viewer", new Set(["employees.view", "job_history.view"])],
]);
const database = {
  async query(sql, values = []) {
    if (sql.includes("FROM public.app_user")) {
      return {
        rows: [{ userid: values[0], role_name: "HR User" }],
        rowCount: 1,
      };
    }

    if (sql.includes("FROM public.user_permission")) {
      const rightCode = sql.includes("right_code = 'job_history.view'")
        ? "job_history.view"
        : values[1];
      const hasPermission = userPermissions
        .get(values[0])
        ?.has(rightCode);
      return {
        rows: hasPermission ? [{ allowed: 1 }] : [],
        rowCount: hasPermission ? 1 : 0,
      };
    }

    if (sql.includes("current_assignment")) {
      return {
        rows: [{ empno: "E0001", firstname: "Test", salary: "85000.00" }],
        rowCount: 1,
      };
    }

    if (sql.includes("FROM public.employee AS employee")) {
      return {
        rows: [{
          empno: "E0001",
          firstname: "Test",
          lastname: "Employee",
          jobcode: "DEV",
          jobdesc: "Developer",
          deptcode: "ENG",
          deptname: "Engineering",
          ...(sql.includes("current_salary")
            ? { current_salary: "85000.00", assignment_effdate: "2024-01-01" }
            : {}),
        }],
        rowCount: 1,
      };
    }

    if (sql.includes("FROM public.jobhistory AS history")) {
      return {
        rows: [{
          empno: "E0001",
          jobcode: "DEV",
          jobdesc: "Developer",
          deptcode: "ENG",
          deptname: "Engineering",
          effdate: "2024-01-01",
          salary: "85000.00",
        }],
        rowCount: 1,
      };
    }

    throw new Error(`Unexpected database query in permission test: ${sql}`);
  },
};

const databaseModule = require.resolve("../src/config/database");
require.cache[databaseModule] = {
  id: databaseModule,
  filename: databaseModule,
  loaded: true,
  exports: database,
};

const employeeRoutes = require("../src/routes/employeeRoutes");
const jobHistoryRoutes = require("../src/routes/jobHistoryRoutes");
const app = express();
app.use((req, res, next) => {
  req.session = { user: { userid: req.headers["x-user-id"] } };
  next();
});
app.use("/api/employees", employeeRoutes);
app.use("/api/job-history", jobHistoryRoutes);

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("employee profile keeps basic details but omits history and salary without job_history.view", async () => {
  const response = await fetch(`${baseUrl}/api/employees/E0001/profile`, {
    headers: { "x-user-id": "employee-only" },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.employee.empno, "E0001");
  assert.equal(data.canViewJobHistory, false);
  assert.deepEqual(data.jobHistory, []);
  assert.equal("current_salary" in data.employee, false);
  assert.equal("assignment_effdate" in data.employee, false);
});

test("employee profile includes history and salary with job_history.view", async () => {
  const response = await fetch(`${baseUrl}/api/employees/E0001/profile`, {
    headers: { "x-user-id": "history-viewer" },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.canViewJobHistory, true);
  assert.equal(data.employee.current_salary, "85000.00");
  assert.equal(data.jobHistory[0].salary, "85000.00");
});

test("direct job-history API requests reject users without job_history.view", async () => {
  const response = await fetch(`${baseUrl}/api/job-history/E0001`, {
    headers: { "x-user-id": "employee-only" },
  });
  const data = await response.json();

  assert.equal(response.status, 403);
  assert.match(data.message, /job_history\.view/);
});

test("employee listing only returns salary to users with job_history.view", async () => {
  const restrictedResponse = await fetch(`${baseUrl}/api/employees`, {
    headers: { "x-user-id": "employee-only" },
  });
  const restrictedData = await restrictedResponse.json();
  const authorizedResponse = await fetch(`${baseUrl}/api/employees`, {
    headers: { "x-user-id": "history-viewer" },
  });
  const authorizedData = await authorizedResponse.json();

  assert.equal(restrictedResponse.status, 200);
  assert.equal("salary" in restrictedData.employees[0], false);
  assert.equal(authorizedResponse.status, 200);
  assert.equal(authorizedData.employees[0].salary, "85000.00");
});
