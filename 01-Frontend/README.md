# 01-Frontend — Smart Inventory & Sales Management System

## 1. Overview & Role
The **01-Frontend** component is the user-facing web application built for retail store personnel (Administrators, Inventory Staff, and Sales Cashiers). It provides an intuitive, responsive user interface to manage product catalogs, record stock replenishment and audit adjustments, process Point-of-Sale (POS) customer transactions, and visualize business analytics.

It communicates with the persistent backend via the official **Firebase Web SDK v10** for authentication and database queries, while preserving a modular service-oriented architecture.

---

## 2. Technology Stack
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS (Navy / Blue professional corporate theme)
- **Routing:** React Router DOM v6 (declarative client-side routing & route guards)
- **Data Visualization:** Recharts (responsive revenue trends and stock distribution charts)
- **Icons:** Lucide React
- **Cloud Connectivity:** Firebase Web SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`)

---

## 3. Directory Structure
```
01-Frontend/
├── public/
│   └── assets/                     # Static media assets & icons
├── src/
│   ├── components/                 # Reusable UI widgets
│   │   ├── LoadingSpinner.jsx      # Async state indicators
│   │   ├── Navbar.jsx              # Header, low-stock badge & profile menu
│   │   ├── ProductForm.jsx         # Modal for adding/editing products
│   │   ├── ProductTable.jsx        # Searchable, filterable catalog table
│   │   ├── Sidebar.jsx             # Role-aware sidebar with supervisor switcher
│   │   └── StatCard.jsx            # KPI metric cards with trend indicators
│   │
│   ├── pages/                      # Screen views
│   │   ├── Login.jsx               # Auth screen with 1-click test accounts
│   │   ├── Dashboard.jsx           # Real-time overview & sales chart
│   │   ├── Products.jsx            # Product catalog & pricing management
│   │   ├── Inventory.jsx           # Stock-in, adjustment & movement ledger
│   │   ├── Sales.jsx               # Point of Sale (POS) checkout counter
│   │   ├── Suppliers.jsx           # Trade vendor directory
│   │   └── Reports.jsx             # Financial valuation & best sellers
│   │
│   ├── layouts/
│   │   └── DashboardLayout.jsx     # Authenticated shell layout & mobile drawer
│   │
│   ├── services/                   # Business logic & Firebase queries
│   │   ├── authService.js          # Authentication, user profile CRUD
│   │   ├── productService.js       # Products collection operations
│   │   ├── inventoryService.js     # Stock updates & stockMovements audit trail
│   │   ├── salesService.js         # Atomic transaction sales processing
│   │   └── supplierService.js      # Supplier records management
│   │
│   ├── firebase/
│   │   └── firebaseConfig.js       # Firebase App, Auth & Firestore initialization
│   │
│   ├── hooks/
│   │   ├── useAuth.js              # Re-export hook
│   │   └── useAuth.jsx             # AuthContext provider & role checks
│   │
│   ├── utils/
│   │   └── formatters.js           # Currency, date, SKU & stock health helpers
│   │
│   ├── App.jsx                     # Router definition & route security guards
│   ├── main.jsx                    # React entry root
│   └── index.css                   # Tailwind imports & scrollbar styles
│
├── .env                            # Active environment variables
├── .env.example                    # Template environment variables
├── index.html                      # HTML entry template
├── package.json                    # Frontend dependencies & scripts
├── postcss.config.js               # PostCSS configuration
├── tailwind.config.js              # Tailwind design tokens & colors
└── vite.config.js                  # Vite bundler configuration & code-splitting
```

---

## 4. Key Architectural Patterns

### A. Modular Service Layer
Firebase SDK operations are never mixed directly into UI components. All reads and writes to Firestore run through dedicated service modules in `src/services/`:
- `productService.js` handles catalog entries, prices, and soft-deactivations.
- `inventoryService.js` performs atomic stock increments and adjustments while logging every movement to `stockMovements`.
- `salesService.js` executes atomic sales checkout with automated inventory deduction.
- `supplierService.js` manages supplier associations.

### B. Role-Based Access Control (RBAC)
User authentication is managed via `useAuth.jsx` providing:
- `role`: Current user's verified role (`Admin`, `Inventory Staff`, `Sales Staff`).
- `isAdmin`, `isInventoryStaff`, `isSalesStaff`: Boolean authorization helpers used to conditionally render controls (e.g. disabling product creation for sales cashiers).
- **Supervisor Role Switcher:** A widget on both the Login screen and the Sidebar allowing evaluation of any role without re-entering credentials.

### C. Client Firebase Configuration (`firebaseConfig.js`)
Configured to read from `.env` (`VITE_FIREBASE_*`). If live credentials are not yet supplied or during offline university evaluation, a graceful offline fallback ensures all UI features, stock movements, and sales workflows remain functional.

---

## 5. Running the Frontend Component

### Step 1: Install Dependencies (if not already installed)
```bash
cd 01-Frontend
npm install
```

### Step 2: Start the Vite Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### Step 3: Build for Production
```bash
npm run build
```
Generates a minified, production-ready build in `01-Frontend/dist/`.
