import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API_URL = "http://localhost:3000/api/employees";

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function EmployeeManagement() {
  const { user, loading: authLoading } = useAuth();
  const canView = user?.role_name === "Superadmin"
    || user?.permissions?.includes("employees.view");

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [job, setJob] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEmployees = useCallback(async (signal) => {
    try {
      const params = new URLSearchParams({ status: employmentStatus });
      if (search.trim()) params.set("q", search.trim());
      if (department) params.set("department", department);
      if (job) params.set("job", job);

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        credentials: "include",
        signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to retrieve employees.");
      }

      if (!signal.aborted) {
        setEmployees(data.employees || []);
        setError("");
      }
    } catch (fetchError) {
      if (signal.aborted) return;
      setEmployees([]);
      setError(fetchError.message || "Unable to retrieve employees.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [department, employmentStatus, job, search]);

  useEffect(() => {
    let active = true;

    async function fetchOptions() {
      try {
        const response = await fetch(`${API_URL}/options`, {
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to retrieve employee filters.");
        }

        if (active) {
          setDepartments(data.departments || []);
          setJobs(data.jobs || []);
        }
      } catch (optionsError) {
        if (active) {
          setError(optionsError.message || "Unable to retrieve employee filters.");
        }
      }
    }

    fetchOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchEmployees(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchEmployees]);

  function updateFilter(setter, value) {
    setLoading(true);
    setError("");
    setter(value);
  }

  function clearFilters() {
    setSearch("");
    setDepartment("");
    setJob("");
    setEmploymentStatus("active");
    setLoading(true);
    setError("");
  }

  const activeCount = employees.filter((employee) => !employee.sepdate).length;

  if (authLoading) {
    return <div className="dashboard-loading">Checking your session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView) {
    return (
      <div className="dashboard-layout">
        <main className="dashboard-main">
          <div className="dashboard-content user-management-content">
            <div className="user-page-heading">
              <div>
                <h1>Employee Management</h1>
                <p>You do not have permission to view employee records.</p>
              </div>
              <Link to="/home" className="user-add-button">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content">
          <div className="user-page-heading">
            <div>
              <h1>Employee Management</h1>
              <p>Search and filter employee records and current assignments.</p>
            </div>
            <Link to="/home" className="user-add-button">
              Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="user-alert user-alert-error" role="alert">
              {error}
            </div>
          )}

          <section className="user-table-card">
            <div className="user-table-heading">
              <div>
                <h2>Employees</h2>
                <p>
                  {employmentStatus === "active"
                    ? "Currently active employees"
                    : employmentStatus === "separated"
                      ? "Separated employee records"
                      : "All employee records"}
                </p>
              </div>
              <span className="user-count">
                {employees.length} employees
              </span>
            </div>

            <div className="user-table-controls employee-table-controls">
              <label className="user-search" htmlFor="employee-search">
                <span aria-hidden="true">⌕</span>
                <input
                  id="employee-search"
                  type="search"
                  placeholder="Search employee no., name, job, or department..."
                  value={search}
                  onChange={(event) => updateFilter(setSearch, event.target.value)}
                />
              </label>

              <select
                className="user-role-filter"
                aria-label="Filter by department"
                value={department}
                onChange={(event) => updateFilter(setDepartment, event.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((item) => (
                  <option key={item.deptcode} value={item.deptcode}>
                    {item.deptname} ({item.deptcode})
                  </option>
                ))}
              </select>

              <select
                className="user-role-filter"
                aria-label="Filter by job"
                value={job}
                onChange={(event) => updateFilter(setJob, event.target.value)}
              >
                <option value="">All Jobs</option>
                {jobs.map((item) => (
                  <option key={item.jobcode} value={item.jobcode}>
                    {item.jobdesc} ({item.jobcode})
                  </option>
                ))}
              </select>

              <select
                className="user-role-filter"
                aria-label="Filter by employment status"
                value={employmentStatus}
                onChange={(event) =>
                  updateFilter(setEmploymentStatus, event.target.value)
                }
              >
                <option value="active">Active Employees</option>
                <option value="separated">Separated Employees</option>
                <option value="all">All Employees</option>
              </select>

              <button
                type="button"
                className="employee-clear-filters"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>

            <div className="user-table-wrapper">
              <table className="user-management-table">
                <thead>
                  <tr>
                    <th>EMPLOYEE NO.</th>
                    <th>EMPLOYEE NAME</th>
                    <th>GENDER</th>
                    <th>HIRE DATE</th>
                    <th>CURRENT JOB</th>
                    <th>DEPARTMENT</th>
                    <th>STATUS</th>
                    <th>SEPARATION DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="user-empty-state">
                        Loading employees...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="user-empty-state">
                        No employees match the current search and filters.
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => {
                      const separated = Boolean(employee.sepdate);
                      const fullName = [employee.firstname, employee.lastname]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <tr key={employee.empno}>
                          <td>{employee.empno}</td>
                          <td>{fullName || "—"}</td>
                          <td>{employee.gender || "—"}</td>
                          <td>{formatDate(employee.hiredate)}</td>
                          <td>
                            {employee.jobdesc
                              ? `${employee.jobdesc} (${employee.jobcode})`
                              : "—"}
                          </td>
                          <td>
                            {employee.deptname
                              ? `${employee.deptname} (${employee.deptcode})`
                              : "—"}
                          </td>
                          <td>
                            <span
                              className={`user-status-badge ${separated ? "inactive" : "active"}`}
                            >
                              {separated ? "Separated" : "Active"}
                            </span>
                          </td>
                          <td>{formatDate(employee.sepdate)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="user-table-footer">
              Showing {employees.length} employee(s)
              {!loading && employmentStatus === "active" && employees.length > 0
                ? ` · ${activeCount} active`
                : ""}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default EmployeeManagement;
