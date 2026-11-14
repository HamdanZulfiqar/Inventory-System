import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDemoAccounts } from '../services/authService';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [role, setRole] = useState('Admin');

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const demoAccounts = getDemoAccounts();

  const handleQuickLogin = (demo) => {
    setEmail(demo.email);
    setPassword('demo123');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. You can also use the supervisor test credentials below.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100/80">
      <div className="w-full max-w-md">
        {/* Brand Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SmartInventory</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Smart Inventory & Sales Management System
          </p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            University Evaluation Prototype
          </span>
        </div>

        {/* Main Auth Form Container */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-7 sm:p-8">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">
              {mode === 'login' ? 'Sign In to Your Account' : 'Register New User'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              {mode === 'login' ? 'Create Account' : 'Back to Login'}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="Admin">Admin (Full Control)</option>
                    <option value="Inventory Staff">Inventory Staff (Catalog & Stock)</option>
                    <option value="Sales Staff">Sales Staff (POS & Sales)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@inventory.edu"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create & Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Supervisor Quick Login Helper */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Supervisor Quick Evaluation Accounts</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Click any role to autofill test credentials:
            </p>
            <div className="space-y-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.uid}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{acc.name}</span>
                    <span className="text-[11px] text-slate-500 block">{acc.email}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    acc.role === 'Admin' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : acc.role === 'Inventory Staff'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security / System details footer */}
        <div className="mt-4 text-center text-xs text-slate-500">
          <p>Role-based access enforced via Firebase Authentication & Firestore Rules.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
