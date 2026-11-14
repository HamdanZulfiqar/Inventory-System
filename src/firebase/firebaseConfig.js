import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoInventoryKey1234567890abcdef",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-inventory-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smart-inventory-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-inventory-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890",
};

// Check if credentials are placeholders
export const isDemoConfig = 
  !import.meta.env.VITE_FIREBASE_API_KEY || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('Demo') ||
  import.meta.env.VITE_FIREBASE_API_KEY === 'your_api_key_here';

// Initialize Firebase App singleton safely
let app;
let auth;
let db;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase initialization warning (running in offline demo mode):", error.message);
}

export { app, auth, db };
export default app;
