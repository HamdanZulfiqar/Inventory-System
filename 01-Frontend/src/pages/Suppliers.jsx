import React, { useState, useEffect } from 'react';
import { Truck, Plus, Mail, Phone, MapPin, Search, AlertCircle, CheckCircle2, Package } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { getSuppliers, addSupplier } from '../services/supplierService';
import { getProducts } from '../services/productService';
import { formatDate } from '../utils/formatters';

export const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { isInventoryStaff } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [supList, prodList] = await Promise.all([
        getSuppliers(),
        getProducts(true),
      ]);
      setSuppliers(supList);
      setProducts(prodList);
    } catch (err) {
      console.error(err);
      showToast('Error loading suppliers list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Supplier organization name is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await addSupplier(formData);
      showToast(`Supplier "${formData.name}" added successfully.`);
      setFormData({ name: '', email: '', phone: '', address: '' });
      setFormOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to add supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  // Group products by supplier
  const productCountBySupplier = products.reduce((acc, p) => {
    if (p.supplierId) {
      acc[p.supplierId] = (acc[p.supplierId] || 0) + 1;
    }
    return acc;
  }, {});

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification && (
        <div className={`p-4 rounded-xl border shadow-md flex items-center justify-between text-xs font-semibold ${
          notification.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 ml-4">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Supplier Directory & Contacts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Maintain authorized wholesale suppliers and their affiliated catalogue products.
          </p>
        </div>

        {isInventoryStaff && (
          <button
            onClick={() => setFormOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search suppliers by name, email, location..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving verified supplier network..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((supplier) => {
            const suppliedItemsCount = productCountBySupplier[supplier.id] || 0;

            return (
              <div 
                key={supplier.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                      <Truck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                      <Package className="w-3 h-3 text-slate-500" />
                      {suppliedItemsCount} products
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">{supplier.name}</h3>
                  
                  <div className="space-y-1.5 text-xs text-slate-600 mt-3">
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-2 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{supplier.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Registered: {formatDate(supplier.createdAt)}</span>
                  <span className="font-mono">{supplier.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Supplier Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Trade Supplier</h3>
            <p className="text-xs text-slate-500 mb-4">Enter vendor details to associate with products and purchase orders.</p>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Wholesale Supplies"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="orders@supplier.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical / Warehouse Address</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Warehouse address, Suite, City..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
