import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sliders, 
  Clock, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productService';
import { 
  receiveStock, 
  adjustStock, 
  getStockMovements 
} from '../services/inventoryService';
import { formatDateTime, getStockStatus } from '../utils/formatters';

export const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements'
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  // Stock-In Modal
  const [stockInProduct, setStockInProduct] = useState(null);
  const [stockInQty, setStockInQty] = useState('');
  const [stockInRef, setStockInRef] = useState('');
  const [stockInNotes, setStockInNotes] = useState('');

  // Adjustment Modal
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Stock Count Audit');

  const { isInventoryStaff, userProfile } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodList, movList] = await Promise.all([
        getProducts(false), // active items
        getStockMovements(50),
      ]);
      setProducts(prodList);
      setMovements(movList);
    } catch (err) {
      console.error(err);
      showToast('Error loading inventory records.', 'error');
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

  const handleStockInSubmit = async (e) => {
    e.preventDefault();
    if (!stockInProduct) return;

    try {
      await receiveStock({
        productId: stockInProduct.id,
        quantity: stockInQty,
        referenceId: stockInRef || 'PO-RESTOCK',
        notes: stockInNotes,
        userId: userProfile?.name || 'Staff',
      });
      showToast(`Successfully received ${stockInQty} units into inventory.`);
      setStockInProduct(null);
      setStockInQty('');
      setStockInRef('');
      setStockInNotes('');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to receive stock.', 'error');
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustProduct) return;

    try {
      await adjustStock({
        productId: adjustProduct.id,
        newQuantity: adjustQty,
        reason: adjustReason,
        userId: userProfile?.name || 'Staff',
      });
      showToast(`Stock quantity for "${adjustProduct.name}" adjusted to ${adjustQty}.`);
      setAdjustProduct(null);
      setAdjustQty('');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to adjust stock.', 'error');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Inventory & Stock Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Process stock receipts, balance audit discrepancies, and monitor movement ledger.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'stock' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Levels & Actions
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'movements' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movement Audit Trail ({movements.length})
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving stock quantities and transaction logs..." />
      ) : activeTab === 'stock' ? (
        /* Stock Levels Tab */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inventory items..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {filteredProducts.length} items listed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">Current Quantity</th>
                  <th className="px-4 py-3 text-center">Reorder Threshold</th>
                  <th className="px-4 py-3">Health Status</th>
                  {isInventoryStaff && <th className="px-4 py-3 text-right">Quick Stock Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const stock = getStockStatus(p.quantity, p.reorderLevel);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold font-mono ${
                          p.quantity <= 0 ? 'text-rose-600' : p.quantity <= p.reorderLevel ? 'text-amber-600' : 'text-slate-900'
                        }`}>
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">{p.reorderLevel}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stock.bgClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stock.dotClass}`} />
                          {stock.label}
                        </span>
                      </td>
                      {isInventoryStaff && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setStockInProduct(p);
                                setStockInQty('');
                                setStockInRef('PO-' + Math.floor(1000 + Math.random() * 9000));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
                              <span>Stock In</span>
                            </button>

                            <button
                              onClick={() => {
                                setAdjustProduct(p);
                                setAdjustQty(String(p.quantity));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                            >
                              <Sliders className="w-3.5 h-3.5 text-slate-500" />
                              <span>Adjust</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Movements Audit Trail Tab */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Immutable Stock Movement Ledger (`stockMovements` Collection)
            </h2>
            <p className="text-[11px] text-slate-500">Every stock increase, customer sale, or adjustment is recorded with user identity and timestamps.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3 text-center">Quantity Delta</th>
                  <th className="px-4 py-3 text-center">Previous → New</th>
                  <th className="px-4 py-3">Reference / Notes</th>
                  <th className="px-4 py-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No stock movements recorded yet.</td>
                  </tr>
                ) : (
                  movements.map((mov) => {
                    const isStockIn = mov.type === 'stock_in';
                    const isStockOut = mov.type === 'stock_out';

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">
                          {formatDateTime(mov.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{mov.productName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isStockIn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            isStockOut ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {mov.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          <span className={isStockIn ? 'text-emerald-600' : isStockOut ? 'text-rose-600' : 'text-amber-600'}>
                            {isStockIn ? `+${mov.quantity}` : isStockOut ? `-${mov.quantity}` : (mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-600">
                          {mov.previousQuantity} → <span className="font-bold text-slate-900">{mov.newQuantity}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px]">
                          <span className="font-mono font-semibold text-slate-700">{mov.referenceId}</span>
                          {mov.notes && <span className="block text-slate-400 truncate max-w-xs">{mov.notes}</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{mov.userId || 'Staff'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock-In Modal */}
      {stockInProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Record Stock Received (Stock-In)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Item: <span className="font-semibold text-slate-800">{stockInProduct.name}</span> (Current: {stockInProduct.quantity})
            </p>

            <form onSubmit={handleStockInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Received *</label>
                <input
                  type="number"
                  min="1"
                  value={stockInQty}
                  onChange={(e) => setStockInQty(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Invoice / PO Reference</label>
                <input
                  type="text"
                  value={stockInRef}
                  onChange={(e) => setStockInRef(e.target.value)}
                  placeholder="e.g. PO-8902"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Notes (Optional)</label>
                <input
                  type="text"
                  value={stockInNotes}
                  onChange={(e) => setStockInNotes(e.target.value)}
                  placeholder="e.g. Delivered by freight carrier"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockInProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Confirm Stock Received
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Adjust Stock Quantity
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Item: <span className="font-semibold text-slate-800">{adjustProduct.name}</span> (Current count: {adjustProduct.quantity})
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Verified Count *</label>
                <input
                  type="number"
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Adjustment *</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  <option value="Stock Count Audit">Routine Stock Count Audit</option>
                  <option value="Damaged Stock Write-off">Damaged / Expired Goods</option>
                  <option value="Discrepancy Correction">Discrepancy Correction</option>
                  <option value="Customer Return">Customer Return to Inventory</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
