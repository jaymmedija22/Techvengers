
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:3000/api/products";

const INITIAL_FORM = {
  prodcode: "",
  description: "",
  unit: "pc",
};

function ProductList() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Product form states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch products
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

  useEffect(() => {
    fetchProducts();
  }, [search, unit]);

  // Open form for creating a product
  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData(INITIAL_FORM);
    setFormError("");
    setShowModal(true);
  };

  // Open form for editing a product
  const handleEditProduct = (product) => {
    setEditingProduct(product);

    setFormData({
      prodcode: product.prodcode,
      description: product.description || "",
      unit: product.unit || "pc",
    });

    setFormError("");
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingProduct(null);
    setFormData(INITIAL_FORM);
    setFormError("");
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create or update product
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");

    const prodcode = formData.prodcode.trim();
    const description = formData.description.trim();
    const unit = formData.unit;

    if (!editingProduct && !prodcode) {
      setFormError("Product Code is required.");
      return;
    }

    if (!editingProduct && prodcode.length > 6) {
      setFormError("Product Code must not exceed 6 characters.");
      return;
    }

    if (!unit) {
      setFormError("Please select a product unit.");
      return;
    }

    const isEditing = Boolean(editingProduct);

    const endpoint = isEditing
      ? `${API_URL}/${encodeURIComponent(editingProduct.prodcode)}`
      : API_URL;

    const payload = isEditing
      ? { description, unit }
      : { prodcode, description, unit };

    try {
      setSaving(true);

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save product.");
      }

      setShowModal(false);
      setEditingProduct(null);
      setFormData(INITIAL_FORM);
      setSuccess(data.message || "Product saved successfully.");

      await fetchProducts();
    } catch (err) {
      setFormError(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content">

          {/* PAGE HEADING */}
          <div className="user-page-heading">
            <div>
              <h1>Product Management</h1>
              <p>View, search, create, and edit product records.</p>
            </div>

            <div className="customer-heading-actions">
              <button
                type="button"
                className="user-add-button"
                onClick={handleAddProduct}
              >
                <span>+</span>
                Add Product
              </button>

              <Link to="/home" className="user-add-button">
                Back to Dashboard
              </Link>
            </div>
          </div>

          {/* SUCCESS MESSAGE */}
          {success && (
            <div className="user-alert user-alert-success">
              {success}
              <button
                type="button"
                onClick={() => setSuccess("")}
              >
                ×
              </button>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {error && (
            <div className="user-alert user-alert-error">
              {error}
            </div>
          )}

          {/* PRODUCT TABLE */}
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

            {/* SEARCH AND FILTER */}
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

            {/* TABLE */}
            <div className="user-table-wrapper">
              <table className="user-management-table">
                <thead>
                  <tr>
                    <th>PRODUCT CODE</th>
                    <th>DESCRIPTION</th>
                    <th>UNIT</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="user-empty-state">
                        Loading products...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="user-empty-state">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.prodcode}>
                        <td>{product.prodcode}</td>

                        <td>
                          {product.description || "—"}
                        </td>

                        <td>
                          <span className="user-role-badge user">
                            {product.unit || "—"}
                          </span>
                        </td>

                        <td>
                          <div className="user-action-buttons">
                            <button
                              type="button"
                              className="customer-edit-button"
                              onClick={() => handleEditProduct(product)}
                            >
                              Edit
                            </button>
                          </div>
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

      {/* CREATE / EDIT PRODUCT MODAL */}
      {showModal && (
        <div className="customer-modal-overlay">
          <div className="customer-modal">

            <div className="customer-modal-header">
              <h2>
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>

              <button
                type="button"
                className="customer-modal-close"
                onClick={handleCloseModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {formError && (
              <div className="user-alert user-alert-error">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* PRODUCT CODE */}
              <div className="customer-form-group">
                <label htmlFor="prodcode">
                  Product Code
                </label>

                <input
                  id="prodcode"
                  type="text"
                  name="prodcode"
                  placeholder="Enter product code"
                  value={formData.prodcode}
                  onChange={handleChange}
                  maxLength={6}
                  disabled={Boolean(editingProduct) || saving}
                  required
                />
              </div>

              {/* DESCRIPTION */}
              <div className="customer-form-group">
                <label htmlFor="description">
                  Description
                </label>

                <input
                  id="description"
                  type="text"
                  name="description"
                  placeholder="Enter product description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>

              {/* UNIT */}
              <div className="customer-form-group">
                <label htmlFor="unit">
                  Unit
                </label>

                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  disabled={saving}
                  required
                >
                  <option value="pc">pc</option>
                  <option value="ea">ea</option>
                  <option value="mtr">mtr</option>
                  <option value="pkg">pkg</option>
                  <option value="ltr">ltr</option>
                </select>
              </div>

              {/* FORM ACTIONS */}
              <div className="customer-modal-actions">
                <button
                  type="button"
                  className="customer-cancel-button"
                  onClick={handleCloseModal}
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
                    : editingProduct
                    ? "Update Product"
                    : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductList;
