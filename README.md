# LivingFoods ERP — Full Stack Setup

React (Vite) frontend + Express backend + PostgreSQL database.

---

## Prerequisites

Install these once if you don't have them:

| Tool | Download |
|------|----------|
| Node.js 18+ | https://nodejs.org (choose LTS) |
| PostgreSQL 14+ | https://www.postgresql.org/download |
| Git (optional) | https://git-scm.com |

---

## Step 1 — Open in VS Code

Open the `livingfoods-project` folder in VS Code:

```
File → Open Folder → select livingfoods-project
```

Then open the integrated terminal: **Terminal → New Terminal** (or `` Ctrl+` ``)

---

## Step 2 — Set up the database

### 2a. Create the database

In your terminal (or in pgAdmin / psql):

```bash
psql -U postgres -c "CREATE DATABASE cafe_erp;"
```

### 2b. Run the schema

```bash
psql -U postgres -d cafe_erp -f cafe_erp_full.sql
```

> `cafe_erp_full.sql` is the schema file from the previous step.
> Copy it into this folder if it's not already here.

---

## Step 3 — Configure environment variables

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in your PostgreSQL password:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cafe_erp
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE

JWT_SECRET=any_long_random_string_here
JWT_EXPIRES_IN=8h

PORT=3001
NODE_ENV=development
```

---

## Step 4 — Install all dependencies

Back in the **root** folder (`livingfoods-project/`):

```bash
npm install
npm run install:all
```

This installs packages for the root, client, and server in one go.

---

## Step 5 — Seed the database (creates superadmin + sample data)

```bash
cd server
node db/seed.js
cd ..
```

You should see:
```
✅  User created: superadmin
✅  Role assigned: owner
✅  Company: LivingFoods Pvt Ltd
✅  Location: Main Café
✅  Products inserted
🎉  Seed complete!
```

---

## Step 6 — Start the app

From the **root** folder, one command starts both the API and the UI:

```bash
npm run dev
```

You'll see two colour-coded outputs:
- **[API]** → Express server on http://localhost:3001
- **[UI]**  → Vite dev server on http://localhost:5173

---

## Step 7 — Open in browser

| URL | Page |
|-----|------|
| http://localhost:5173 | Home page (Marketplace / Living Dairies) |
| http://localhost:5173/#/admin | Admin login |
| http://localhost:5173/#/admin/dashboard | Admin console |

**Login credentials:**
- Username: `superadmin`
- Password: `admin123`

---

## Project structure

```
livingfoods-project/
├── package.json          ← root: runs client + server together
│
├── client/               ← React + Vite frontend
│   ├── src/
│   │   ├── App.jsx       ← routes
│   │   ├── main.jsx      ← entry point
│   │   ├── api/
│   │   │   └── client.js ← axios with JWT auto-attach
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── AdminLogin.jsx   ← real API login
│   │       ├── Dashboard.jsx    ← live stats from API
│   │       ├── Orders.jsx       ← full API-connected
│   │       └── stubs.jsx        ← remaining pages (ready to wire up)
│   ├── index.html
│   └── vite.config.js    ← proxies /api → localhost:3001
│
└── server/               ← Express + PostgreSQL backend
    ├── index.js          ← server entry point
    ├── .env.example      ← copy to .env
    ├── db/
    │   ├── pool.js       ← PostgreSQL connection pool
    │   └── seed.js       ← run once to create admin + sample data
    ├── middleware/
    │   └── auth.js       ← JWT verification + role guard
    └── routes/
        ├── auth.js       ← POST /api/auth/login, GET /api/auth/me
        ├── customers.js  ← full CRUD /api/customers
        └── api.js        ← products, orders, vendors, riders,
                             routes, purchases, ledger, analytics
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → returns JWT |
| GET  | `/api/auth/me` | Validate token |
| GET  | `/api/analytics/summary` | Dashboard stats |
| GET/POST/PATCH/DELETE | `/api/customers` | Customer CRUD |
| GET/POST/PATCH | `/api/products` | Product catalog |
| GET/POST/PATCH | `/api/orders` | Sales orders |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET/POST/PATCH | `/api/vendors` | Vendor management |
| GET/POST/PATCH | `/api/riders` | Rider management |
| GET/POST | `/api/routes` | Delivery routes |
| GET/POST | `/api/purchases` | Procurement |
| GET/POST | `/api/ledger` | Journal entries |
| GET | `/api/health` | API health check |

---

## Wiring up the remaining pages

The non-essential pages in `client/src/pages/stubs.jsx` show you exactly which
API endpoint to call. To implement any page fully:

1. Open `stubs.jsx` and find the page (e.g. `CustomersPage`)
2. Copy the equivalent component from `livingfoods.jsx` (the standalone HTML version)
3. Replace `state.customers` reads with:
   ```js
   const [customers, setCustomers] = useState([])
   useEffect(() => {
     api.get('/customers').then(r => setCustomers(r.data.customers))
   }, [])
   ```
4. Replace dispatch calls with:
   ```js
   await api.post('/customers', formData)
   ```

---

## Common issues

**`psql: command not found`**
Add PostgreSQL's bin directory to your PATH, or use pgAdmin to run the SQL file.

**`Connection refused` on port 3001**
Make sure `npm run dev` is running from the root folder, not inside client/ or server/.

**`password authentication failed for user "postgres"`**
Double-check `DB_PASSWORD` in `server/.env` matches your PostgreSQL installation password.

**`invalid token` after restarting server**
The JWT secret changed or the token expired. Log out and log in again.
