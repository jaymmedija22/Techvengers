import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API_URL = "http://localhost:3000/api/job-history";
const EMPTY_FORM = {
  jobcode: "",
  deptcode: "",
  effdate: "",
  salary: "",
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

function JobHistoryManagement() {
  const { user, loading: authLoading } = useAuth();
  const canView = user?.role_name === "Superadmin"
    || user?.permissions?.includes("job_history.view");
  const canAdd = user?.role_name === "Superadmin"
    || user?.permissions?.includes("job_history.add");
  const canEdit = user?.role_name === "Superadmin"
    || user?.permissions?.includes("job_history.edit");
  const canDelete = user?.role_name === "Superadmin"
    || user?.permissions?.includes("job_history.delete");

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const selectedEmployeeInfo = useMemo(
    () => employees.find((employee) => employee.empno === selectedEmployee),
    [employees, selectedEmployee]
  );

  const fetchHistory = useCallback(async (empno, signal) => {
    if (!empno) return;

    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(empno)}`, {
        credentials: "include",
        signal,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to retrieve job history.");
      }

      if (!signal.aborted) {
        setHistory(data.jobHistory || []);
        setError("");
      }
    } catch (fetchError) {
      if (signal.aborted) return;
      setHistory([]);
      setError(fetchError.message || "Unable to retrieve job history.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [employeeResponse, optionsResponse] = await Promise.all([
          fetch(`${API_URL}/employees`, { credentials: "include" }),
          fetch(`${API_URL}/options`, { credentials: "include" }),
        ]);
        const [employeeData, optionsData] = await Promise.all([
          employeeResponse.json(),
          optionsResponse.json(),
        ]);

        if (!employeeResponse.ok) {
          throw new Error(employeeData.message || "Unable to retrieve employees.");
        }
        if (!optionsResponse.ok) {
          throw new Error(optionsData.message || "Unable to retrieve job history options.");
        }

        if (active) {
          const employeeList = employeeData.employees || [];
          setEmployees(employeeList);
          setDepartments(optionsData.departments || []);
          setJobs(optionsData.jobs || []);
          setSelectedEmployee(
            employeeList.find((employee) => !employee.sepdate)?.empno
              || employeeList[0]?.empno
              || ""
          );
          setOptionsError("");
        }
      } catch (fetchError) {
        if (active) {
          setOptionsError(fetchError.message || "Unable to load job history options.");
        }
      }
    }

    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(selectedEmployee, controller.signal);
    return () => controller.abort();
  }, [fetchHistory, selectedEmployee]);

  function openAddModal() {
    setEditingRecord(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(record) {
    setEditingRecord(record);
    setForm({
      jobcode: record.jobcode,
      deptcode: record.deptcode || "",
      effdate: record.effdate,
      salary: record.salary ?? "",
    });
    setFormError("");
    setError("");
    setSuccess("");
    setModalOpen(true);
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

    const record = {
      empno: selectedEmployee,
      jobcode: form.jobcode,
      deptcode: form.deptcode,
      effdate: form.effdate,
      salary: form.salary === "" ? "" : Number(form.salary),
    };

    if (!record.empno || !record.jobcode || !record.deptcode || !record.effdate) {
      setFormError("Employee, job, department, and effective date are required.");
      return;
    }
    if (
      record.salary === "" ||
      !Number.isFinite(record.salary) ||
      record.salary < 0
    ) {
      setFormError("Enter a valid non-negative salary.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingRecord
          ? `${API_URL}/${encodeURIComponent(selectedEmployee)}/${encodeURIComponent(editingRecord.effdate)}`
          : API_URL,
        {
          method: editingRecord ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to save job history.");
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      setSuccess(data.message);
      setLoading(true);
      await fetchHistory(selectedEmployee, new AbortController().signal);
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save job history.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!recordToDelete) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(selectedEmployee)}/${encodeURIComponent(recordToDelete.effdate)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to delete job history.");
      }

      setRecordToDelete(null);
      setSuccess(data.message);
      setLoading(true);
      await fetchHistory(selectedEmployee, new AbortController().signal);
    } catch (deleteErrorResponse) {
      setDeleteError(deleteErrorResponse.message || "Unable to delete job history.");
    } finally {
      setDeleting(false);
    }
  }

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
                <h1>Job History Management</h1>
                <p>You do not have permission to view employee job history.</p>
              </div>
              <Link to="/home" className="user-add-button">Back to Dashboard</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const orderedHistory = [...history].sort(
    (first, second) => first.effdate.localeCompare(second.effdate)
  );

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content">
          <div className="user-page-heading">
            <div>
              <h1>Job History Management</h1>
              <p>Record employee promotions, transfers, and salary changes.</p>
            </div>
            <Link to="/home" className="user-add-button">Back to Dashboard</Link>
          </div>

          {(optionsError || error) && (
            <div className="user-alert user-alert-error" role="alert">
              {optionsError || error}
            </div>
          )}

          {success && (
            <div className="user-alert user-alert-success" role="status">
              {success}
            </div>
          )}

          <section className="user-table-card">
            <div className="user-table-heading">
              <div>
                <h2>Employee Job History</h2>
                <p>
                  {selectedEmployeeInfo
                    ? `${selectedEmployeeInfo.firstname} ${selectedEmployeeInfo.lastname} · ${selectedEmployeeInfo.empno}`
                    : "Select an employee to view job history."}
                </p>
              </div>
              <div className="customer-heading-actions">
                <span className="user-count">{history.length} records</span>
                {canAdd && selectedEmployee && (
                  <button
                    type="button"
                    className="user-add-button"
                    onClick={openAddModal}
                  >
                    + Add Job History
                  </button>
                )}
              </div>
            </div>

            <div className="user-table-controls">
              <label className="job-history-employee-select" htmlFor="history-employee">
                <span>Employee</span>
                <select
                  id="history-employee"
                  value={selectedEmployee}
                  onChange={(event) => {
                    setSelectedEmployee(event.target.value);
                    setLoading(true);
                    setError("");
                    setSuccess("");
                  }}
                  disabled={employees.length === 0}
                >
                  {employees.length === 0 && <option value="">No employees available</option>}
                  {employees.map((employee) => (
                    <option key={employee.empno} value={employee.empno}>
                      {employee.empno} · {employee.firstname} {employee.lastname}
                      {employee.sepdate ? " (Separated)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="user-table-wrapper">
              <table className="user-management-table">
                <thead>
                  <tr>
                    <th>EFFECTIVE DATE</th>
                    <th>CHANGE</th>
                    <th>JOB</th>
                    <th>DEPARTMENT</th>
                    <th>SALARY</th>
                    {(canEdit || canDelete) && <th>ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading && selectedEmployee ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 6 : 5} className="user-empty-state">
                        Loading job history...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 6 : 5} className="user-empty-state">
                        No job history records found for this employee.
                      </td>
                    </tr>
                  ) : (
                    [...orderedHistory].reverse().map((record, reverseIndex) => {
                      const index = orderedHistory.length - reverseIndex - 1;
                      const previous = orderedHistory[index - 1];
                      let change = "Initial assignment";
                      if (previous) {
                        const jobChanged = previous.jobcode !== record.jobcode;
                        const departmentChanged = previous.deptcode !== record.deptcode;
                        if (jobChanged && departmentChanged) change = "Job & department change";
                        else if (jobChanged) change = "Job change / promotion";
                        else if (departmentChanged) change = "Department transfer";
                        else if (previous.salary !== record.salary) change = "Salary change";
                        else change = "Assignment update";
                      }

                      return (
                        <tr key={`${record.empno}-${record.effdate}`}>
                          <td>{formatDate(record.effdate)}</td>
                          <td>{change}</td>
                          <td>{record.jobdesc} ({record.jobcode})</td>
                          <td>
                            {record.deptname
                              ? `${record.deptname} (${record.deptcode})`
                              : record.deptcode || "—"}
                          </td>
                          <td>
                            {record.salary === null
                              ? "—"
                              : Number(record.salary).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                          </td>
                          {(canEdit || canDelete) && (
                            <td>
                              <div className="job-history-row-actions">
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="employee-edit-button"
                                    onClick={() => openEditModal(record)}
                                  >
                                    Edit
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    className="employee-separate-button"
                                    onClick={() => {
                                      setDeleteError("");
                                      setRecordToDelete(record);
                                    }}
                                  >
                                    Delete
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
              Showing {history.length} job history record(s)
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
            className="customer-modal job-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-history-modal-title"
          >
            <div className="customer-modal-header">
              <h2 id="job-history-modal-title">
                {editingRecord ? "Edit Job History" : "Add Job History"}
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
              <p className="job-history-selected-employee">
                Employee: {selectedEmployeeInfo?.firstname} {selectedEmployeeInfo?.lastname}
                {" "}({selectedEmployee})
              </p>
              <div className="customer-form-group">
                <label htmlFor="history-effective-date">Effective Date</label>
                <input
                  id="history-effective-date"
                  name="effdate"
                  type="date"
                  value={form.effdate}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="customer-form-group">
                <label htmlFor="history-job">Job</label>
                <select
                  id="history-job"
                  name="jobcode"
                  value={form.jobcode}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                >
                  <option value="">Select job</option>
                  {jobs.map((job) => (
                    <option key={job.jobcode} value={job.jobcode}>
                      {job.jobdesc} ({job.jobcode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="customer-form-group">
                <label htmlFor="history-department">Department</label>
                <select
                  id="history-department"
                  name="deptcode"
                  value={form.deptcode}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.deptcode} value={department.deptcode}>
                      {department.deptname} ({department.deptcode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="customer-form-group">
                <label htmlFor="history-salary">Salary</label>
                <input
                  id="history-salary"
                  name="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                />
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
                    : editingRecord
                      ? "Save Changes"
                      : "Add Job History"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {recordToDelete && (
        <div
          className="customer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setRecordToDelete(null);
              setDeleteError("");
            }
          }}
        >
          <section
            className="customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-history-delete-title"
          >
            <div className="customer-modal-header">
              <h2 id="job-history-delete-title">Delete Job History</h2>
              <button
                type="button"
                className="customer-modal-close"
                onClick={() => {
                  if (!deleting) {
                    setRecordToDelete(null);
                    setDeleteError("");
                  }
                }}
                disabled={deleting}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {deleteError && (
              <div className="user-alert user-alert-error" role="alert">
                {deleteError}
              </div>
            )}
            <p>
              Delete the {recordToDelete.jobdesc} assignment effective{" "}
              {formatDate(recordToDelete.effdate)}? This cannot be undone.
              An employee&apos;s only job history record cannot be deleted.
            </p>
            <div className="customer-modal-actions">
              <button
                type="button"
                className="customer-cancel-button"
                onClick={() => {
                  if (!deleting) {
                    setRecordToDelete(null);
                    setDeleteError("");
                  }
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="employee-separate-button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default JobHistoryManagement;
