/**
 * Database Seed Script — Smart Inventory and Sales Management System
 * 
 * Populates Cloud Firestore collections (users, products, suppliers, sales, stockMovements)
 * with university demonstration records from 03-Database/sample-data/.
 * 
 * Usage:
 *   1. Place your serviceAccountKey.json in this directory (or set GOOGLE_APPLICATION_CREDENTIALS)
 *   2. Run: node seedDatabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_DATA_DIR = path.join(__dirname, '..', 'sample-data');

const loadJson = (filename) => {
  const filePath = path.join(SAMPLE_DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

async function main() {
  console.log('===============================================================');
  console.log('Smart Inventory System — Firestore Seed Utility');
  console.log('===============================================================\n');

  try {
    const users = loadJson('users.json');
    const products = loadJson('products.json');
    const suppliers = loadJson('suppliers.json');
    const sales = loadJson('sales.json');
    const movements = loadJson('stockMovements.json');

    console.log(`[OK] Loaded sample datasets from ${SAMPLE_DATA_DIR}:`);
    console.log(`  - Users: ${users.length} records`);
    console.log(`  - Products: ${products.length} records`);
    console.log(`  - Suppliers: ${suppliers.length} records`);
    console.log(`  - Sales: ${sales.length} records`);
    console.log(`  - Stock Movements: ${movements.length} records\n`);

    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    const hasServiceAccount = fs.existsSync(serviceAccountPath) || process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!hasServiceAccount) {
      console.log('ℹ️  No Firebase serviceAccountKey.json detected in scripts directory.');
      console.log('ℹ️  Dataset verification succeeded! The sample JSON files are formatted');
      console.log('   correctly and ready for direct import via the Firebase Console or Admin SDK.');
      console.log('\nTo seed a live Firestore project:');
      console.log('  1. Generate a private key in Firebase Console -> Project Settings -> Service Accounts');
      console.log('  2. Save it as 03-Database/scripts/serviceAccountKey.json');
      console.log('  3. Re-run: node seedDatabase.js\n');
      return;
    }

    // Dynamic import of firebase-admin when credentials exist
    const { default: admin } = await import('firebase-admin');
    
    if (!admin.apps.length) {
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        admin.initializeApp();
      }
    }

    const db = admin.firestore();
    console.log('Connecting to Cloud Firestore...');

    // 1. Seed Users
    console.log('Writing users collection...');
    for (const u of users) {
      await db.collection('users').doc(u.uid).set(u, { merge: true });
    }

    // 2. Seed Suppliers
    console.log('Writing suppliers collection...');
    for (const s of suppliers) {
      await db.collection('suppliers').doc(s.id).set(s, { merge: true });
    }

    // 3. Seed Products
    console.log('Writing products collection...');
    for (const p of products) {
      await db.collection('products').doc(p.id).set(p, { merge: true });
    }

    // 4. Seed Sales
    console.log('Writing sales collection...');
    for (const sale of sales) {
      await db.collection('sales').doc(sale.id).set(sale, { merge: true });
    }

    // 5. Seed Stock Movements
    console.log('Writing stockMovements collection...');
    for (const mov of movements) {
      await db.collection('stockMovements').doc(mov.id).set(mov, { merge: true });
    }

    console.log('\n[SUCCESS] Successfully seeded all collections into Firestore!');
  } catch (error) {
    console.error('Error during database seed execution:', error.message);
  }
}

main();
