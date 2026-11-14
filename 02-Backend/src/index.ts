import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK to connect directly to the shared Cloud Firestore database
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// Data Transfer Object (DTO) Interfaces
// ============================================================================

interface SaleItemInput {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ProcessSaleRequest {
  items: SaleItemInput[];
  paymentMethod?: string;
  customerName?: string;
}

interface RestockRequest {
  productId: string;
  quantity: number;
  referenceId?: string;
  notes?: string;
}

interface AdjustStockRequest {
  productId: string;
  newQuantity: number;
  reason?: string;
}

// ============================================================================
// 1. Server-Side Sale Processing Function (FR5, FR6)
// ============================================================================

/**
 * Callable Cloud Function: processSaleTransaction
 * 
 * Secure server-side transaction handling that:
 * 1. Verifies caller authentication identity and authorization roles (Admin or Sales Staff).
 * 2. Validates line items and positive non-zero quantities.
 * 3. Runs an atomic Firestore transaction across the products, sales, and stockMovements collections.
 * 4. Ensures sufficient stock exists before any deduction occurs (prevents negative stock).
 * 5. Generates the sale transaction record and corresponding stock_out audit entries.
 */
export const processSaleTransaction = functions.https.onCall(
  async (data: ProcessSaleRequest, context) => {
    // 1. Verify caller authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The operation requires valid user authentication."
      );
    }

    const userId = context.auth.uid;
    const userEmail = context.auth.token.email || "Unknown User";

    // 2. Role Authorization Check: verify user is Admin or Sales Staff
    const userDoc = await db.collection("users").doc(userId).get();
    const userRole = userDoc.exists ? userDoc.data()?.role : context.auth.token.role;

    if (userRole !== "Admin" && userRole !== "Sales Staff") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Access denied. Only 'Admin' or 'Sales Staff' roles can execute sale transactions."
      );
    }

    // 3. Payload Validation
    const { items, paymentMethod = "Cash", customerName = "Walk-in Customer" } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A sale transaction must contain at least one valid line item."
      );
    }

    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid item parameters for product: ${item.name || item.productId}. Quantity must be positive.`
        );
      }
    }

    // Generate readable receipt sale code
    const saleCode = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      // 4. Atomic Multi-Document Firestore Transaction
      const result = await db.runTransaction(async (transaction) => {
        let totalCalculated = 0;
        const productSnapshots: Array<{
          ref: admin.firestore.DocumentReference;
          currentData: admin.firestore.DocumentData;
          item: SaleItemInput;
        }> = [];

        // Phase A: Read and validate all affected product documents
        for (const item of items) {
          const productRef = db.collection("products").doc(item.productId);
          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              `Product with ID "${item.productId}" was not found in the inventory database.`
            );
          }

          const productData = productSnap.data()!;
          if (productData.isActive === false) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              `Product "${productData.name}" is marked inactive and cannot be sold.`
            );
          }

          const currentStock = Number(productData.quantity) || 0;
          if (currentStock < item.quantity) {
            throw new functions.https.HttpsError(
              "resource-exhausted",
              `Insufficient stock for "${productData.name}". Available: ${currentStock}, Requested: ${item.quantity}`
            );
          }

          const effectivePrice = Number(productData.sellingPrice) || item.unitPrice;
          totalCalculated += effectivePrice * item.quantity;

          productSnapshots.push({
            ref: productRef,
            currentData: productData,
            item,
          });
        }

        // Phase B: Execute all atomic mutations (Deduct stock & log audit movements)
        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        for (const { ref, currentData, item } of productSnapshots) {
          const previousQty = Number(currentData.quantity) || 0;
          const newQty = previousQty - item.quantity;

          // Deduct stock
          transaction.update(ref, {
            quantity: newQty,
            updatedAt: timestamp,
          });

          // Write stockMovements audit log
          const movementRef = db.collection("stockMovements").doc();
          transaction.set(movementRef, {
            productId: item.productId,
            productName: currentData.name,
            type: "stock_out",
            quantity: item.quantity,
            previousQuantity: previousQty,
            newQuantity: newQty,
            referenceId: saleCode,
            notes: `Counter sale to ${customerName}`,
            userId: userEmail,
            createdAt: timestamp,
          });
        }

        // Phase C: Create persistent sales collection record
        const saleRef = db.collection("sales").doc();
        const saleRecord = {
          saleId: saleCode,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.quantity * i.unitPrice,
          })),
          totalAmount: Math.round(totalCalculated * 100) / 100,
          paymentMethod,
          customerName,
          soldBy: userEmail,
          status: "completed",
          createdAt: timestamp,
        };

        transaction.set(saleRef, saleRecord);

        return {
          saleId: saleCode,
          totalAmount: saleRecord.totalAmount,
        };
      });

      return {
        success: true,
        saleId: result.saleId,
        totalAmount: result.totalAmount,
        message: "Sale successfully processed and inventory updated atomically.",
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to complete transaction on server."
      );
    }
  }
);

// ============================================================================
// 2. Server-Side Stock In Function (FR3, FR6)
// ============================================================================

/**
 * Callable Cloud Function: restockProductInventory
 * 
 * Atomically increments product inventory and logs a stock_in record.
 */
export const restockProductInventory = functions.https.onCall(
  async (data: RestockRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }

    const { productId, quantity, referenceId = "PO-RESTOCK", notes = "" } = data;
    if (!productId || typeof quantity !== "number" || quantity <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Quantity must be a positive integer."
      );
    }

    const userEmail = context.auth.token.email || "Inventory Staff";

    return await db.runTransaction(async (transaction) => {
      const productRef = db.collection("products").doc(productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Product document not found.");
      }

      const productData = productSnap.data()!;
      const previousQty = Number(productData.quantity) || 0;
      const newQty = previousQty + quantity;
      const now = admin.firestore.FieldValue.serverTimestamp();

      transaction.update(productRef, {
        quantity: newQty,
        updatedAt: now,
      });

      const movementRef = db.collection("stockMovements").doc();
      transaction.set(movementRef, {
        productId,
        productName: productData.name,
        type: "stock_in",
        quantity,
        previousQuantity: previousQty,
        newQuantity: newQty,
        referenceId,
        notes,
        userId: userEmail,
        createdAt: now,
      });

      return {
        success: true,
        productId,
        previousQuantity: previousQty,
        newQuantity: newQty,
      };
    });
  }
);

// ============================================================================
// 3. Server-Side Stock Adjustment Function (FR3, FR8)
// ============================================================================

/**
 * Callable Cloud Function: adjustProductStock
 * 
 * Adjusts product inventory count due to physical audits or write-offs.
 */
export const adjustProductStock = functions.https.onCall(
  async (data: AdjustStockRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }

    const { productId, newQuantity, reason = "Stock Count Audit" } = data;
    if (!productId || typeof newQuantity !== "number" || newQuantity < 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "New quantity must be a non-negative integer."
      );
    }

    const userEmail = context.auth.token.email || "Inventory Staff";

    return await db.runTransaction(async (transaction) => {
      const productRef = db.collection("products").doc(productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Product document not found.");
      }

      const productData = productSnap.data()!;
      const previousQty = Number(productData.quantity) || 0;
      const diff = newQuantity - previousQty;
      const now = admin.firestore.FieldValue.serverTimestamp();

      transaction.update(productRef, {
        quantity: newQuantity,
        updatedAt: now,
      });

      const movementRef = db.collection("stockMovements").doc();
      transaction.set(movementRef, {
        productId,
        productName: productData.name,
        type: "adjustment",
        quantity: diff,
        previousQuantity: previousQty,
        newQuantity,
        referenceId: "ADJUSTMENT",
        notes: reason,
        userId: userEmail,
        createdAt: now,
      });

      return {
        success: true,
        productId,
        previousQuantity: previousQty,
        newQuantity,
        diff,
      };
    });
  }
);
