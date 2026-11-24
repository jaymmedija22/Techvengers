import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API_URL = "http://localhost:3000/api/employees";
const DEFAULT_ASSIGNMENT_DATE = new Date().toISOString().slice(0, 10);
const DEFAULT_SEPARATION_DATE = (() => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
})();
const EMPTY_FORM = {
  empno: "",
  firstname: "",
  lastname: "",
  gender: "",
  birthdate: "",
  hiredate: "",
  jobcode: "",
  deptcode: "",
  salary: "",
  assignmentEffectiveDate: "",
};

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

function EmployeeManagement() {
  const { user, loading: authLoading } = useAuth();
  const canView = user?.role_name === "Superadmin"
    || user?.permissions?.includes("employees.view");
  const canAdd = user?.role_name === "Superadmin"
    || user?.permissions?.includes("employees.add");
  const canEdit = user?.role_name === "Superadmin"
    || user?.permissions?.includes("employees.edit");
  const canSeparate = user?.role_name === "Superadmin"
    || user?.permissions?.includes("employees.delete");
  const canRestore = user?.role_name === "Superadmin"
    || user?.permissions?.includes("employees.restore");

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [job, setJob] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState(null);
  const [lifecycleError, setLifecycleError] = useState("");
  const [lifecycleSaving, setLifecycleSaving] = useState(false);

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

  function openAddModal() {
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(employee) {
    setEditingEmployee(employee);
    setForm({
      empno: employee.empno,
      firstname: employee.firstname || "",
      lastname: employee.lastname || "",
      gender: employee.gender || "",
      birthdate: dateInputValue(employee.birthdate),
      hiredate: dateInputValue(employee.hiredate),
      jobcode: employee.jobcode || "",
      deptcode: employee.deptcode || "",
      salary: employee.salary ?? "",
      assignmentEffectiveDate: DEFAULT_ASSIGNMENT_DATE,
    });
    setFormError("");
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openLifecycleConfirmation(employee, action) {
    setLifecycleError("");
    setLifecycleAction({
      employee,
      action,
      sepdate: action === "separate" ? DEFAULT_SEPARATION_DATE : "",
    });
  }

  function closeLifecycleConfirmation() {
    if (lifecycleSaving) return;
    setLifecycleAction(null);
    setLifecycleError("");
  }

  async function confirmLifecycleAction() {
    if (!lifecycleAction) return;

    const { employee, action, sepdate } = lifecycleAction;
    setLifecycleSaving(true);
    setLifecycleError("");
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(employee.empno)}/${action}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: action === "separate" ? JSON.stringify({ sepdate }) : undefined,
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Unable to ${action} employee.`);
      }

      setLifecycleAction(null);
      setSuccess(data.message);
      setLoading(true);
      await fetchEmployees(new AbortController().signal);
    } catch (actionError) {
      setLifecycleError(actionError.message || `Unable to ${action} employee.`);
    } finally {
      setLifecycleSaving(false);
    }
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setError("");
    setSuccess("");

    const values = {
      ...form,
      empno: form.empno.trim().toUpperCase(),
      firstname: form.firstname.trim(),
      lastname: form.lastname.trim(),
      gender: form.gender.toUpperCase(),
      jobcode: form.jobcode.toUpperCase(),
      deptcode: form.deptcode.toUpperCase(),
      salary: form.salary === "" ? null : Number(form.salary),
    };

    if (!/^[A-Z0-9]{1,5}$/.test(values.empno)) {
      setFormError("Employee number must contain 1 to 5 letters or numbers.");
      return;
    }
    if (!values.firstname || [...values.firstname].length > 15) {
      setFormError("First name is required and cannot exceed 15 characters.");
      return;
    }
    if (!values.lastname || [...values.lastname].length > 15) {
      setFormError("Last name is required and cannot exceed 15 characters.");
      return;
    }
    if (!values.gender || !values.birthdate || !values.hiredate) {
      setFormError("Gender, birth date, and hire date are required.");
      return;
    }
    if (values.birthdate >= values.hiredate) {
      setFormError("Birth date must be earlier than the hire date.");
      return;
    }
    if (!values.jobcode || !values.deptcode) {
      setFormError("Select a department and job.");
      return;
    }
    if (
      values.salary !== null &&
      (!Number.isFinite(values.salary) || values.salary < 0)
    ) {
      setFormError("Salary must be a non-negative number.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingEmployee
          ? `${API_URL}/${encodeURIComponent(editingEmployee.empno)}`
          : API_URL,
        {
          method: editingEmployee ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save employee.");
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      setSuccess(data.message);
      setLoading(true);
      await fetchEmployees(new AbortController().signal);
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save employee.");
    } finally {
      setSaving(false);
    }
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
              <div className="customer-heading-actions">
                <span className="user-count">{employees.length} employees</span>
                {canAdd && (
                  <button
                    type="button"
                    className="user-add-button"
                    onClick={openAddModal}
                  >
                    + Add Employee
                  </button>
                )}
              </div>
            </div>

            {success && (
              <div className="user-alert user-alert-success" role="status">
                {success}
              </div>
            )}

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
                    <th>BIRTH DATE</th>
                    <th>HIRE DATE</th>
                    <th>CURRENT JOB</th>
                    <th>DEPARTMENT</th>
                    <th>SALARY</th>
                    <th>STATUS</th>
                    <th>SEPARATION DATE</th>
                    {(canEdit || canSeparate || canRestore) && <th>ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={canEdit || canSeparate || canRestore ? 11 : 10}
                        className="user-empty-state"
                      >
                        Loading employees...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canEdit || canSeparate || canRestore ? 11 : 10}
                        className="user-empty-state"
                      >
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
                          <td>{formatDate(employee.birthdate)}</td>
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
                            {employee.salary === null || employee.salary === undefined
                              ? "—"
                              : Number(employee.salary).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                          </td>
                          <td>
                            <span
                              className={`user-status-badge ${separated ? "inactive" : "active"}`}
                            >
                              {separated ? "Separated" : "Active"}
                            </span>
                          </td>
                          <td>{formatDate(employee.sepdate)}</td>
                          {(canEdit || canSeparate || canRestore) && (
                            <td>
                              <div className="employee-row-actions">
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="employee-edit-button"
                                    onClick={() => openEditModal(employee)}
                                  >
                                    Edit
                                  </button>
                                )}
                                {separated && canRestore && (
                                  <button
                                    type="button"
                                    className="employee-restore-button"
                                    onClick={() =>
                                      openLifecycleConfirmation(employee, "restore")
                                    }
                                  >
                                    Restore
                                  </button>
                                )}
                                {!separated && canSeparate && (
                                  <button
                                    type="button"
                                    className="employee-separate-button"
                                    onClick={() =>
                                      openLifecycleConfirmation(employee, "separate")
                                    }
                                  >
                                    Mark Separated
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
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

      {modalOpen && (
        <div
          className="customer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="customer-modal employee-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
          >
            <div className="customer-modal-header">
              <h2 id="employee-modal-title">
                {editingEmployee ? "Edit Employee" : "Register Employee"}
              </h2>
              <button
                type="button"
                className="customer-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="user-alert user-alert-error" role="alert">
                  {formError}
                </div>
              )}

              <div className="employee-form-grid">
                <div className="customer-form-group">
                  <label htmlFor="employee-number">Employee Number</label>
                  <input
                    id="employee-number"
                    name="empno"
                    type="text"
                    maxLength={5}
                    pattern="[A-Za-z0-9]{1,5}"
                    value={form.empno}
                    onChange={handleFormChange}
                    placeholder="e.g. 00123"
                    required
                    disabled={!!editingEmployee || saving}
                  />
                </div>

                <div className="customer-form-group">
                  <label htmlFor="employee-first-name">First Name</label>
                  <input
                    id="employee-first-name"
                    name="firstname"
                    type="text"
                    maxLength={15}
                    value={form.firstname}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="customer-form-group">
                  <label htmlFor="employee-last-name">Last Name</label>
                  <input
                    id="employee-last-name"
                    name="lastname"
                    type="text"
                    maxLength={15}
                    value={form.lastname}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="customer-form-group">
                  <label htmlFor="employee-gender">Gender</label>
                  <select
                    id="employee-gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  >
                    <option value="">Select gender</option>
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </div>

                <div className="customer-form-group">
                  <label htmlFor="employee-birth-date">Birth Date</label>
                  <input
                    id="employee-birth-date"
                    name="birthdate"
                    type="date"
                    value={form.birthdate}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="customer-form-group">
                  <label htmlFor="employee-hire-date">Hire Date</label>
                  <input
                    id="employee-hire-date"
                    name="hiredate"
                    type="date"
                    value={form.hiredate}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="customer-form-group">
                  <label htmlFor="employee-department">Department</label>
                  <select
                    id="employee-department"
                    name="deptcode"
                    value={form.deptcode}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  >
                    <option value="">Select department</option>
                    {departments.map((item) => (
                      <option key={item.deptcode} value={item.deptcode}>
                        {item.deptname} ({item.deptcode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="customer-form-group">
                  <label htmlFor="employee-job">Job</label>
                  <select
                    id="employee-job"
                    name="jobcode"
                    value={form.jobcode}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  >
                    <option value="">Select job</option>
                    {jobs.map((item) => (
                      <option key={item.jobcode} value={item.jobcode}>
                        {item.jobdesc} ({item.jobcode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="customer-form-group">
                  <label htmlFor="employee-salary">Salary (optional)</label>
                  <input
                    id="employee-salary"
                    name="salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salary}
                    onChange={handleFormChange}
                    disabled={saving}
                  />
                </div>

                {editingEmployee && (
                  <div className="customer-form-group">
                    <label htmlFor="assignment-effective-date">
                      Assignment Effective Date
                    </label>
                    <input
                      id="assignment-effective-date"
                      name="assignmentEffectiveDate"
                      type="date"
                      value={form.assignmentEffectiveDate}
                      onChange={handleFormChange}
                      disabled={saving}
                    />
                    <small>
                      Used only when the job, department, or salary changes.
                    </small>
                  </div>
                )}
              </div>

              <div className="customer-modal-actions">
                <button
                  type="button"
                  className="customer-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="customer-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingEmployee
                      ? "Save Changes"
                      : "Create Employee"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {lifecycleAction && (
        <div
          className="customer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeLifecycleConfirmation();
            }
          }}
        >
          <section
            className="customer-modal employee-lifecycle-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-lifecycle-title"
          >
            <div className="customer-modal-header">
              <h2 id="employee-lifecycle-title">
                {lifecycleAction.action === "separate"
                  ? "Confirm Employee Separation"
                  : "Confirm Employee Restore"}
              </h2>
              <button
                type="button"
                className="customer-modal-close"
                onClick={closeLifecycleConfirmation}
                disabled={lifecycleSaving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {lifecycleError && (
              <div className="user-alert user-alert-error" role="alert">
                {lifecycleError}
              </div>
            )}

            {lifecycleAction.action === "separate" ? (
              <>
                <p>
                  Mark {lifecycleAction.employee.firstname}{" "}
                  {lifecycleAction.employee.lastname} (
                  {lifecycleAction.employee.empno}) as separated? The employee
                  record and job history will be retained.
                </p>
                <div className="customer-form-group">
                  <label htmlFor="employee-separation-date">
                    Separation Date
                  </label>
                  <input
                    id="employee-separation-date"
                    type="date"
                    value={lifecycleAction.sepdate}
                    onChange={(event) =>
                      setLifecycleAction((current) => ({
                        ...current,
                        sepdate: event.target.value,
                      }))
                    }
                    disabled={lifecycleSaving}
                    required
                  />
                </div>
              </>
            ) : (
              <p>
                Restore {lifecycleAction.employee.firstname}{" "}
                {lifecycleAction.employee.lastname} (
                {lifecycleAction.employee.empno})? Their existing employee
                information and job history will be retained.
              </p>
            )}

            <div className="customer-modal-actions">
              <button
                type="button"
                className="customer-cancel-button"
                onClick={closeLifecycleConfirmation}
                disabled={lifecycleSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  lifecycleAction.action === "separate"
                    ? "employee-separate-button"
                    : "employee-restore-button"
                }
                onClick={confirmLifecycleAction}
                disabled={
                  lifecycleSaving ||
                  (lifecycleAction.action === "separate" &&
                    !lifecycleAction.sepdate)
                }
              >
                {lifecycleSaving
                  ? "Saving..."
                  : lifecycleAction.action === "separate"
                    ? "Confirm Separation"
                    : "Confirm Restore"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default EmployeeManagement;
