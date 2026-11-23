import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API_URL = "http://localhost:3000/api/departments";
const EMPTY_FORM = { deptCode: "", deptName: "" };

function DepartmentManagement() {
  const { user } = useAuth();
  const isSuperadmin = user?.role_name === "Superadmin";
  const canAdd = isSuperadmin || user?.permissions?.includes("departments.add");
  const canEdit = isSuperadmin || user?.permissions?.includes("departments.edit");
  const canDelete =
    isSuperadmin || user?.permissions?.includes("departments.delete");

  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deletingCode, setDeletingCode] = useState("");

  const fetchDepartments = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("q", search.trim());

      const response = await fetch(
        `${API_URL}${query.toString() ? `?${query.toString()}` : ""}`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to retrieve departments.");
      }

      setError("");
      setDepartments(data.departments || []);
    } catch (fetchError) {
      setDepartments([]);
      setError(fetchError.message || "Unable to retrieve departments.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  function openAddModal() {
    setEditingDepartment(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setError("");
    setModalOpen(true);
  }

  function openEditModal(department) {
    setEditingDepartment(department);
    setForm({
      deptCode: department.deptcode,
      deptName: department.deptname,
    });
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

    const deptCode = form.deptCode.trim().toUpperCase();
    const deptName = form.deptName.trim();

    if (!deptCode || !deptName) {
      setFormError("Department Code and Department Name are required.");
      return;
    }

    if (!/^[A-Z0-9]{1,3}$/.test(deptCode)) {
      setFormError("Department Code must contain 1 to 3 letters or numbers.");
      return;
    }

    if ([...deptName].length > 20) {
      setFormError("Department Name cannot exceed 20 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingDepartment
          ? `${API_URL}/${encodeURIComponent(editingDepartment.deptcode)}`
          : API_URL,
        {
          method: editingDepartment ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deptCode, deptName }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save department.");
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      setSuccess(data.message);
      setLoading(true);
      await fetchDepartments();
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save department.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!departmentToDelete) return;

    const { deptcode } = departmentToDelete;
    setError("");
    setSuccess("");
    setDeletingCode(deptcode);

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(deptcode)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete department.");
      }

      setDepartmentToDelete(null);
      setSuccess(data.message);
      setLoading(true);
      await fetchDepartments();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete department.");
      setDepartmentToDelete(null);
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
              <h1>Department Management</h1>
              <p>View and maintain department records.</p>
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
          {error && !departmentToDelete && (
            <div className="user-alert user-alert-error" role="alert">
              {error}
            </div>
          )}

          <section className="user-table-card">
            <div className="user-table-heading">
              <div>
                <h2>Departments</h2>
                <p>Department codes are fixed after creation because other records may reference them.</p>
              </div>
              <div className="customer-heading-actions">
                <span className="user-count">
                  {departments.length} departments
                </span>
                {canAdd && (
                  <button
                    type="button"
                    className="user-add-button"
                    onClick={openAddModal}
                  >
                    + Add Department
                  </button>
                )}
              </div>
            </div>

            <div className="user-table-controls">
              <label className="user-search" htmlFor="department-search">
                <span aria-hidden="true">⌕</span>
                <input
                  id="department-search"
                  type="search"
                  placeholder="Search code or department name..."
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
                    <th>DEPARTMENT CODE</th>
                    <th>DEPARTMENT NAME</th>
                    <th>JOB HISTORY RECORDS</th>
                    {(canEdit || canDelete) && <th>ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 4 : 3} className="user-empty-state">
                        Loading departments...
                      </td>
                    </tr>
                  ) : departments.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 4 : 3} className="user-empty-state">
                        No departments found.
                      </td>
                    </tr>
                  ) : (
                    departments.map((department) => (
                      <tr key={department.deptcode}>
                        <td>{department.deptcode}</td>
                        <td>{department.deptname}</td>
                        <td>{department.job_history_count}</td>
                        {(canEdit || canDelete) && (
                          <td>
                            <div className="department-row-actions">
                              {canEdit && (
                                <button
                                  type="button"
                                  className="customer-edit-button"
                                  onClick={() => openEditModal(department)}
                                  disabled={!!deletingCode}
                                >
                                  Edit
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="customer-delete-button"
                                  onClick={() => setDepartmentToDelete(department)}
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
              Showing {departments.length} department(s)
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
            aria-labelledby="department-modal-title"
          >
            <div className="customer-modal-header">
              <h2 id="department-modal-title">
                {editingDepartment ? "Edit Department" : "Add Department"}
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
              <div className="customer-form-group">
                <label htmlFor="department-code">Department Code</label>
                <input
                  id="department-code"
                  name="deptCode"
                  type="text"
                  maxLength={3}
                  pattern="[A-Za-z0-9]{1,3}"
                  value={form.deptCode}
                  onChange={handleFormChange}
                  placeholder="e.g. HRD"
                  required
                  disabled={!!editingDepartment || saving}
                />
              </div>
              <div className="customer-form-group">
                <label htmlFor="department-name">Department Name</label>
                <input
                  id="department-name"
                  name="deptName"
                  type="text"
                  maxLength={20}
                  value={form.deptName}
                  onChange={handleFormChange}
                  placeholder="Enter department name"
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
                  {saving ? "Saving..." : "Save Department"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {departmentToDelete && (
        <div
          className="customer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingCode) {
              setDepartmentToDelete(null);
            }
          }}
        >
          <section
            className="customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-delete-title"
          >
            <div className="customer-modal-header">
              <h2 id="department-delete-title">Delete Department</h2>
            </div>
            <p>
              Delete {departmentToDelete.deptcode} — {departmentToDelete.deptname}?
            </p>
            <p className="department-delete-warning">
              Departments referenced by employee job history cannot be deleted.
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
                onClick={() => setDepartmentToDelete(null)}
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
                {deletingCode ? "Deleting..." : "Delete Department"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default DepartmentManagement;
