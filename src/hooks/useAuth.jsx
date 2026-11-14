import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isDemoConfig } from '../firebase/firebaseConfig';
import { 
  signInUser, 
  registerUser, 
  signOutUser, 
  getCurrentUserProfile,
  getDemoAccounts 
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial cached user (useful for instant load and demo accounts)
    const cachedProfile = localStorage.getItem('smart_inventory_user_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        setUserProfile(parsed);
        setCurrentUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.name });
      } catch (e) {
        console.error("Invalid cached profile", e);
      }
    }

    if (!auth || isDemoConfig) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await getCurrentUserProfile(user.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error("Failed to load user profile", err);
        }
      } else {
        // If not in demo session
        const cached = localStorage.getItem('smart_inventory_user_profile');
        if (!cached) {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { user, profile } = await signInUser(email, password);
      setCurrentUser(user);
      setUserProfile(profile);
      return { user, profile };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name, role) => {
    setLoading(true);
    try {
      const { user, profile } = await registerUser(email, password, name, role);
      setCurrentUser(user);
      setUserProfile(profile);
      return { user, profile };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setCurrentUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const switchDemoRole = (roleName) => {
    const demos = getDemoAccounts();
    const target = demos.find(d => d.role === roleName) || demos[0];
    localStorage.setItem('smart_inventory_user_profile', JSON.stringify(target));
    setUserProfile(target);
    setCurrentUser({ uid: target.uid, email: target.email, displayName: target.name });
  };

  const role = userProfile?.role || 'Guest';
  const isAdmin = role === 'Admin';
  const isInventoryStaff = role === 'Inventory Staff' || isAdmin;
  const isSalesStaff = role === 'Sales Staff' || isAdmin;

  const value = {
    currentUser,
    userProfile,
    role,
    isAdmin,
    isInventoryStaff,
    isSalesStaff,
    loading,
    login,
    register,
    logout,
    switchDemoRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
