
import { useCallback, useEffect, useState } from "react";
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
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Product form states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Product delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Product restore confirmation states
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoringProduct, setRestoringProduct] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  // Fetch active or deleted products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = showDeleted
        ? `${API_URL}/deleted`
        : `${API_URL}?${new URLSearchParams({
            ...(search.trim() ? { q: search.trim() } : {}),
            ...(unit ? { unit } : {}),
          }).toString()}`;

      const response = await fetch(endpoint, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to retrieve products.");
      }

      let result = data.products || [];

      // Apply search and unit filtering to deleted products
      if (showDeleted) {
        if (search.trim()) {
          const term = search.trim().toLowerCase();

          result = result.filter(
            (product) =>
              product.prodcode.toLowerCase().includes(term) ||
              (product.description || "").toLowerCase().includes(term)
          );
        }

        if (unit) {
          result = result.filter((product) => product.unit === unit);
        }
      }

      setProducts(result);
    } catch (err) {
      setProducts([]);
      setError(err.message || "Unable to retrieve products.");
    } finally {
      setLoading(false);
    }
  }, [search, unit, showDeleted]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  // Close create/edit modal
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

  // Open delete confirmation modal
  const handleDeleteProduct = (product) => {
    setDeletingProduct(product);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  // Close delete confirmation modal
  const handleCloseDeleteModal = () => {
    if (deleting) return;

    setShowDeleteModal(false);
    setDeletingProduct(null);
    setDeleteError("");
  };

  // Confirm soft delete
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;

    try {
      setDeleting(true);
      setDeleteError("");
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(deletingProduct.prodcode)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete product.");
      }

      setShowDeleteModal(false);
      setDeletingProduct(null);
      setSuccess(data.message || "Product deleted successfully.");

      await fetchProducts();
    } catch (err) {
      setDeleteError(err.message || "Unable to delete product.");
    } finally {
      setDeleting(false);
    }
  };

  // Open restore confirmation modal
  const handleRestoreProduct = (product) => {
    setRestoringProduct(product);
    setRestoreError("");
    setShowRestoreModal(true);
  };

  // Close restore confirmation modal
  const handleCloseRestoreModal = () => {
    if (restoring) return;

    setShowRestoreModal(false);
    setRestoringProduct(null);
    setRestoreError("");
  };

  // Confirm product restoration
  const handleConfirmRestore = async () => {
    if (!restoringProduct) return;

    try {
      setRestoring(true);
      setRestoreError("");
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(restoringProduct.prodcode)}/restore`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to restore product.");
      }

      setShowRestoreModal(false);
      setRestoringProduct(null);
      setSuccess(data.message || "Product restored successfully.");

      await fetchProducts();
    } catch (err) {
      setRestoreError(err.message || "Unable to restore product.");
    } finally {
      setRestoring(false);
    }
  };

  // Switch between active and deleted products
  const handleViewChange = (deleted) => {
    setShowDeleted(deleted);
    setSearch("");
    setUnit("");
    setError("");
    setSuccess("");
  };

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content user-management-content">

          {/* PAGE HEADING */}
          <div className="user-page-heading">
            <div>
              <h1>Product Management</h1>
              <p>
                View, search, create, edit, delete, and restore products.
              </p>
            </div>

            <div className="customer-heading-actions">
              {!showDeleted && (
                <button
                  type="button"
                  className="user-add-button"
                  onClick={handleAddProduct}
                >
                  <span>+</span>
                  Add Product
                </button>
              )}

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
                <h2>
                  {showDeleted ? "Deleted Products" : "Product List"}
                </h2>
                <p>
                  {showDeleted
                    ? "Products that have been soft-deleted"
                    : "Active product records"}
                </p>
              </div>

              <span className="user-count">
                {products.length} products
              </span>
            </div>

            {/* ACTIVE / DELETED VIEW BUTTONS */}
            <div className="customer-heading-actions">
              <button
                type="button"
                className="user-add-button"
                onClick={() => handleViewChange(false)}
                disabled={!showDeleted}
              >
                Active Products
              </button>

              <button
                type="button"
                className="user-add-button"
                onClick={() => handleViewChange(true)}
                disabled={showDeleted}
              >
                Deleted Products
              </button>
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
                        {showDeleted
                          ? "No deleted products found."
                          : "No products found."}
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

                        <td>
                          <div className="user-action-buttons">
                            {showDeleted ? (
                              <button
                                type="button"
                                className="product-restore-button"
                                onClick={() =>
                                  handleRestoreProduct(product)
                                }
                              >
                                Restore
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="customer-edit-button"
                                  onClick={() =>
                                    handleEditProduct(product)
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="product-delete-button"
                                  onClick={() =>
                                    handleDeleteProduct(product)
                                  }
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="user-table-footer">
              Showing {products.length}{" "}
              {showDeleted ? "deleted" : "active"} product(s)
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
              <div className="customer-form-group">
                <label htmlFor="prodcode">Product Code</label>

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

              <div className="customer-form-group">
                <label htmlFor="description">Description</label>

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

              <div className="customer-form-group">
                <label htmlFor="unit">Unit</label>

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

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {showDeleteModal && deletingProduct && (
        <div className="product-delete-overlay">
          <div
            className="product-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
          >
            <div className="product-delete-icon">
              !
            </div>

            <h2 id="delete-product-title">
              Delete Product?
            </h2>

            <p className="product-delete-description">
              Are you sure you want to move this product to deleted records?
            </p>

            <div className="product-delete-details">
              <div>
                <span>Product Code</span>
                <strong>{deletingProduct.prodcode}</strong>
              </div>

              <div>
                <span>Product Name</span>
                <strong>
                  {deletingProduct.description || "—"}
                </strong>
              </div>
            </div>

            <div className="product-delete-warning">
              This product will no longer appear in the active product list.
              You can restore the record later.
            </div>

            {deleteError && (
              <div className="user-alert user-alert-error">
                {deleteError}
              </div>
            )}

            <div className="product-delete-actions">
              <button
                type="button"
                className="product-delete-cancel"
                onClick={handleCloseDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="product-delete-confirm"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE PRODUCT CONFIRMATION MODAL */}
      {showRestoreModal && restoringProduct && (
        <div className="product-restore-overlay">
          <div
            className="product-restore-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-product-title"
          >
            <div className="product-restore-icon">
              ✓
            </div>

            <h2 id="restore-product-title">
              Restore Product?
            </h2>

            <p className="product-restore-description">
              Are you sure you want to restore this product to the active product list?
            </p>

            <div className="product-restore-details">
              <div>
                <span>Product Code</span>
                <strong>{restoringProduct.prodcode}</strong>
              </div>

              <div>
                <span>Product Name</span>
                <strong>
                  {restoringProduct.description || "—"}
                </strong>
              </div>
            </div>

            <div className="product-restore-warning">
              This product will become available again in the active product list.
              You can manage and edit the record after restoring it.
            </div>

            {restoreError && (
              <div className="user-alert user-alert-error">
                {restoreError}
              </div>
            )}

            <div className="product-restore-actions">
              <button
                type="button"
                className="product-restore-cancel"
                onClick={handleCloseRestoreModal}
                disabled={restoring}
              >
                Cancel
              </button>

              <button
                type="button"
                className="product-restore-confirm"
                onClick={handleConfirmRestore}
                disabled={restoring}
              >
                {restoring ? "Restoring..." : "Yes, Restore Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductList;
