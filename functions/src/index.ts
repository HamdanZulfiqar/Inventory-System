import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

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

/**
 * Server-Side Sale Processing Function (FR5, FR6)
 * 
 * Verifies caller authentication and role, executes an atomic Firestore transaction to:
 * 1. Validate incoming items and stock levels
 * 2. Deduct inventory quantities
 * 3. Generate a sale record
 * 4. Generate stock_out audit movement records
 */
export const processSaleTransaction = functions.https.onCall(
  async (data: ProcessSaleRequest, context) => {
    // 1. Verify authenticated user identity
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The operation requires valid user authentication."
      );
    }

    const userId = context.auth.uid;
    const userEmail = context.auth.token.email || "Unknown";

    // 2. Role verification: check if user is Admin or Sales Staff
    const userDoc = await db.collection("users").doc(userId).get();
    const userRole = userDoc.exists ? userDoc.data()?.role : context.auth.token.role;

    if (userRole !== "Admin" && userRole !== "Sales Staff") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Access denied. User must have 'Admin' or 'Sales Staff' role to process sales."
      );
    }

    // 3. Validate submitted items
    const { items, paymentMethod = "Cash", customerName = "Walk-in Customer" } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A sale transaction must contain at least one valid product item."
      );
    }

    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid product item specifications for product ID: ${item.productId}`
        );
      }
    }

    // Generate unique human-readable Sale Reference Code
    const saleCode = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      // 4. Atomic Firestore Transaction
      const result = await db.runTransaction(async (transaction) => {
        let totalCalculated = 0;
        const productSnapshots: Array<{
          ref: admin.firestore.DocumentReference;
          currentData: admin.firestore.DocumentData;
          item: SaleItemInput;
        }> = [];

        // Step 4a: Read all product documents and verify inventory availability
        for (const item of items) {
          const productRef = db.collection("products").doc(item.productId);
          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              `Product with ID "${item.productId}" does not exist in inventory.`
            );
          }

          const productData = productSnap.data()!;
          if (productData.isActive === false) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              `Product "${productData.name}" is currently inactive/discontinued.`
            );
          }

          const currentStock = productData.quantity || 0;
          if (currentStock < item.quantity) {
            throw new functions.https.HttpsError(
              "resource-exhausted",
              `Insufficient stock for "${productData.name}". Available: ${currentStock}, Requested: ${item.quantity}`
            );
          }

          const lineTotal = (productData.sellingPrice || item.unitPrice) * item.quantity;
          totalCalculated += lineTotal;

          productSnapshots.push({
            ref: productRef,
            currentData: productData,
            item,
          });
        }

        // Step 4b: Deduct inventory and record stockMovements
        const now = admin.firestore.FieldValue.serverTimestamp();

        for (const { ref, currentData, item } of productSnapshots) {
          const previousQty = currentData.quantity || 0;
          const newQty = previousQty - item.quantity;

          // Update product stock
          transaction.update(ref, {
            quantity: newQty,
            updatedAt: now,
          });

          // Log stockMovement audit record
          const movementRef = db.collection("stockMovements").doc();
          transaction.set(movementRef, {
            productId: item.productId,
            productName: currentData.name,
            type: "stock_out",
            quantity: item.quantity,
            previousQuantity: previousQty,
            newQuantity: newQty,
            referenceId: saleCode,
            notes: `Customer sale: ${customerName}`,
            userId: userEmail,
            createdAt: now,
          });
        }

        // Step 4c: Create Sale document
        const saleRef = db.collection("sales").doc();
        const saleDocument = {
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
          createdAt: now,
        };

        transaction.set(saleRef, saleDocument);

        return {
          saleId: saleCode,
          totalAmount: saleDocument.totalAmount,
        };
      });

      return {
        success: true,
        saleId: result.saleId,
        totalAmount: result.totalAmount,
        message: "Sale processed successfully and inventory updated.",
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to process sale transaction."
      );
    }
  }
);
