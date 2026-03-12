# ChargeZone Operation Engine (COE)

## Introduction & Overview
ChargeZone Operation Engine (COE) is a comprehensive operational management dashboard and backend system designed to manage, monitor, and analyze EV charging operations. It provides powerful features for eMSP (e-Mobility Service Provider) session tracking, Charge Detail Record (CDR) management, fleet monitoring, and station exploration.

The platform is split into a **Node.js/Express backend** that handles data processing, scheduled synchronization jobs, and API endpoints, and a **React frontend** that provides an intuitive UI for operators.

## Technology Stack

### Frontend (Client)
- **Framework:** React 19 powered by Vite
- **Routing:** React Router v7
- **Styling:** CSS (Vanilla)
- **Data Visualization:** Recharts
- **HTTP Client:** Axios
- **Utilities:** xlsx (for Excel data exports/handling)

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Validation:** Joi
- **Task Scheduling:** node-cron (for background jobs like SLA Sync)
- **HTTP Client:** Axios

## Project Architecture & Structure

The repository is structured as a monorepo containing both the frontend and backend applications.

```text
e:\ChargeZone_Operation_Engine(COE)\
├── backend/                  # Express.js REST API
│   ├── src/
│   │   ├── middleware/       # Express middlewares (auth, validation, etc.)
│   │   ├── modules/          # Domain-driven feature modules (controllers, routes, services)
│   │   ├── scripts/          # Database indexing and utility scripts
│   │   ├── app.js            # Express app configuration
│   │   └── server.js         # Entry point for the backend server
│   └── package.json
│
└── frontend/                 # React UI Application
    ├── src/
    │   ├── assets/           # Static assets (images, icons)
    │   ├── components/       # Reusable, stateless UI components
    │   ├── context/          # React Context providers for global state
    │   ├── layouts/          # Page wrapper layouts (e.g., Sidebar + Navbar)
    │   ├── pages/            # Feature-specific page components
    │   ├── routes/           # React Router route definitions
    │   ├── services/         # API integration and external service calls
    │   ├── App.jsx           # Root component
    │   └── main.jsx          # React DOM rendering entry point
    └── package.json
```

## Key Features & Modules

### 1. Dashboard & Analytics (`dashboard`)
Provides a high-level overview of system metrics, KPIs, and operational statuses. Visualized on the frontend using Recharts for interactive graphs and charts.

### 2. eMSP Session Management
Handles active and past charging sessions across the network.
- **In-Progress Sessions (`emsp-in-progress`, `inprogress-analysis`):** Live monitoring and deep-dive analysis of currently active charging sessions.
- **Faulty Sessions (`emsp-faulty-sessions`, `emsp-faulty-sesssion-analysis`):** Identification, tracking, and resolution workflows for sessions that encountered errors.

### 3. CDR (Charge Detail Record) Management
- **CDR Builder & Push:** Tools to construct, format, and push charging records to external systems or settlement partners.
- **CDR Recovery (`cdr-recovery`):** Mechanisms to recover lost or incomplete charging records.

### 4. Fleet Management (`fleet-management`)
Tools for managing B2B fleet customers, tracking their vehicles, and analyzing their charging patterns.

### 5. Station Explorer (`station-explorer`)
A comprehensive view of all charging stations in the network, allowing operators to inspect hardware status, connectivity, and historical performance.

### 6. Settlement & SLA (`settlement`, `sla-sync`)
- **Settlement:** Financial reconciliation for roaming partners and hosts.
- **SLA Sync:** Scheduled cron jobs (via `node-cron`) to periodically sync operational statuses with production databases and ensure Service Level Agreements (SLAs) are met.

### 7. User & Access Management (`auth`, `User`)
Role-based access control, secure staff logins, and administrative tools to manage platform users.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory with the necessary environment variables:
   ```env
   # Example .env structure
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/coe_db
   JWT_SECRET=your_jwt_secret_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the local URL provided by Vite (typically `http://localhost:5173`).

## Available Scripts

**Backend:**
- `npm run dev`: Starts the backend server with `nodemon` for auto-reloading.
- `npm start`: Starts the backend server for production.
- `npm run setup-indexes`: Runs database indexing scripts.

**Frontend:**
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles the React application for production into the `dist` folder.
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs ESLint to check for code quality issues.
