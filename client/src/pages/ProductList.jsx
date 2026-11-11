
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API_URL = "http://localhost:3000/api/products";

const INITIAL_FORM = {
  prodcode: "",
  description: "",
  unit: "pc",
};

const INITIAL_PRICE_FORM = {
  effdate: "",
  unitprice: "",
};

function ProductList() {
  const { user } = useAuth();

  // Check the user's role and assigned permissions.
  const isSuperadmin = user?.role_name === "Superadmin";

  const canAddProduct =
    isSuperadmin || user?.permissions?.includes("products.add");

  const canEditProduct =
    isSuperadmin || user?.permissions?.includes("products.edit");

  const canDeleteProduct =
    isSuperadmin || user?.permissions?.includes("products.delete");

  const canRestoreProduct =
    isSuperadmin || user?.permissions?.includes("products.restore");

  const canAddPrice =
    isSuperadmin || user?.permissions?.includes("prices.add");

  const canEditPrice =
    isSuperadmin || user?.permissions?.includes("prices.edit");

  const canDeletePrice =
    isSuperadmin || user?.permissions?.includes("prices.delete");

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

  // Product delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Product restore states
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoringProduct, setRestoringProduct] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  // Price history states
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [selectedPriceProduct, setSelectedPriceProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceHistoryFilter, setPriceHistoryFilter] = useState("active");
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [priceHistoryError, setPriceHistoryError] = useState("");

  // Add / edit price states
  const [showPriceFormModal, setShowPriceFormModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceFormData, setPriceFormData] = useState(INITIAL_PRICE_FORM);
  const [priceFormError, setPriceFormError] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  // Delete price states
  const [showDeletePriceModal, setShowDeletePriceModal] = useState(false);
  const [deletingPrice, setDeletingPrice] = useState(null);
  const [deletingPriceLoading, setDeletingPriceLoading] = useState(false);
  const [deletePriceError, setDeletePriceError] = useState("");

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

  // Fetch price history
  const fetchPriceHistory = useCallback(
    async (product, filter = priceHistoryFilter) => {
      if (!product) return;

      setPriceHistoryLoading(true);
      setPriceHistoryError("");

      try {
        const endpoint =
          `${API_URL}/${encodeURIComponent(product.prodcode)}/prices` +
          `?status=${encodeURIComponent(filter)}`;

        const response = await fetch(endpoint, {
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to retrieve price history."
          );
        }

        setPriceHistory(data.prices || []);
      } catch (err) {
        setPriceHistory([]);
        setPriceHistoryError(
          err.message || "Unable to retrieve price history."
        );
      } finally {
        setPriceHistoryLoading(false);
      }
    },
    [priceHistoryFilter]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Open form for creating a product
  const handleAddProduct = () => {
    if (!canAddProduct) return;

    setEditingProduct(null);
    setFormData(INITIAL_FORM);
    setFormError("");
    setShowModal(true);
  };

  // Open form for editing a product
  const handleEditProduct = (product) => {
    if (!canEditProduct) return;

    setEditingProduct(product);

    setFormData({
      prodcode: product.prodcode,
      description: product.description || "",
      unit: product.unit || "pc",
    });

    setFormError("");
    setShowModal(true);
  };

  // Close create/edit product modal
  const handleCloseModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingProduct(null);
    setFormData(INITIAL_FORM);
    setFormError("");
  };

  // Handle product form changes
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

    const isEditing = Boolean(editingProduct);

    if (isEditing ? !canEditProduct : !canAddProduct) {
      setFormError("You do not have permission to perform this action.");
      return;
    }

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

  // Open delete product confirmation
  const handleDeleteProduct = (product) => {
    if (!canDeleteProduct) return;

    setDeletingProduct(product);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  // Close delete product confirmation
  const handleCloseDeleteModal = () => {
    if (deleting) return;

    setShowDeleteModal(false);
    setDeletingProduct(null);
    setDeleteError("");
  };

  // Confirm product deletion
  const handleConfirmDelete = async () => {
    if (!canDeleteProduct || !deletingProduct) return;

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

  // Open restore product confirmation
  const handleRestoreProduct = (product) => {
    if (!canRestoreProduct) return;

    setRestoringProduct(product);
    setRestoreError("");
    setShowRestoreModal(true);
  };

  // Close restore product confirmation
  const handleCloseRestoreModal = () => {
    if (restoring) return;

    setShowRestoreModal(false);
    setRestoringProduct(null);
    setRestoreError("");
  };

  // Confirm product restoration
  const handleConfirmRestore = async () => {
    if (!canRestoreProduct || !restoringProduct) return;

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

  // Open price history modal
  const handleOpenPriceHistory = (product) => {
    setSelectedPriceProduct(product);
    setPriceHistoryFilter("active");
    setShowPriceHistoryModal(true);
    setPriceHistory([]);
    setPriceHistoryError("");

    fetchPriceHistory(product, "active");
  };

  // Close price history modal
  const handleClosePriceHistory = () => {
    if (savingPrice || deletingPriceLoading) return;

    setShowPriceHistoryModal(false);
    setShowPriceFormModal(false);
    setShowDeletePriceModal(false);
    setSelectedPriceProduct(null);
    setPriceHistory([]);
    setPriceHistoryError("");
    setEditingPrice(null);
  };

  // Change price history filter
  const handlePriceHistoryFilter = (filter) => {
    setPriceHistoryFilter(filter);

    if (selectedPriceProduct) {
      fetchPriceHistory(selectedPriceProduct, filter);
    }
  };

  // Open add price form
  const handleAddPrice = () => {
    if (!canAddPrice) return;

    setEditingPrice(null);
    setPriceFormData(INITIAL_PRICE_FORM);
    setPriceFormError("");
    setShowPriceFormModal(true);
  };

  // Open edit price form
  const handleEditPrice = (price) => {
    if (!canEditPrice) return;

    setEditingPrice(price);

    setPriceFormData({
      effdate: price.effdate.slice(0, 10),
      unitprice: String(price.unitprice),
    });

    setPriceFormError("");
    setShowPriceFormModal(true);
  };

  // Close add/edit price form
  const handleClosePriceForm = () => {
    if (savingPrice) return;

    setShowPriceFormModal(false);
    setEditingPrice(null);
    setPriceFormData(INITIAL_PRICE_FORM);
    setPriceFormError("");
  };

  // Handle price form changes
  const handlePriceFormChange = (e) => {
    const { name, value } = e.target;

    setPriceFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Add or update price
  const handlePriceSubmit = async (e) => {
    e.preventDefault();

    setPriceFormError("");

    if (!selectedPriceProduct) return;

    const isEditing = Boolean(editingPrice);

    if (isEditing ? !canEditPrice : !canAddPrice) {
      setPriceFormError("You do not have permission to perform this action.");
      return;
    }

    const effdate = priceFormData.effdate;
    const unitprice = priceFormData.unitprice.trim();

    if (!effdate) {
      setPriceFormError("Effective date is required.");
      return;
    }

    if (!unitprice || !/^\d+(\.\d{1,2})?$/.test(unitprice)) {
      setPriceFormError(
        "Enter a valid price with up to 2 decimal places."
      );
      return;
    }

    if (Number(unitprice) <= 0) {
      setPriceFormError("Unit price must be greater than zero.");
      return;
    }

    const endpoint = isEditing
      ? `${API_URL}/${encodeURIComponent(selectedPriceProduct.prodcode)}/prices/${encodeURIComponent(editingPrice.effdate.slice(0, 10))}`
      : `${API_URL}/${encodeURIComponent(selectedPriceProduct.prodcode)}/prices`;

    try {
      setSavingPrice(true);

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          effdate,
          unitprice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save price.");
      }

      setShowPriceFormModal(false);
      setEditingPrice(null);
      setPriceFormData(INITIAL_PRICE_FORM);
      setSuccess(data.message || "Price saved successfully.");

      await fetchPriceHistory(selectedPriceProduct, priceHistoryFilter);
    } catch (err) {
      setPriceFormError(err.message || "Unable to save price.");
    } finally {
      setSavingPrice(false);
    }
  };

  // Open delete price confirmation
  const handleDeletePrice = (price) => {
    if (!canDeletePrice) return;

    setDeletingPrice(price);
    setDeletePriceError("");
    setShowDeletePriceModal(true);
  };

  // Close delete price confirmation
  const handleCloseDeletePriceModal = () => {
    if (deletingPriceLoading) return;

    setShowDeletePriceModal(false);
    setDeletingPrice(null);
    setDeletePriceError("");
  };

  // Confirm price deletion
  const handleConfirmDeletePrice = async () => {
    if (!canDeletePrice || !selectedPriceProduct || !deletingPrice) return;

    try {
      setDeletingPriceLoading(true);
      setDeletePriceError("");

      const endpoint =
        `${API_URL}/${encodeURIComponent(selectedPriceProduct.prodcode)}` +
        `/prices/${encodeURIComponent(deletingPrice.effdate.slice(0, 10))}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete price.");
      }

      setShowDeletePriceModal(false);
      setDeletingPrice(null);
      setSuccess(data.message || "Price deleted successfully.");

      await fetchPriceHistory(selectedPriceProduct, priceHistoryFilter);
    } catch (err) {
      setDeletePriceError(err.message || "Unable to delete price.");
    } finally {
      setDeletingPriceLoading(false);
    }
  };

  // Format effective date
  const formatEffectiveDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(`${String(date).slice(0, 10)}T00:00:00`);

    return Number.isNaN(parsedDate.getTime())
      ? "—"
      : parsedDate.toLocaleDateString();
  };

  // Format audit timestamp
  const formatStamp = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? "—"
      : parsedDate.toLocaleString();
  };

  // Switch active / deleted product views
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
              {!showDeleted && canAddProduct && (
                <button
                  type="button"
                  className="price-history-add-button"
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

            {/* PRODUCT TABLE */}
            <div className="user-table-wrapper">
              <table className="user-management-table">
                <thead>
                  <tr>
                    <th>PRODUCT CODE</th>
                    <th>DESCRIPTION</th>
                    <th>UNIT</th>
                    {!showDeleted && <th>CURRENT PRICE</th>}
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={showDeleted ? 4 : 5} className="user-empty-state">
                        Loading products...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={showDeleted ? 4 : 5} className="user-empty-state">
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

                        {!showDeleted && (
                          <td>
                            {product.current_price == null
                              ? "No price set"
                              : `₱${Number(product.current_price).toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`}
                          </td>
                        )}

                        <td>
                          <div className="user-action-buttons">
                            {showDeleted ? (
                              canRestoreProduct && (
                                <button
                                  type="button"
                                  className="product-restore-button"
                                  onClick={() =>
                                    handleRestoreProduct(product)
                                  }
                                >
                                  Restore
                                </button>
                              )
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="price-history-button"
                                  onClick={() =>
                                    handleOpenPriceHistory(product)
                                  }
                                >
                                  Price History
                                </button>

                                {canEditProduct && (
                                  <button
                                    type="button"
                                    className="price-history-edit-button"
                                    onClick={() =>
                                      handleEditProduct(product)
                                    }
                                  >
                                    Edit
                                  </button>
                                )}

                                {canDeleteProduct && (
                                  <button
                                    type="button"
                                    className="price-history-delete-button"
                                    onClick={() =>
                                      handleDeleteProduct(product)
                                    }
                                  >
                                    Delete
                                  </button>
                                )}
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
            <div className="price-history-modal-header">
              <h2>
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>

              <button
                type="button"
                className="price-history-close"
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
                  disabled={
                    saving ||
                    (editingProduct ? !canEditProduct : !canAddProduct)
                  }
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

      {/* PRICE HISTORY MODAL */}
      {showPriceHistoryModal && selectedPriceProduct && (
        <div className="customer-modal-overlay price-history-overlay">
          <div className="price-history-modal">
            <div className="customer-modal-header">
              <div>
                <h2>
                  Price History — {selectedPriceProduct.prodcode}
                </h2>
                <p>
                  {selectedPriceProduct.description || "No description"}{" "}
                  ({selectedPriceProduct.unit || "—"})
                </p>
              </div>

              <button
                type="button"
                className="customer-modal-close"
                onClick={handleClosePriceHistory}
                disabled={savingPrice || deletingPriceLoading}
              >
                ×
              </button>
            </div>

            <div className="price-history-toolbar">
              <div className="price-history-filters">
                {["active", "inactive", "all"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={
                      priceHistoryFilter === filter
                        ? "price-filter-button active"
                        : "price-filter-button"
                    }
                    onClick={() => handlePriceHistoryFilter(filter)}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              {canAddPrice && (
                <button
                  type="button"
                  className="price-history-add-button"
                  onClick={handleAddPrice}
                >
                  + Add Price
                </button>
              )}
            </div>

            {priceHistoryError && (
              <div className="user-alert user-alert-error">
                {priceHistoryError}
              </div>
            )}

            <div className="price-history-table-wrapper">
              <table className="user-management-table price-history-table">
                <thead>
                  <tr>
                    <th>EFFECTIVE DATE</th>
                    <th>UNIT PRICE</th>
                    <th>STATUS</th>
                    <th>STAMP</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {priceHistoryLoading ? (
                    <tr>
                      <td colSpan="5" className="user-empty-state">
                        Loading price history...
                      </td>
                    </tr>
                  ) : priceHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="user-empty-state">
                        No price history records found.
                      </td>
                    </tr>
                  ) : (
                    priceHistory.map((price) => (
                      <tr key={`${price.effdate}-${price.prodcode}`}>
                        <td>{formatEffectiveDate(price.effdate)}</td>

                        <td>
                          {Number(price.unitprice).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              price.is_deleted
                                ? "price-status inactive"
                                : "price-status active"
                            }
                          >
                            {price.is_deleted ? "Inactive" : "Active"}
                          </span>
                        </td>

                        <td className="price-history-stamp">
                          <div>
                            <strong>
                              {price.updated_at ? "UPDATED" : "CREATED"}
                            </strong>
                          </div>
                          <div>
                            {price.updated_at
                              ? price.updated_by_name || "System"
                              : price.created_by_name || "System"}
                          </div>
                          <small>
                            {formatStamp(
                              price.updated_at || price.created_at
                            )}
                          </small>
                        </td>

                        <td>
                          <div className="user-action-buttons">
                            {!price.is_deleted && (
                              <>
                                {canEditPrice && (
                                  <button
                                    type="button"
                                    className="price-history-edit-button"
                                    onClick={() => handleEditPrice(price)}
                                  >
                                    Edit
                                  </button>
                                )}

                                {canDeletePrice && (
                                  <button
                                    type="button"
                                    className="price-history-delete-button"
                                    onClick={() => handleDeletePrice(price)}
                                  >
                                    Delete
                                  </button>
                                )}
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

            <div className="customer-modal-actions">
              <button
                type="button"
                className="customer-cancel-button"
                onClick={handleClosePriceHistory}
                disabled={savingPrice || deletingPriceLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRICE MODAL */}
      {showPriceFormModal && (
        <div className="customer-modal-overlay price-form-overlay">
          <div className="customer-modal">
            <div className="price-history-modal-header">
              <h2>{editingPrice ? "Edit Price" : "Add Price"}</h2>

              <button
                type="button"
                className="price-history-close"
                onClick={handleClosePriceForm}
                disabled={savingPrice}
              >
                ×
              </button>
            </div>

            {priceFormError && (
              <div className="user-alert user-alert-error">
                {priceFormError}
              </div>
            )}

            <form onSubmit={handlePriceSubmit}>
              <div className="customer-form-group">
                <label htmlFor="effdate">Effective Date</label>
                <input
                  id="effdate"
                  type="date"
                  name="effdate"
                  value={priceFormData.effdate}
                  onChange={handlePriceFormChange}
                  disabled={savingPrice}
                  required
                />
              </div>

              <div className="customer-form-group">
                <label htmlFor="unitprice">Unit Price</label>
                <input
                  id="unitprice"
                  type="number"
                  name="unitprice"
                  placeholder="Enter unit price"
                  min="0.01"
                  step="0.01"
                  value={priceFormData.unitprice}
                  onChange={handlePriceFormChange}
                  disabled={savingPrice}
                  required
                />
              </div>

              <div className="customer-modal-actions">
                <button
                  type="button"
                  className="customer-cancel-button"
                  onClick={handleClosePriceForm}
                  disabled={savingPrice}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="customer-save-button"
                  disabled={
                    savingPrice ||
                    (editingPrice ? !canEditPrice : !canAddPrice)
                  }
                >
                  {savingPrice
                    ? "Saving..."
                    : editingPrice
                    ? "Update Price"
                    : "Save Price"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PRICE CONFIRMATION MODAL */}
      {showDeletePriceModal && deletingPrice && (
        <div className="product-delete-overlay">
          <div
            className="product-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-price-title"
          >
            <div className="product-delete-icon">!</div>

            <h2 id="delete-price-title">Delete Price?</h2>

            <p className="product-delete-description">
              Are you sure you want to mark this price record as inactive?
            </p>

            <div className="product-delete-details">
              <div>
                <span>Effective Date</span>
                <strong>
                  {formatEffectiveDate(deletingPrice.effdate)}
                </strong>
              </div>

              <div>
                <span>Unit Price</span>
                <strong>
                  {Number(deletingPrice.unitprice).toFixed(2)}
                </strong>
              </div>
            </div>

            {deletePriceError && (
              <div className="user-alert user-alert-error">
                {deletePriceError}
              </div>
            )}

            <div className="product-delete-actions">
              <button
                type="button"
                className="product-delete-cancel"
                onClick={handleCloseDeletePriceModal}
                disabled={deletingPriceLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="product-delete-confirm"
                onClick={handleConfirmDeletePrice}
                disabled={deletingPriceLoading || !canDeletePrice}
              >
                {deletingPriceLoading
                  ? "Deleting..."
                  : "Yes, Delete Price"}
              </button>
            </div>
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
            <div className="product-delete-icon">!</div>

            <h2 id="delete-product-title">Delete Product?</h2>

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
                <strong>{deletingProduct.description || "—"}</strong>
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
                disabled={deleting || !canDeleteProduct}
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
            <div className="product-restore-icon">✓</div>

            <h2 id="restore-product-title">Restore Product?</h2>

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
                <strong>{restoringProduct.description || "—"}</strong>
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
                disabled={restoring || !canRestoreProduct}
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
