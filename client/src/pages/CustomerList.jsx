
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:3000/api/customers";

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [payterm, setPayterm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

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

        if (active) setCustomers(data.customers || []);
      } catch (err) {
        if (active) {
          setError(err.message || "Something went wrong.");
          setCustomers([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchCustomers();

    return () => {
      active = false;
    };
  }, [search, payterm]);

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content">
          <div className="user-page-heading">
            <div>
              <h1>Customer Management</h1>
              <p>View, search, and filter customer records.</p>
            </div>

            <Link to="/home" className="user-add-button">
              Back to Dashboard
            </Link>
          </div>

          {error && (
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

              <span className="user-count">
                {customers.length} customers
              </span>
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
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="user-empty-state">
                        Loading customers...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="user-empty-state">
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
    </div>
  );
}

export default CustomerList;
