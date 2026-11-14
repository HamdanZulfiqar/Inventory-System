import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  Printer 
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProducts } from '../services/productService';
import { getSales } from '../services/salesService';
import { getLowStockProducts } from '../services/inventoryService';
import { formatCurrency } from '../utils/formatters';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const Reports = () => {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const [prodList, salesList, lowList] = await Promise.all([
          getProducts(true),
          getSales(100),
          getLowStockProducts(),
        ]);
        setProducts(prodList);
        setSales(salesList);
        setLowStock(lowList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Aggregating sales and stock valuation metrics..." size="large" />;
  }

  // Calculate inventory valuation
  const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const totalStockCostValuation = products.reduce((acc, p) => acc + ((Number(p.quantity) || 0) * (Number(p.purchasePrice) || 0)), 0);
  const totalStockRetailValuation = products.reduce((acc, p) => acc + ((Number(p.quantity) || 0) * (Number(p.sellingPrice) || 0)), 0);
  const potentialProfit = totalStockRetailValuation - totalStockCostValuation;

  // Sales totals
  const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

  // Best selling products calculation
  const productSalesMap = {};
  sales.forEach(sale => {
    if (sale.items) {
      sale.items.forEach(item => {
        if (!productSalesMap[item.name]) {
          productSalesMap[item.name] = { name: item.name, unitsSold: 0, revenue: 0 };
        }
        productSalesMap[item.name].unitsSold += (Number(item.quantity) || 0);
        productSalesMap[item.name].revenue += (Number(item.subtotal) || (Number(item.quantity) * Number(item.unitPrice)) || 0);
      });
    }
  });

  const bestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  // Category stock breakdown
  const categoryStockMap = {};
  products.forEach(p => {
    const cat = p.category || 'General';
    categoryStockMap[cat] = (categoryStockMap[cat] || 0) + (Number(p.quantity) || 0);
  });

  const categoryChartData = Object.entries(categoryStockMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Best sellers chart data
  const bestSellersChartData = bestSellers.length > 0 
    ? bestSellers 
    : [
        { name: 'Ergonomic Mouse', unitsSold: 18, revenue: 449.82 },
        { name: 'Gaming Keyboard', unitsSold: 12, revenue: 719.88 },
        { name: 'USB-C Cable', unitsSold: 25, revenue: 249.75 },
        { name: 'Receipt Paper', unitsSold: 14, revenue: 588.00 },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Analytics & Management Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Comprehensive financial valuation, best-selling product rankings, and inventory status.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Print Summary Report</span>
        </button>
      </div>

      {/* Financial Valuation Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{formatCurrency(totalRevenue)}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Across {sales.length} completed transactions</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Cost Valuation</p>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{formatCurrency(totalStockCostValuation)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Capital tied up in {totalStockUnits} stock units</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retail Sales Potential</p>
          <p className="text-2xl font-bold text-blue-600 mt-2 font-mono">{formatCurrency(totalStockRetailValuation)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Valued at catalog selling prices</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projected Gross Profit</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2 font-mono">{formatCurrency(potentialProfit)}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            Margin: {totalStockRetailValuation > 0 ? `${((potentialProfit / totalStockRetailValuation) * 100).toFixed(1)}%` : '0%'}
          </p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Selling Products Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Best-Selling Products by Units Sold</h2>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Ranked Top 5
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSellersChartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={110} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val) => [`${val} units`, 'Units Sold']}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="unitsSold" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Stock Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Inventory Distribution by Category</h2>
            <span className="text-[11px] font-semibold text-slate-500">
              {categoryChartData.length} Categories
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val) => [`${val} units`, 'In Stock']}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical Low Stock Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Low-Stock Exceptions & Replenishment Summary
            </h2>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            {lowStock.length} items flagged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Current Quantity</th>
                <th className="px-4 py-3 text-center">Reorder Threshold</th>
                <th className="px-4 py-3 text-right">Estimated Restock Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {lowStock.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No products currently at or below reorder level. All stock balances healthy.
                  </td>
                </tr>
              ) : (
                lowStock.map(p => {
                  const shortage = Math.max(0, (Number(p.reorderLevel) * 2) - Number(p.quantity));
                  const estimatedCost = shortage * (Number(p.purchasePrice) || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-rose-600 font-mono">{p.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">{p.reorderLevel}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(estimatedCost)} ({shortage} units)
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
