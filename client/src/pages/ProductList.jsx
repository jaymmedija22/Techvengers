import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:3000/api/products";

function ProductList() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (search.trim()) params.set("q", search.trim());
        if (unit) params.set("unit", unit);

        const response = await fetch(
          `${API_URL}?${params.toString()}`,
          { credentials: "include" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to retrieve products.");
        }

        setProducts(data.products || []);
      } catch (err) {
        setProducts([]);
        setError(err.message || "Unable to retrieve products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [search, unit]);

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content">
          <div className="user-page-heading">
            <div>
              <h1>Product Management</h1>
              <p>View, search, and filter product records.</p>
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
                <h2>Product List</h2>
                <p>Active product records</p>
              </div>

              <span className="user-count">
                {products.length} products
              </span>
            </div>

            <div className="user-table-controls">
              <div className="user-search">
                <span>⌕</span>
                <input
                  type="text"
                  placeholder="Search product code or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="user-role-filter"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="">All Units</option>
                <option value="pc">pc</option>
                <option value="ea">ea</option>
                <option value="mtr">mtr</option>
                <option value="pkg">pkg</option>
                <option value="ltr">ltr</option>
              </select>
            </div>

            <div className="user-table-wrapper">
              <table className="user-management-table">
                <thead>
                  <tr>
                    <th>PRODUCT CODE</th>
                    <th>DESCRIPTION</th>
                    <th>UNIT</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="user-empty-state">
                        Loading products...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="user-empty-state">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.prodcode}>
                        <td>{product.prodcode}</td>
                        <td>{product.description || "—"}</td>
                        <td>
                          <span className="user-role-badge user">
                            {product.unit || "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="user-table-footer">
              Showing {products.length} active product(s)
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ProductList;