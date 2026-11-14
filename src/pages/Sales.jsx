import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Printer, 
  Search,
  PackageCheck
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productService';
import { processSale, getSales } from '../services/salesService';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export const Sales = () => {
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('Walk-in Customer');

  // Completed sale receipt popup
  const [completedSale, setCompletedSale] = useState(null);
  const [notification, setNotification] = useState(null);

  const { userProfile, role } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodList, salesList] = await Promise.all([
        getProducts(false), // active only
        getSales(20),
      ]);
      setProducts(prodList);
      setSalesHistory(salesList);
      if (prodList.length > 0 && !selectedProductId) {
        setSelectedProductId(prodList[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading product prices or sales records.', 'error');
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

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const qty = parseInt(itemQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity of 1 or more.', 'error');
      return;
    }

    const currentStock = Number(product.quantity) || 0;
    if (currentStock <= 0) {
      showToast(`"${product.name}" is out of stock!`, 'error');
      return;
    }

    // Check if item already exists in cart
    const existingIndex = cartItems.findIndex(item => item.productId === product.id);
    const existingQty = existingIndex !== -1 ? cartItems[existingIndex].quantity : 0;
    const newTotalQty = existingQty + qty;

    if (newTotalQty > currentStock) {
      showToast(`Insufficient stock for "${product.name}". Available: ${currentStock}, In Cart: ${existingQty}`, 'error');
      return;
    }

    if (existingIndex !== -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity = newTotalQty;
      updated[existingIndex].subtotal = newTotalQty * updated[existingIndex].unitPrice;
      setCartItems(updated);
    } else {
      setCartItems(prev => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: Number(product.sellingPrice) || 0,
          quantity: qty,
          subtotal: qty * (Number(product.sellingPrice) || 0),
        }
      ]);
    }

    setItemQuantity(1);
    showToast(`Added ${qty} × "${product.name}" to cart.`);
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleQuantityChange = (productId, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    const product = products.find(p => p.id === productId);
    const available = product ? Number(product.quantity) : 999;
    if (qty > available) {
      showToast(`Only ${available} available in inventory.`, 'error');
      return;
    }

    setCartItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          quantity: qty,
          subtotal: qty * item.unitPrice,
        };
      }
      return item;
    }));
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      showToast('Cart is empty. Add at least one item to proceed.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const result = await processSale({
        items: cartItems,
        totalAmount,
        paymentMethod,
        customerName: customerName.trim() || 'Walk-in Customer',
        soldBy: userProfile?.name || 'Sales Staff',
      });

      setCompletedSale({
        saleId: result.saleId,
        items: [...cartItems],
        totalAmount,
        paymentMethod,
        customerName,
        date: new Date().toISOString(),
      });

      setCartItems([]);
      showToast(`Sale #${result.saleId} completed and inventory updated!`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Transaction failed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Point of Sale & Transactions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Process retail customer sales with immediate stock decrement in Firestore.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading POS terminal catalog and checkout counter..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Product Selection & Cart Items (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Add to Cart Bar */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Select Product to Add
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Product Dropdown */}
                <div className="sm:col-span-7">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                        {p.name} — {formatCurrency(p.sellingPrice)} ({p.quantity <= 0 ? 'OUT OF STOCK' : `${p.quantity} in stock`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct?.quantity || 999}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-center font-bold"
                  />
                </div>

                {/* Add Button */}
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!selectedProduct || selectedProduct.quantity <= 0}
                    className="w-full py-2 px-3 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Sale</span>
                  </button>
                </div>
              </div>

              {selectedProduct && (
                <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                  <span>SKU: <strong className="font-mono text-slate-700">{selectedProduct.sku}</strong></span>
                  <span>Unit Price: <strong className="font-mono text-slate-700">{formatCurrency(selectedProduct.sellingPrice)}</strong></span>
                  <span>Available: <strong className={selectedProduct.quantity <= selectedProduct.reorderLevel ? 'text-amber-600 font-bold' : 'text-emerald-700'}>{selectedProduct.quantity} units</strong></span>
                </div>
              )}
            </div>

            {/* Current Cart Items Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Sale Line Items ({cartItems.length})
                  </h2>
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={() => setCartItems([])}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Item / SKU</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-center">Quantity</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">Cart is currently empty</p>
                          <p className="text-[11px] text-slate-400">Select products above to add them to this sale transaction.</p>
                        </td>
                      </tr>
                    ) : (
                      cartItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {item.name}
                            <span className="block text-[11px] font-mono text-slate-400">{item.sku}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                              className="w-16 px-2 py-1 text-xs border border-slate-200 rounded text-center font-bold"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-slate-900">
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveFromCart(item.productId)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Summary & Payment Form (1 col) */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                2. Checkout & Payment
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === 'Cash'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Card')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === 'Card'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Digital')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === 'Digital'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              {/* Order Calculations */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Estimated Tax (0%)</span>
                  <span className="font-mono">$0.00</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Due</span>
                  <span className="font-mono text-base text-blue-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={processing || cartItems.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <span>Processing Transaction...</span>
                ) : (
                  <>
                    <PackageCheck className="w-5 h-5" />
                    <span>Complete Sale ({formatCurrency(totalAmount)})</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400">
                Triggering atomic Firestore transaction to reduce product inventory counts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sales History Log */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Recorded Sales Ledger (`sales` Collection)
          </h2>
          <p className="text-[11px] text-slate-500">History of customer purchases and total revenue generated.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Sale ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Purchased Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesHistory.map((s) => (
                <tr key={s.id || s.saleId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">{s.saleId}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{s.customerName || 'Walk-in'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="truncate block max-w-xs" title={s.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                      {s.items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {s.paymentMethod || 'Cash'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(s.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.soldBy || 'Staff'}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-slate-400">{formatDateTime(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Sale Successfully Completed!</h3>
            <p className="text-xs text-slate-500 mb-4">
              Inventory balances were deducted and transaction logged to Firestore.
            </p>

            {/* Receipt Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs font-mono space-y-2 mb-4">
              <div className="flex justify-between border-b pb-1 font-sans font-bold">
                <span>Receipt Ref:</span>
                <span className="text-blue-600">{completedSale.saleId}</span>
              </div>
              <div className="space-y-1 pt-1">
                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>{item.quantity}× {item.name}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t">
                <span>Total Paid:</span>
                <span>{formatCurrency(completedSale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Method: {completedSale.paymentMethod}</span>
                <span>{completedSale.customerName}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCompletedSale(null)}
                className="w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Start Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
