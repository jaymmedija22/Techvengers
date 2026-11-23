import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API_URL = "http://localhost:3000/api/jobs";
const EMPTY_FORM = { jobCode: "", jobDesc: "" };

function JobManagement() {
  const { user } = useAuth();
  const isSuperadmin = user?.role_name === "Superadmin";
  const canAdd = isSuperadmin || user?.permissions?.includes("jobs.add");
  const canEdit = isSuperadmin || user?.permissions?.includes("jobs.edit");
  const canDelete = isSuperadmin || user?.permissions?.includes("jobs.delete");

  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deletingCode, setDeletingCode] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("q", search.trim());

      const response = await fetch(
        `${API_URL}${query.toString() ? `?${query.toString()}` : ""}`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to retrieve jobs.");
      }

      setError("");
      setJobs(data.jobs || []);
    } catch (fetchError) {
      setJobs([]);
      setError(fetchError.message || "Unable to retrieve jobs.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function openAddModal() {
    setEditingJob(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setError("");
    setModalOpen(true);
  }

  function openEditModal(job) {
    setEditingJob(job);
    setForm({ jobCode: job.jobcode, jobDesc: job.jobdesc });
    setFormError("");
    setError("");
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

    const jobCode = form.jobCode.trim().toUpperCase();
    const jobDesc = form.jobDesc.trim();

    if (!jobCode || !jobDesc) {
      setFormError("Job Code and Job Description are required.");
      return;
    }

    if (!/^[A-Z0-9]{1,4}$/.test(jobCode)) {
      setFormError("Job Code must contain 1 to 4 letters or numbers.");
      return;
    }

    if ([...jobDesc].length > 20) {
      setFormError("Job Description cannot exceed 20 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingJob
          ? `${API_URL}/${encodeURIComponent(editingJob.jobcode)}`
          : API_URL,
        {
          method: editingJob ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobCode, jobDesc }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save job.");
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      setSuccess(data.message);
      setLoading(true);
      await fetchJobs();
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save job.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!jobToDelete) return;

    const { jobcode } = jobToDelete;
    setError("");
    setSuccess("");
    setDeletingCode(jobcode);

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(jobcode)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete job.");
      }

      setJobToDelete(null);
      setSuccess(data.message);
      setLoading(true);
      await fetchJobs();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete job.");
      setJobToDelete(null);
    } finally {
      setDeletingCode("");
    }
  }

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content">
          <div className="user-page-heading">
            <div>
              <h1>Job Management</h1>
              <p>View and maintain jobs available for employee assignments.</p>
            </div>
            <Link to="/home" className="user-add-button">
              Back to Dashboard
            </Link>
          </div>

          {success && (
            <div className="user-alert user-alert-success" role="status">
              {success}
            </div>
          )}
          {error && !jobToDelete && (
            <div className="user-alert user-alert-error" role="alert">
              {error}
            </div>
          )}

          <section className="user-table-card">
            <div className="user-table-heading">
              <div>
                <h2>Jobs</h2>
                <p>Job codes are fixed after creation to preserve employee history.</p>
              </div>
              <div className="customer-heading-actions">
                <span className="user-count">{jobs.length} jobs</span>
                {canAdd && (
                  <button
                    type="button"
                    className="user-add-button"
                    onClick={openAddModal}
                  >
                    + Add Job
                  </button>
                )}
              </div>
            </div>

            <div className="user-table-controls">
              <label className="user-search" htmlFor="job-search">
                <span aria-hidden="true">⌕</span>
                <input
                  id="job-search"
                  type="search"
                  placeholder="Search job code or description..."
                  value={search}
                  onChange={(event) => {
                    setLoading(true);
                    setError("");
                    setSearch(event.target.value);
                  }}
                />
              </label>
            </div>

            <div className="user-table-wrapper">
              <table className="user-management-table">
                <thead>
                  <tr>
                    <th>JOB CODE</th>
                    <th>JOB DESCRIPTION</th>
                    <th>ASSIGNMENTS</th>
                    <th>EMPLOYEES</th>
                    {(canEdit || canDelete) && <th>ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 5 : 4} className="user-empty-state">
                        Loading jobs...
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 5 : 4} className="user-empty-state">
                        No jobs found.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.jobcode}>
                        <td>{job.jobcode}</td>
                        <td>{job.jobdesc}</td>
                        <td>{job.assignment_count}</td>
                        <td>{job.employee_count}</td>
                        {(canEdit || canDelete) && (
                          <td>
                            <div className="job-row-actions">
                              {canEdit && (
                                <button
                                  type="button"
                                  className="customer-edit-button"
                                  onClick={() => openEditModal(job)}
                                  disabled={!!deletingCode}
                                >
                                  Edit
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="customer-delete-button"
                                  onClick={() => setJobToDelete(job)}
                                  disabled={!!deletingCode}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="user-table-footer">
              Showing {jobs.length} job(s)
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
            className="customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-modal-title"
          >
            <div className="customer-modal-header">
              <h2 id="job-modal-title">{editingJob ? "Edit Job" : "Add Job"}</h2>
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
              <div className="customer-form-group">
                <label htmlFor="job-code">Job Code</label>
                <input
                  id="job-code"
                  name="jobCode"
                  type="text"
                  maxLength={4}
                  pattern="[A-Za-z0-9]{1,4}"
                  value={form.jobCode}
                  onChange={handleFormChange}
                  placeholder="e.g. HRS"
                  required
                  disabled={!!editingJob || saving}
                />
              </div>
              <div className="customer-form-group">
                <label htmlFor="job-description">Job Description</label>
                <input
                  id="job-description"
                  name="jobDesc"
                  type="text"
                  maxLength={20}
                  value={form.jobDesc}
                  onChange={handleFormChange}
                  placeholder="Enter job description"
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
                  {saving ? "Saving..." : "Save Job"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {jobToDelete && (
        <div
          className="customer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingCode) {
              setJobToDelete(null);
            }
          }}
        >
          <section
            className="customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-delete-title"
          >
            <div className="customer-modal-header">
              <h2 id="job-delete-title">Delete Job</h2>
            </div>
            <p>
              Delete {jobToDelete.jobcode} — {jobToDelete.jobdesc}?
            </p>
            <p className="job-delete-warning">
              Jobs referenced by employee job history cannot be deleted.
            </p>
            {error && (
              <div className="user-alert user-alert-error" role="alert">
                {error}
              </div>
            )}
            <div className="customer-modal-actions">
              <button
                type="button"
                className="customer-cancel-button"
                onClick={() => setJobToDelete(null)}
                disabled={!!deletingCode}
              >
                Cancel
              </button>
              <button
                type="button"
                className="customer-delete-button"
                onClick={confirmDelete}
                disabled={!!deletingCode}
              >
                {deletingCode ? "Deleting..." : "Delete Job"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default JobManagement;
