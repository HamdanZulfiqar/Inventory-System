import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit, 
  runTransaction 
} from 'firebase/firestore';
import { db, isDemoConfig } from '../firebase/firebaseConfig';
import { getProducts, updateProduct } from './productService';
import { getStockMovements } from './inventoryService';

const LOCAL_STORAGE_SALES_KEY = 'smart_inventory_sales';

// Initial sales transactions for supervisor demonstration
export const INITIAL_SALES = [
  {
    id: 'sale-1001',
    saleId: 'INV-2024-001',
    items: [
      {
        productId: 'prd-001',
        name: 'Wireless Bluetooth Ergonomic Mouse',
        quantity: 2,
        unitPrice: 24.99,
        subtotal: 49.98
      },
      {
        productId: 'prd-004',
        name: 'USB-C Fast Charging Cable 2M (Nylon Braided)',
        quantity: 3,
        unitPrice: 9.99,
        subtotal: 29.97
      }
    ],
    totalAmount: 79.95,
    paymentMethod: 'Credit Card',
    customerName: 'Walk-in Customer',
    soldBy: 'Amina Patel',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'sale-1002',
    saleId: 'INV-2024-002',
    items: [
      {
        productId: 'prd-002',
        name: 'Mechanical Gaming Keyboard (Blue Switch)',
        quantity: 1,
        unitPrice: 59.99,
        subtotal: 59.99
      }
    ],
    totalAmount: 59.99,
    paymentMethod: 'Cash',
    customerName: 'Walk-in Customer',
    soldBy: 'Sarah Connor',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'sale-1003',
    saleId: 'INV-2024-003',
    items: [
      {
        productId: 'prd-003',
        name: 'Heavy Duty Packaging Tape (6-Pack)',
        quantity: 4,
        unitPrice: 14.50,
        subtotal: 58.00
      },
      {
        productId: 'prd-005',
        name: 'Thermal Receipt Paper Rolls (50 Rolls/Box)',
        quantity: 1,
        unitPrice: 42.00,
        subtotal: 42.00
      }
    ],
    totalAmount: 100.00,
    paymentMethod: 'Mobile Pay',
    customerName: 'Walk-in Customer',
    soldBy: 'Amina Patel',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  }
];

/**
 * Process a sale with atomic Firestore transaction and inventory stock deduction
 */
export const processSale = async ({
  items, 
  totalAmount, 
  paymentMethod = 'Cash', 
  customerName = 'Walk-in Customer',
  soldBy = 'Sales Staff'
}) => {
  if (!items || items.length === 0) {
    throw new Error('Sale must contain at least one item.');
  }

  const saleCode = 'INV-' + Math.floor(100000 + Math.random() * 900000);

  try {
    if (db && !isDemoConfig) {
      let createdSaleId = '';

      await runTransaction(db, async (transaction) => {
        // Step 1: Read all products and check stock
        const productSnapshots = [];
        for (const item of items) {
          const productRef = doc(db, 'products', item.productId);
          const snap = await transaction.get(productRef);
          if (!snap.exists()) {
            throw new Error(`Product "${item.name}" not found.`);
          }
          const currentQty = snap.data().quantity || 0;
          if (currentQty < item.quantity) {
            throw new Error(`Insufficient stock for "${item.name}". Available: ${currentQty}, Requested: ${item.quantity}`);
          }
          productSnapshots.push({ ref: productRef, data: snap.data(), item });
        }

        // Step 2: Deduct stock from each product
        for (const { ref, data, item } of productSnapshots) {
          const previousQty = data.quantity || 0;
          const newQty = previousQty - item.quantity;
          
          transaction.update(ref, {
            quantity: newQty,
            updatedAt: serverTimestamp(),
          });

          // Create stock movement record
          const movementRef = doc(collection(db, 'stockMovements'));
          transaction.set(movementRef, {
            productId: item.productId,
            productName: item.name,
            type: 'stock_out',
            quantity: item.quantity,
            previousQuantity: previousQty,
            newQuantity: newQty,
            referenceId: saleCode,
            notes: `Customer sale: ${customerName}`,
            userId: soldBy,
            createdAt: serverTimestamp(),
          });
        }

        // Step 3: Create Sale Document
        const saleRef = doc(collection(db, 'sales'));
        createdSaleId = saleRef.id;
        transaction.set(saleRef, {
          saleId: saleCode,
          items,
          totalAmount: parseFloat(totalAmount),
          paymentMethod,
          customerName,
          soldBy,
          status: 'completed',
          createdAt: serverTimestamp(),
        });
      });

      return {
        success: true,
        saleId: saleCode,
        totalAmount,
        message: 'Sale completed and inventory automatically updated!',
      };
    }
  } catch (error) {
    console.warn("Firestore processSale fallback:", error.message);
    if (!isDemoConfig && !error.message.includes('not initialized')) {
      throw error;
    }
  }

  // Fallback Local Storage Transaction Simulation
  const products = await getProducts(true);

  // Validate stock
  for (const item of items) {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) {
      throw new Error(`Product "${item.name}" not found.`);
    }
    if ((prod.quantity || 0) < item.quantity) {
      throw new Error(`Insufficient stock for "${item.name}". Available: ${prod.quantity || 0}, Requested: ${item.quantity}`);
    }
  }

  // Deduct stock and log movements
  const movements = await getStockMovements(100);
  for (const item of items) {
    const prod = products.find(p => p.id === item.productId);
    const prevQty = prod.quantity || 0;
    const newQty = prevQty - item.quantity;
    
    await updateProduct(item.productId, { quantity: newQty });

    movements.unshift({
      id: 'mov-' + Date.now() + Math.random().toString(36).substring(7),
      productId: item.productId,
      productName: item.name,
      type: 'stock_out',
      quantity: item.quantity,
      previousQuantity: prevQty,
      newQuantity: newQty,
      referenceId: saleCode,
      notes: `Customer sale: ${customerName}`,
      userId: soldBy,
      createdAt: new Date().toISOString(),
    });
  }
  localStorage.setItem('smart_inventory_stock_movements', JSON.stringify(movements));

  // Save sale
  const newSale = {
    id: 'sale-' + Date.now(),
    saleId: saleCode,
    items,
    totalAmount: parseFloat(totalAmount),
    paymentMethod,
    customerName,
    soldBy,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };

  const sales = await getSales();
  sales.unshift(newSale);
  localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(sales));

  return {
    success: true,
    saleId: saleCode,
    totalAmount,
    message: 'Sale completed and inventory automatically updated!',
  };
};

/**
 * Retrieve sales records
 */
export const getSales = async (limitCount = 50) => {
  try {
    if (db && !isDemoConfig) {
      const q = query(
        collection(db, 'sales'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (sales.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(sales));
        return sales;
      }
    }
  } catch (error) {
    console.warn("Firestore getSales fallback:", error.message);
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_SALES_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // fallback
    }
  }

  localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(INITIAL_SALES));
  return INITIAL_SALES;
};
