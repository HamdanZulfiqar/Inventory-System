# Smart Inventory and Sales Management System
**University Information System Project — Retail Store Edition**

---

## 1. Project Overview
A web-based Information System designed for a small retail business to transition from manual records and spreadsheets into an automated, role-governed, real-time management system.

### Key Objectives Addressed
- **Accurate Stock Information:** Real-time stock counts updated automatically upon sales or restocks.
- **Delayed Replenishment:** Automatic identification of products at or below their reorder threshold with proactive low-stock visual alerts.
- **Sales & Transaction Visibility:** Point-of-Sale (POS) counter with live receipt generation and transaction logs.
- **Immutable Audit Trail:** Comprehensive `stockMovements` ledger recording every stock increase, decrease, or adjustment.

---

## 2. Technology Stack
- **Frontend Framework:** React.js (v18.3) with Vite
- **Styling:** Tailwind CSS (Navy/Blue enterprise dashboard theme)
- **Routing:** React Router DOM (v6.26)
- **Icons:** Lucide React
- **Data Visualization & Analytics:** Recharts
- **Database & Auth:** Firebase Authentication & Cloud Firestore
- **Backend Business Logic:** Firebase Cloud Functions (TypeScript) & Firestore Security Rules

---

## 3. Architecture & Security
```
Frontend:
React Components → Pages → Service Functions → Firebase Client SDK

Backend:
Firebase Cloud Functions (processSaleTransaction) → Cloud Firestore
Firestore Security Rules (firestore.rules) → Role Enforcement

Authentication & Authorization:
Firebase Auth → User Identity → Role Claims / Profile Document (Admin, Inventory Staff, Sales Staff)
```

### Security Rules (`firestore.rules`)
- `users`: Authenticated read, admin or self-profile management.
- `products`: Authenticated read; write restricted to **Admin** & **Inventory Staff**.
- `suppliers`: Authenticated read; write restricted to **Admin** & **Inventory Staff**.
- `sales`: Authenticated read; create restricted to **Admin** & **Sales Staff**; updates disallowed.
- `stockMovements`: Authenticated read; immutable append-only audit trail.

---

## 4. Evaluator & Supervisor Quick Test Accounts

The system provides instant 1-click test credentials right on the **Login Page** and a **Role Switcher** widget inside the Sidebar:

| Role | Name | Email | Password | Permissions Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Sarah Connor | `admin@inventory.edu` | `demo123` | Full access (Products, Stock, Sales, Reports, Config) |
| **Inventory Staff** | Michael Chen | `inventory@inventory.edu` | `demo123` | Product Catalogue, Stock In, Stock Adjustments, Suppliers |
| **Sales Staff** | Amina Patel | `sales@inventory.edu` | `demo123` | Point of Sale (POS), Sales History, Customer Checkout |

---

## 5. Getting Started

### 1. Run Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Build for Production
```bash
npm run build
```

### 3. Connect to Your Live Firebase Project (Optional)
Configure `.env` with your Firebase project credentials from Firebase Console:
```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 6. Project Structure
```
smart-inventory-system/
├── public/
│   └── assets/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx          # Dark navy role-aware navigation
│   │   ├── Navbar.jsx           # Low-stock notification bell & user profile
│   │   ├── StatCard.jsx         # KPI metrics display card
│   │   ├── ProductForm.jsx      # Modal for product creation & edit
│   │   ├── ProductTable.jsx     # Filterable product catalog table
│   │   └── LoadingSpinner.jsx   # Async loading state indicator
│   ├── pages/
│   │   ├── Login.jsx            # Authentication & 1-click supervisor sign-in
│   │   ├── Dashboard.jsx        # Executive store overview & sales chart
│   │   ├── Products.jsx         # Product catalog management
│   │   ├── Inventory.jsx        # Stock-in, adjustment & movement audit log
│   │   ├── Suppliers.jsx        # Vendor directory & product association
│   │   ├── Sales.jsx            # Point of Sale (POS) checkout & receipt
│   │   └── Reports.jsx          # Valuation metrics, best sellers & stock health
│   ├── layouts/
│   │   └── DashboardLayout.jsx  # Protected route shell
│   ├── services/
│   │   ├── authService.js       # Firebase Auth & profile operations
│   │   ├── productService.js    # Firestore product CRUD & stock initialisation
│   │   ├── supplierService.js   # Vendor directory service
│   │   ├── inventoryService.js  # Atomic transaction stock-in & adjustments
│   │   └── salesService.js      # Atomic transaction sale execution
│   ├── firebase/
│   │   └── firebaseConfig.js    # Firebase SDK initialization & fallback mode
│   ├── hooks/
│   │   └── useAuth.js           # Auth context & role helpers
│   ├── utils/
│   │   └── formatters.js        # Currency, date & stock badge helpers
│   ├── App.jsx                  # Main routing configuration
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Tailwind base & custom components
├── functions/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts             # Cloud Functions server-side sale transaction
├── firebase.json                # Firebase deployment definition
├── firestore.rules              # Role-based access control rules
├── firestore.indexes.json       # Composite query indexes
└── package.json                 # Project dependencies & build scripts
```
