
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:3000/api/customers";

const EMPTY_FORM = {
  custno: "",
  custname: "",
  address: "",
  payterm: "",
};

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [payterm, setPayterm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  async function fetchCustomers() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("q", search.trim());
      if (payterm) params.set("payterm", payterm);

      const response = await fetch(
        `${API_URL}?${params.toString()}`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to retrieve customers.");
      }

      setCustomers(data.customers || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, [search, payterm]);

  function openAddModal() {
    setEditingCustomer(false);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(customer) {
    setEditingCustomer(true);
    setForm({
      custno: customer.custno || "",
      custname: customer.custname || "",
      address: customer.address || "",
      payterm: customer.payterm || "",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setForm(EMPTY_FORM);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.custno.trim() || !form.custname.trim()) {
      setError("Customer No. and Customer Name are required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingCustomer
          ? `${API_URL}/${encodeURIComponent(form.custno)}`
          : API_URL,
        {
          method: editingCustomer ? "PUT" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save customer.");
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      setSuccess(
        editingCustomer
          ? "Customer updated successfully."
          : "Customer created successfully."
      );

      await fetchCustomers();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content">
          <div className="user-page-heading">
            <div>
              <h1>Customer Management</h1>
              <p>View, search, and manage customer records.</p>
            </div>

            <Link to="/home" className="user-add-button">
              Back to Dashboard
            </Link>
          </div>

          {success && (
            <div className="user-alert user-alert-success">
              {success}
            </div>
          )}

          {error && !modalOpen && (
            <div className="user-alert user-alert-error">
              {error}
            </div>
          )}

          <section className="user-table-card">
            <div className="user-table-heading">
              <div>
                <h2>Customer List</h2>
                <p>Active customer records</p>
              </div>

              <div className="customer-heading-actions">
                <span className="user-count">
                  {customers.length} customers
                </span>

                <button
                  type="button"
                  className="user-add-button"
                  onClick={openAddModal}
                >
                  + Add Customer
                </button>
              </div>
            </div>

            <div className="user-table-controls">
              <div className="user-search">
                <span>⌕</span>
                <input
                  type="text"
                  placeholder="Search customer number, name, or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="user-role-filter"
                value={payterm}
                onChange={(e) => setPayterm(e.target.value)}
              >
                <option value="">All Payment Terms</option>
                <option value="COD">COD</option>
                <option value="30D">30 Days</option>
                <option value="45D">45 Days</option>
              </select>
            </div>

            <div className="user-table-wrapper">
              <table className="user-management-table">
                <thead>
                  <tr>
                    <th>CUSTOMER NO.</th>
                    <th>CUSTOMER NAME</th>
                    <th>ADDRESS</th>
                    <th>PAYMENT TERMS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="user-empty-state">
                        Loading customers...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="user-empty-state">
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.custno}>
                        <td>{customer.custno}</td>
                        <td>{customer.custname || "—"}</td>
                        <td>{customer.address || "—"}</td>
                        <td>
                          <span className="user-role-badge user">
                            {customer.payterm || "—"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="customer-edit-button"
                            onClick={() => openEditModal(customer)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="user-table-footer">
              Showing {customers.length} customer(s)
            </div>
          </section>
        </div>
      </main>

      {modalOpen && (
        <div
          className="customer-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <section
            className="customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
          >
            <div className="customer-modal-header">
              <h2 id="customer-modal-title">
                {editingCustomer ? "Edit Customer" : "Add Customer"}
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
              {error && (
                <div className="user-alert user-alert-error">
                  {error}
                </div>
              )}

              <div className="customer-form-group">
                <label htmlFor="custno">Customer No.</label>
                <input
                  id="custno"
                  name="custno"
                  type="text"
                  maxLength="5"
                  value={form.custno}
                  onChange={handleFormChange}
                  placeholder="Enter customer number"
                  required
                  disabled={editingCustomer || saving}
                />
              </div>

              <div className="customer-form-group">
                <label htmlFor="custname">Customer Name</label>
                <input
                  id="custname"
                  name="custname"
                  type="text"
                  maxLength="20"
                  value={form.custname}
                  onChange={handleFormChange}
                  placeholder="Enter customer name"
                  required
                  disabled={saving}
                />
              </div>

              <div className="customer-form-group">
                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  maxLength="50"
                  value={form.address}
                  onChange={handleFormChange}
                  placeholder="Enter customer address"
                  disabled={saving}
                />
              </div>

              <div className="customer-form-group">
                <label htmlFor="payterm">Payment Terms</label>
                <select
                  id="payterm"
                  name="payterm"
                  value={form.payterm}
                  onChange={handleFormChange}
                  disabled={saving}
                >
                  <option value="">Select Payment Terms</option>
                  <option value="COD">COD</option>
                  <option value="30D">30 Days</option>
                  <option value="45D">45 Days</option>
                </select>
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
                    : editingCustomer
                    ? "Update Customer"
                    : "Save Customer"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default CustomerList;
