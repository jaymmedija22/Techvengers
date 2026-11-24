import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
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

function formatSalary(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function assignmentLabel(record) {
  const job = record.jobdesc || record.jobcode || "Unassigned job";
  const department = record.deptname || record.deptcode;
  return department ? `${job} · ${department}` : job;
}

function describeChange(previous, current, canViewSalary) {
  if (!previous) {
    return {
      title: "Initial assignment",
      details: "Starting job and department assignment",
    };
  }

  const jobChanged = previous.jobcode !== current.jobcode;
  const departmentChanged = previous.deptcode !== current.deptcode;
  const salaryChanged =
    canViewSalary && previous.salary !== current.salary;

  if (jobChanged && departmentChanged) {
    return {
      title: "Job change and department transfer",
      details: `From ${assignmentLabel(previous)} to ${assignmentLabel(current)}`,
    };
  }
  if (jobChanged) {
    return {
      title: "Job change / promotion",
      details: `From ${previous.jobdesc || previous.jobcode} to ${current.jobdesc || current.jobcode}`,
    };
  }
  if (departmentChanged) {
    return {
      title: "Department transfer",
      details: `From ${previous.deptname || previous.deptcode || "Unassigned"} to ${current.deptname || current.deptcode || "Unassigned"}`,
    };
  }
  if (salaryChanged) {
    return {
      title: "Salary adjustment",
      details: "Job and department assignment unchanged",
    };
  }
  return {
    title: "Assignment update",
    details: "Job and department remain unchanged",
  };
}

function EmployeeProfile() {
  const { empno } = useParams();
  const { user, loading: authLoading } = useAuth();
  const canView = user?.role_name === "Superadmin"
    || user?.permissions?.includes("employees.view");
  const [employee, setEmployee] = useState(null);
  const [jobHistory, setJobHistory] = useState([]);
  const [canViewSalary, setCanViewSalary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/${encodeURIComponent(empno)}/profile`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to retrieve employee profile.");
        }

        if (!controller.signal.aborted) {
          setEmployee(data.employee);
          setJobHistory(data.jobHistory || []);
          setCanViewSalary(data.canViewSalary === true);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setEmployee(null);
        setJobHistory([]);
        setError(fetchError.message || "Unable to retrieve employee profile.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    if (empno) fetchProfile();

    return () => controller.abort();
  }, [empno]);

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
                <h1>Employee Profile</h1>
                <p>You do not have permission to view employee records.</p>
              </div>
              <Link to="/home" className="user-add-button">Back to Dashboard</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const orderedHistory = [...jobHistory].sort(
    (first, second) => first.effdate.localeCompare(second.effdate)
  );
  const currentJob = employee?.jobdesc
    ? `${employee.jobdesc} (${employee.jobcode})`
    : employee?.jobcode || "";
  const currentDepartment = employee?.deptname
    ? `${employee.deptname} (${employee.deptcode})`
    : employee?.deptcode || "";

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content employee-profile-content">
          <div className="user-page-heading">
            <div>
              <h1>Employee Profile</h1>
              <p>Employee information and chronological employment timeline.</p>
            </div>
            <Link to="/employees" className="user-add-button">Back to Employees</Link>
          </div>

          {error && (
            <div className="user-alert user-alert-error" role="alert">{error}</div>
          )}

          {loading ? (
            <section className="user-table-card employee-profile-loading" role="status">
              Loading employee profile...
            </section>
          ) : employee ? (
            <>
              <section className="user-table-card employee-profile-card">
                <div className="employee-profile-identity">
                  <div className="employee-profile-avatar" aria-hidden="true">
                    {employee.firstname?.charAt(0)?.toUpperCase() || "E"}
                  </div>
                  <div>
                    <p className="employee-profile-eyebrow">EMPLOYEE {employee.empno}</p>
                    <h2>{[employee.firstname, employee.lastname].filter(Boolean).join(" ")}</h2>
                    <span
                      className={`user-status-badge ${employee.sepdate ? "inactive" : "active"}`}
                    >
                      {employee.sepdate ? "Separated" : "Active"}
                    </span>
                  </div>
                </div>

                <div className="employee-profile-details">
                  <div>
                    <span>Current job</span>
                    <strong>{currentJob || "No current job assignment"}</strong>
                  </div>
                  <div>
                    <span>Department</span>
                    <strong>{currentDepartment || "No department assignment"}</strong>
                  </div>
                  <div>
                    <span>Gender</span>
                    <strong>{employee.gender || "—"}</strong>
                  </div>
                  <div>
                    <span>Birth date</span>
                    <strong>{formatDate(employee.birthdate)}</strong>
                  </div>
                  <div>
                    <span>Hire date</span>
                    <strong>{formatDate(employee.hiredate)}</strong>
                  </div>
                  <div>
                    <span>Separation date</span>
                    <strong>{formatDate(employee.sepdate)}</strong>
                  </div>
                  {canViewSalary && (
                    <div>
                      <span>Current salary</span>
                      <strong>
                        {employee.current_salary === null || employee.current_salary === undefined
                          ? "Not available"
                          : formatSalary(employee.current_salary)}
                      </strong>
                    </div>
                  )}
                  {employee.assignment_effdate && (
                    <div>
                      <span>Current assignment effective</span>
                      <strong>{formatDate(employee.assignment_effdate)}</strong>
                    </div>
                  )}
                </div>
              </section>

              <section className="user-table-card employee-timeline-card">
                <div className="user-table-heading">
                  <div>
                    <h2>Employment Timeline</h2>
                    <p>Job and department assignments in chronological order.</p>
                  </div>
                  <span className="user-count">{jobHistory.length} records</span>
                </div>

                {orderedHistory.length === 0 ? (
                  <p className="employee-timeline-empty">
                    No job history information is available for this employee.
                  </p>
                ) : (
                  <ol className="employee-timeline">
                    {orderedHistory.map((record, index) => {
                      const change = describeChange(
                        orderedHistory[index - 1],
                        record,
                        canViewSalary
                      );

                      return (
                        <li key={`${record.empno}-${record.effdate}`}>
                          <span className="employee-timeline-marker" aria-hidden="true" />
                          <article className="employee-timeline-entry">
                            <div className="employee-timeline-entry-heading">
                              <div>
                                <span className="employee-timeline-date">
                                  {formatDate(record.effdate)}
                                </span>
                                <h3>{change.title}</h3>
                              </div>
                              <span className="employee-timeline-effective">
                                Effective date
                              </span>
                            </div>
                            <p>{change.details}</p>
                            <div className="employee-timeline-assignment">
                              <div>
                                <span>Job</span>
                                <strong>{record.jobdesc || record.jobcode || "Unavailable"}</strong>
                              </div>
                              <div>
                                <span>Department</span>
                                <strong>{record.deptname || record.deptcode || "Unavailable"}</strong>
                              </div>
                              {canViewSalary && (
                                <div>
                                  <span>Salary</span>
                                  <strong>
                                    {record.salary === null || record.salary === undefined
                                      ? "Not available"
                                      : formatSalary(record.salary)}
                                  </strong>
                                </div>
                              )}
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </>
          ) : (
            !error && (
              <section className="user-table-card employee-profile-loading">
                Employee profile information is unavailable.
              </section>
            )
          )}
        </div>
      </main>
    </div>
  );
}

export default EmployeeProfile;
