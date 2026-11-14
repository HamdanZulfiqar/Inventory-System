import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction 
} from 'firebase/firestore';
import { db, isDemoConfig } from '../firebase/firebaseConfig';
import { getProducts, updateProduct } from './productService';

const LOCAL_STORAGE_MOVEMENTS_KEY = 'smart_inventory_stock_movements';

// Initial stock movements for supervisor demonstration
export const INITIAL_MOVEMENTS = [
  {
    id: 'mov-101',
    productId: 'prd-001',
    productName: 'Wireless Bluetooth Ergonomic Mouse',
    type: 'stock_in',
    quantity: 25,
    previousQuantity: 20,
    newQuantity: 45,
    referenceId: 'PO-2024-008',
    notes: 'Received restock shipment from Apex Wholesale',
    userId: 'Sarah Connor',
    createdAt: new Date('2024-03-10T14:30:00Z').toISOString(),
  },
  {
    id: 'mov-102',
    productId: 'prd-002',
    productName: 'Mechanical Gaming Keyboard (Blue Switch)',
    type: 'stock_out',
    quantity: 4,
    previousQuantity: 12,
    newQuantity: 8,
    referenceId: 'SALE-8801',
    notes: 'In-store sales counter transaction',
    userId: 'Amina Patel',
    createdAt: new Date('2024-03-11T16:15:00Z').toISOString(),
  },
  {
    id: 'mov-103',
    productId: 'prd-004',
    productName: 'USB-C Fast Charging Cable 2M',
    type: 'adjustment',
    quantity: -2,
    previousQuantity: 6,
    newQuantity: 4,
    referenceId: 'ADJ-AUDIT-03',
    notes: 'Damaged packaging during inventory audit',
    userId: 'Michael Chen',
    createdAt: new Date('2024-03-12T09:45:00Z').toISOString(),
  }
];

/**
 * Receive stock (Stock-In) using atomic transaction
 */
export const receiveStock = async ({
  productId, 
  quantity, 
  referenceId = 'RESTOCK', 
  notes = '', 
  userId = 'Inventory Staff'
}) => {
  const qtyToAdd = parseInt(quantity, 10);
  if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
    throw new Error('Stock-in quantity must be a positive integer.');
  }

  try {
    if (db && !isDemoConfig) {
      let previousQuantity = 0;
      let newQuantity = 0;
      let productName = '';

      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists()) {
          throw new Error('Product does not exist.');
        }

        const productData = productDoc.data();
        productName = productData.name;
        previousQuantity = productData.quantity || 0;
        newQuantity = previousQuantity + qtyToAdd;

        // Atomically update product stock
        transaction.update(productRef, {
          quantity: newQuantity,
          updatedAt: serverTimestamp(),
        });

        // Record stock movement
        const movementRef = doc(collection(db, 'stockMovements'));
        transaction.set(movementRef, {
          productId,
          productName,
          type: 'stock_in',
          quantity: qtyToAdd,
          previousQuantity,
          newQuantity,
          referenceId: referenceId.trim() || 'PO-RESTOCK',
          notes: notes.trim(),
          userId,
          createdAt: serverTimestamp(),
        });
      });

      return { success: true, previousQuantity, newQuantity, productName };
    }
  } catch (error) {
    console.warn("Firestore receiveStock fallback:", error.message);
  }

  // Fallback local storage update
  const products = await getProducts(true);
  const targetProduct = products.find(p => p.id === productId);
  if (!targetProduct) {
    throw new Error('Product not found.');
  }

  const previousQuantity = targetProduct.quantity || 0;
  const newQuantity = previousQuantity + qtyToAdd;

  await updateProduct(productId, { quantity: newQuantity });

  // Record movement locally
  const movements = await getStockMovements(100);
  const newMovement = {
    id: 'mov-' + Date.now(),
    productId,
    productName: targetProduct.name,
    type: 'stock_in',
    quantity: qtyToAdd,
    previousQuantity,
    newQuantity,
    referenceId: referenceId.trim() || 'PO-RESTOCK',
    notes: notes.trim(),
    userId,
    createdAt: new Date().toISOString(),
  };

  movements.unshift(newMovement);
  localStorage.setItem(LOCAL_STORAGE_MOVEMENTS_KEY, JSON.stringify(movements));

  return { success: true, previousQuantity, newQuantity, productName: targetProduct.name };
};

/**
 * Adjust stock quantity (Correction/Discrepancy) using atomic transaction
 */
export const adjustStock = async ({
  productId, 
  newQuantity, 
  reason = 'Inventory Audit', 
  userId = 'Inventory Staff'
}) => {
  const targetQty = parseInt(newQuantity, 10);
  if (isNaN(targetQty) || targetQty < 0) {
    throw new Error('New quantity must be a non-negative integer.');
  }

  try {
    if (db && !isDemoConfig) {
      let previousQuantity = 0;
      let productName = '';
      let diff = 0;

      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists()) {
          throw new Error('Product does not exist.');
        }

        const productData = productDoc.data();
        productName = productData.name;
        previousQuantity = productData.quantity || 0;
        diff = targetQty - previousQuantity;

        transaction.update(productRef, {
          quantity: targetQty,
          updatedAt: serverTimestamp(),
        });

        const movementRef = doc(collection(db, 'stockMovements'));
        transaction.set(movementRef, {
          productId,
          productName,
          type: 'adjustment',
          quantity: diff,
          previousQuantity,
          newQuantity: targetQty,
          referenceId: 'ADJUSTMENT',
          notes: reason.trim(),
          userId,
          createdAt: serverTimestamp(),
        });
      });

      return { success: true, previousQuantity, newQuantity: targetQty, productName, diff };
    }
  } catch (error) {
    console.warn("Firestore adjustStock fallback:", error.message);
  }

  // Local fallback
  const products = await getProducts(true);
  const targetProduct = products.find(p => p.id === productId);
  if (!targetProduct) {
    throw new Error('Product not found.');
  }

  const previousQuantity = targetProduct.quantity || 0;
  const diff = targetQty - previousQuantity;

  await updateProduct(productId, { quantity: targetQty });

  const movements = await getStockMovements(100);
  const newMovement = {
    id: 'mov-' + Date.now(),
    productId,
    productName: targetProduct.name,
    type: 'adjustment',
    quantity: diff,
    previousQuantity,
    newQuantity: targetQty,
    referenceId: 'ADJUSTMENT',
    notes: reason.trim(),
    userId,
    createdAt: new Date().toISOString(),
  };

  movements.unshift(newMovement);
  localStorage.setItem(LOCAL_STORAGE_MOVEMENTS_KEY, JSON.stringify(movements));

  return { success: true, previousQuantity, newQuantity: targetQty, productName: targetProduct.name, diff };
};

/**
 * Get all low-stock products (quantity <= reorderLevel)
 */
export const getLowStockProducts = async () => {
  const products = await getProducts(false); // active only
  return products.filter(p => Number(p.quantity) <= Number(p.reorderLevel));
};

/**
 * Retrieve recent stock movement records
 */
export const getStockMovements = async (limitCount = 50) => {
  try {
    if (db && !isDemoConfig) {
      const q = query(
        collection(db, 'stockMovements'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const movements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (movements.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_MOVEMENTS_KEY, JSON.stringify(movements));
        return movements;
      }
    }
  } catch (error) {
    console.warn("Firestore getStockMovements fallback:", error.message);
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_MOVEMENTS_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // fallback
    }
  }

  localStorage.setItem(LOCAL_STORAGE_MOVEMENTS_KEY, JSON.stringify(INITIAL_MOVEMENTS));
  return INITIAL_MOVEMENTS;
};
