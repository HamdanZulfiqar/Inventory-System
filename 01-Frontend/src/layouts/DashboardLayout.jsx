import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { getLowStockProducts } from '../services/inventoryService';

export const DashboardLayout = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Periodically or on route change check low stock counts
    const checkStock = async () => {
      try {
        const lowStock = await getLowStockProducts();
        setLowStockCount(lowStock.length);
      } catch (err) {
        console.warn("Failed to check low stock", err);
      }
    };

    if (currentUser || userProfile) {
      checkStock();
    }
  }, [currentUser, userProfile, location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner text="Authenticating user access..." size="large" />
      </div>
    );
  }

  // If not authenticated, redirect to Login
  if (!currentUser && !userProfile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar navigation */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main content container */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          lowStockCount={lowStockCount}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{ refreshLowStock: () => {} }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
