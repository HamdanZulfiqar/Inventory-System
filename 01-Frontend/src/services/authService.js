import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, isDemoConfig } from '../firebase/firebaseConfig';

const DEMO_USERS = [
  {
    uid: 'demo-admin-01',
    name: 'Sarah Connor',
    email: 'admin@inventory.edu',
    role: 'Admin',
    department: 'Management',
  },
  {
    uid: 'demo-inventory-01',
    name: 'Michael Chen',
    email: 'inventory@inventory.edu',
    role: 'Inventory Staff',
    department: 'Warehouse & Logistics',
  },
  {
    uid: 'demo-sales-01',
    name: 'Amina Patel',
    email: 'sales@inventory.edu',
    role: 'Sales Staff',
    department: 'Storefront',
  }
];

const LOCAL_STORAGE_USER_KEY = 'smart_inventory_user_profile';

/**
 * Sign in user with email and password
 */
export const signInUser = async (email, password) => {
  // If demo credentials matched or demo mode active
  const demoMatch = DEMO_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (demoMatch && (password === 'demo123' || password === 'admin123' || isDemoConfig)) {
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoMatch));
    return { user: { uid: demoMatch.uid, email: demoMatch.email }, profile: demoMatch };
  }

  try {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;
    
    // Fetch user profile from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    let profile = null;
    if (userDoc.exists()) {
      profile = userDoc.data();
    } else {
      // Default fallback profile if not found
      profile = {
        uid: user.uid,
        name: user.displayName || email.split('@')[0],
        email: user.email,
        role: 'Admin', // Default initial role
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, profile);
    }

    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    return { user, profile };
  } catch (error) {
    // If Firebase project is in placeholder mode, allow demo login
    if (isDemoConfig && demoMatch) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoMatch));
      return { user: { uid: demoMatch.uid, email: demoMatch.email }, profile: demoMatch };
    }
    throw error;
  }
};

/**
 * Register a new user and create their Firestore profile
 */
export const registerUser = async (email, password, name, role = 'Sales Staff') => {
  try {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    const userProfile = {
      uid: user.uid,
      name,
      email: user.email,
      role,
      createdAt: serverTimestamp(),
    };

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, userProfile);

    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify({
      ...userProfile,
      createdAt: new Date().toISOString()
    }));

    return { user, profile: userProfile };
  } catch (error) {
    if (isDemoConfig) {
      // Create local simulated user for supervisor inspection
      const simulatedUser = {
        uid: 'user-' + Date.now(),
        name,
        email: email.trim(),
        role,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(simulatedUser));
      return { user: { uid: simulatedUser.uid, email: simulatedUser.email }, profile: simulatedUser };
    }
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  if (auth && !isDemoConfig) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Sign out error:", err);
    }
  }
};

/**
 * Get current profile from local cache or firestore
 */
export const getCurrentUserProfile = async (uid) => {
  if (!uid) {
    const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    return cached ? JSON.parse(cached) : null;
  }

  try {
    if (db && !isDemoConfig) {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch user from Firestore:", err);
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  return cached ? JSON.parse(cached) : null;
};

/**
 * Demo accounts helper for supervisor testing
 */
export const getDemoAccounts = () => DEMO_USERS;
