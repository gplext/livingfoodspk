import { useState, useEffect, useRef } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  cream: "#FAF7F2", darkGreen: "#1A3A2A", midGreen: "#2D5A3D",
  lightGreen: "#4A8C5C", gold: "#C8973A", goldLight: "#F0C878",
  text: "#1A1A1A", textMid: "#4A4A4A", textLight: "#8A8A8A",
  white: "#FFFFFF", offWhite: "#F5F0E8", border: "#DDD8CC",
  danger: "#C0392B", success: "#27AE60",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;background:${T.cream};color:${T.text};min-height:100vh}
  h1,h2,h3{font-family:'Playfair Display',serif}
  input,select,textarea{font-family:'DM Sans',sans-serif;width:100%;padding:10px 14px;border:1.5px solid ${T.border};border-radius:8px;font-size:14px;background:${T.white};color:${T.text};outline:none;transition:border .2s}
  input:focus,select:focus,textarea:focus{border-color:${T.midGreen}}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;border-radius:8px;transition:all .2s}
  label{font-size:13px;font-weight:500;color:${T.textMid};display:block;margin-bottom:6px}
  .field{margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{text-align:left;padding:10px 14px;background:${T.darkGreen};color:${T.white};font-weight:500;font-size:13px}
  td{padding:10px 14px;border-bottom:1px solid ${T.border}}
  tr:hover td{background:${T.offWhite}}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500}
  .badge-green{background:#D4EDDA;color:#155724}
  .badge-amber{background:#FFF3CD;color:#856404}
  .badge-red{background:#F8D7DA;color:#721C24}
  .badge-blue{background:#D1ECF1;color:#0C5460}
  ::-webkit-scrollbar{width:6px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
`;

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const initState = () => ({
  customers: [
    { id: 1, name: "Aisha Khan", phone: "0300-1234567", email: "aisha@gmail.com", address: "DHA Phase 5", loyalty_tier: "Gold", loyalty_points: 4800, credit_balance: 2500, credit_limit: 10000, route: "DHA Route" },
    { id: 2, name: "Bilal Ahmed", phone: "0321-9876543", email: "bilal@gmail.com", address: "Gulberg III", loyalty_tier: "Silver", loyalty_points: 1200, credit_balance: 0, credit_limit: 5000, route: "Gulberg Route" },
  ],
  admins: [
    { id: 1, username: "superadmin", email: "admin@livingfoods.com", role: "owner", full_name: "Super Admin", password: "admin123" },
  ],
  products: [
    { id: 1, name: "Full Cream Milk", sku: "MILK-FC", category: "Dairy", price: 280, cost: 220, stock: 150, unit: "L" },
    { id: 2, name: "Cappuccino", sku: "CAP-01", category: "Coffee", price: 450, cost: 180, stock: 80, unit: "cup" },
    { id: 3, name: "Croissant", sku: "CROS-01", category: "Bakery", price: 180, cost: 90, stock: 40, unit: "pcs" },
    { id: 4, name: "Greek Yogurt", sku: "YOG-GR", category: "Dairy", price: 320, cost: 240, stock: 60, unit: "pcs" },
    { id: 5, name: "Cold Brew", sku: "CB-01", category: "Coffee", price: 520, cost: 200, stock: 30, unit: "cup" },
  ],
  vendors: [
    { id: 1, name: "Haleeb Foods", contact: "0311-1234567", email: "haleeb@supply.com", category: "Dairy Supplier" },
    { id: 2, name: "Nespresso PK", contact: "0333-7654321", email: "nespresso@pk.com", category: "Coffee Supplier" },
  ],
  riders: [
    { id: 1, name: "Kamran Ali", phone: "0300-5556677", vehicle: "Motorcycle", plate: "LHR-1234", status: "active" },
    { id: 2, name: "Tariq Mehmood", phone: "0312-4443322", vehicle: "Van", plate: "LHR-5678", status: "active" },
  ],
  routes: [
    { id: 1, name: "DHA Route", days: ["Mon", "Wed", "Fri"], riders: 1, stops: 12 },
    { id: 2, name: "Gulberg Route", days: ["Tue", "Thu", "Sat"], riders: 2, stops: 8 },
  ],
  orders: [
    { id: 1001, customer: "Aisha Khan", channel: "pos", total: 1450, status: "delivered", date: "2026-05-22", items: [{ name: "Full Cream Milk", qty: 5, price: 280 }] },
    { id: 1002, customer: "Bilal Ahmed", channel: "online", total: 900, status: "pending", date: "2026-05-23", items: [{ name: "Cappuccino", qty: 2, price: 450 }] },
  ],
  purchases: [
    { id: 1, vendor: "Haleeb Foods", product: "Full Cream Milk", qty: 200, unit_cost: 220, total: 44000, date: "2026-05-20", type: "vendor" },
  ],
  loyaltyTiers: [
    { id: 1, name: "Bronze", min_spend: 0, discount: 0, multiplier: 1 },
    { id: 2, name: "Silver", min_spend: 5000, discount: 5, multiplier: 1.25 },
    { id: 3, name: "Gold", min_spend: 15000, discount: 10, multiplier: 1.5 },
    { id: 4, name: "Platinum", min_spend: 50000, discount: 15, multiplier: 2 },
  ],
  ledger: [
    { id: 1, date: "2026-05-22", account: "Sales Revenue", debit: 0, credit: 1450, ref: "Order #1001", memo: "POS Sale" },
    { id: 2, date: "2026-05-22", account: "Cash on Hand", debit: 1450, credit: 0, ref: "Order #1001", memo: "Payment received" },
    { id: 3, date: "2026-05-20", account: "Inventory", debit: 44000, credit: 0, ref: "PO #1", memo: "Vendor purchase" },
    { id: 4, date: "2026-05-20", account: "Accounts Payable", debit: 0, credit: 44000, ref: "PO #1", memo: "Haleeb Foods invoice" },
  ],
  accounts: [
    { code: "1000", name: "Cash on Hand", type: "asset", balance: 85000 },
    { code: "1100", name: "Accounts Receivable", type: "asset", balance: 12500 },
    { code: "1200", name: "Inventory", type: "asset", balance: 220000 },
    { code: "2000", name: "Accounts Payable", type: "liability", balance: 44000 },
    { code: "2100", name: "Tax Payable", type: "liability", balance: 8500 },
    { code: "4000", name: "Sales Revenue", type: "revenue", balance: 185000 },
    { code: "5000", name: "Cost of Goods Sold", type: "expense", balance: 94000 },
    { code: "6000", name: "Salaries Expense", type: "expense", balance: 42000 },
    { code: "6100", name: "Rent Expense", type: "expense", balance: 18000 },
  ],
});

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: T.white, borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 18, color: T.darkGreen }}>{title}</h3>
          <button onClick={onClose} style={{ background: T.offWhite, color: T.textMid, padding: "6px 14px", borderRadius: 8, fontSize: 13 }}>✕ Close</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, color = T.darkGreen, textColor = T.white, size = "md", full = false, variant = "solid" }) {
  const sizes = { sm: { padding: "7px 14px", fontSize: 13 }, md: { padding: "10px 20px", fontSize: 14 }, lg: { padding: "13px 28px", fontSize: 15 } };
  const s = sizes[size];
  return (
    <button onClick={onClick} style={{ background: variant === "outline" ? "transparent" : color, color: variant === "outline" ? color : textColor, border: variant === "outline" ? `1.5px solid ${color}` : "none", padding: s.padding, fontSize: s.fontSize, fontWeight: 500, borderRadius: 8, width: full ? "100%" : "auto" }}>
      {children}
    </button>
  );
}

function PageHeader({ title, subtitle, back, onBack }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {back && <button onClick={onBack} style={{ background: "none", color: T.midGreen, fontWeight: 500, fontSize: 14, marginBottom: 12, padding: 0 }}>← Back to Dashboard</button>}
      <h2 style={{ fontSize: 26, color: T.darkGreen, marginBottom: 4 }}>{title}</h2>
      {subtitle && <p style={{ color: T.textLight, fontSize: 14 }}>{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, msg }) {
  return <div style={{ textAlign: "center", padding: "40px 20px", color: T.textLight }}>
    <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
    <p style={{ fontSize: 14 }}>{msg}</p>
  </div>;
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ setPage }) {
  const [hov, setHov] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: T.darkGreen, position: "relative", overflow: "hidden" }}>
      <style>{css}</style>
      {/* subtle pattern */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 80%, rgba(200,151,58,.18) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(74,140,92,.25) 0%, transparent 50%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 40 }}>
        {/* logo area */}
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22 }}>🌿</span>
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: T.white, letterSpacing: -0.5 }}>livingfoods</div>
            <div style={{ fontSize: 12, color: T.goldLight, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, marginTop: -2 }}>· com</div>
          </div>
        </div>
        <p style={{ color: "rgba(255,255,255,.55)", fontSize: 15, marginBottom: 64, letterSpacing: 1, fontWeight: 300 }}>Fresh. Pure. Delivered.</p>

        {/* two main buttons */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { id: "marketplace", label: "Marketplace", sub: "Shop fresh products", icon: "🛒", desc: "Browse our full range of dairy, beverages & artisan foods" },
            { id: "dairies", label: "Living Dairies", sub: "Farm to door", icon: "🥛", desc: "Pure, farm-fresh dairy delivered to your doorstep daily" },
          ].map(btn => (
            <div key={btn.id} onMouseEnter={() => setHov(btn.id)} onMouseLeave={() => setHov(null)}
              style={{ background: hov === btn.id ? T.gold : "rgba(255,255,255,.08)", border: `2px solid ${hov === btn.id ? T.gold : "rgba(255,255,255,.2)"}`, borderRadius: 20, padding: "40px 48px", textAlign: "center", cursor: "pointer", transition: "all .3s", minWidth: 260, backdropFilter: "blur(10px)" }}
              onClick={() => alert(`${btn.label} — coming soon!`)}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>{btn.icon}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: T.white, marginBottom: 6 }}>{btn.label}</div>
              <div style={{ fontSize: 13, color: hov === btn.id ? T.darkGreen : T.goldLight, fontWeight: 500, marginBottom: 10 }}>{btn.sub}</div>
              <p style={{ fontSize: 13, color: hov === btn.id ? T.darkGreen : "rgba(255,255,255,.55)", maxWidth: 200, lineHeight: 1.6 }}>{btn.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 60, display: "flex", gap: 48, color: "rgba(255,255,255,.35)", fontSize: 13 }}>
          {["100% Natural", "Same-Day Delivery", "Farm Certified"].map(t => (
            <span key={t}>✓ {t}</span>
          ))}
        </div>

        <button onClick={() => setPage("admin-login")} style={{ position: "fixed", top: 20, right: 24, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)", padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid rgba(255,255,255,.15)", cursor: "pointer" }}>
          Admin
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ setPage, state }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const login = () => {
    setLoading(true); setErr("");
    setTimeout(() => {
      const admin = state.admins.find(a => a.username === form.username && a.password === form.password);
      if (admin) { setPage("dashboard"); }
      else { setErr("Invalid credentials. Try superadmin / admin123"); }
      setLoading(false);
    }, 600);
  };
  return (
    <div style={{ minHeight: "100vh", background: T.cream, display: "flex" }}>
      <style>{css}</style>
      {/* left panel */}
      <div style={{ width: 420, background: T.darkGreen, display: "flex", flexDirection: "column", justifyContent: "center", padding: 56, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 70%, rgba(200,151,58,.2) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, fontSize: 20 }}>🌿</div>
          <h1 style={{ color: T.white, fontSize: 28, marginBottom: 8, lineHeight: 1.2 }}>Living Foods<br />Admin Console</h1>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>Manage your café operations, inventory, and customer relationships from one place.</p>
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 12 }}>
            {["POS & Sales", "Inventory Management", "Customer & Loyalty", "Accounting & Reports"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.65)", fontSize: 13 }}>
                <span style={{ color: T.gold }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, color: T.darkGreen, marginBottom: 6 }}>Sign in</h2>
            <p style={{ color: T.textLight, fontSize: 14 }}>Enter your admin credentials to continue</p>
          </div>
          <div className="field"><label>Username</label><input autoFocus value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="superadmin" onKeyDown={e => e.key === "Enter" && login()} /></div>
          <div className="field"><label>Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && login()} /></div>
          {err && <div style={{ background: "#FEE", color: T.danger, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{err}</div>}
          <Btn onClick={login} full color={T.darkGreen} size="lg">{loading ? "Signing in…" : "Sign in"}</Btn>
          <p style={{ textAlign: "center", marginTop: 16, color: T.textLight, fontSize: 12 }}>Hint: superadmin / admin123</p>
          <button onClick={() => setPage("home")} style={{ background: "none", color: T.textLight, fontSize: 13, marginTop: 20, display: "block", margin: "20px auto 0" }}>← Back to site</button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD (tiles) ────────────────────────────────────────────────────────
const TILES = [
  { id: "pos", icon: "🖥️", label: "Point of Sale", sub: "Scan loyalty, checkout", color: "#1A3A2A" },
  { id: "customers", icon: "👥", label: "Add Customers", sub: "Manage customer profiles", color: "#2D5A3D" },
  { id: "admins", icon: "🔐", label: "Add Admins", sub: "User & role management", color: "#1A3A2A" },
  { id: "loyalty", icon: "⭐", label: "Loyalty Program", sub: "Tiers, points & discounts", color: "#2D5A3D" },
  { id: "riders", icon: "🏍️", label: "Add Riders", sub: "Delivery fleet management", color: "#1A3A2A" },
  { id: "vendors", icon: "🏪", label: "Add Vendors", sub: "Supplier directory", color: "#2D5A3D" },
  { id: "gen-purchase", icon: "🛍️", label: "General Purchases", sub: "Expenses & misc buying", color: "#1A3A2A" },
  { id: "vendor-purchase", icon: "📦", label: "Vendor Purchases", sub: "Restock from suppliers", color: "#2D5A3D" },
  { id: "record-sale", icon: "💰", label: "Record Sale", sub: "Log counter & phone sales", color: "#1A3A2A" },
  { id: "invoice", icon: "📄", label: "Generate Invoice", sub: "Create & print invoices", color: "#2D5A3D" },
  { id: "ledger", icon: "📒", label: "View & Update Ledger", sub: "Journal entries & GL", color: "#1A3A2A" },
  { id: "accounts", icon: "📊", label: "Bookkeeping", sub: "Chart of accounts, P&L", color: "#2D5A3D" },
  { id: "routes", icon: "🗺️", label: "Add Routes", sub: "Delivery route management", color: "#1A3A2A" },
  { id: "db-table", icon: "🗄️", label: "Add by DB Table", sub: "Direct table editor", color: "#2D5A3D" },
  { id: "orders", icon: "📋", label: "View Orders", sub: "Track & update order status", color: "#1A3A2A" },
];

function Dashboard({ setPage, state }) {
  const [hovId, setHovId] = useState(null);
  const stats = [
    { label: "Today's Sales", value: `Rs ${(185000).toLocaleString()}` },
    { label: "Active Orders", value: state.orders.filter(o => o.status === "pending").length },
    { label: "Customers", value: state.customers.length },
    { label: "Low Stock", value: state.products.filter(p => p.stock < 50).length },
  ];
  return (
    <div style={{ minHeight: "100vh", background: T.cream }}>
      <style>{css}</style>
      {/* top bar */}
      <div style={{ background: T.darkGreen, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🌿</span>
          <span style={{ fontFamily: "'Playfair Display',serif", color: T.white, fontSize: 18, fontWeight: 600 }}>livingfoods</span>
          <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13, marginLeft: 8 }}>Admin Console</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "rgba(255,255,255,.6)", fontSize: 13 }}>🌿 Super Admin</span>
          <button onClick={() => setPage("home")} style={{ background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.8)", padding: "6px 14px", borderRadius: 8, fontSize: 13 }}>Sign out</button>
        </div>
      </div>
      <div style={{ padding: "28px 32px" }}>
        {/* stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: T.white, borderRadius: 12, padding: "18px 20px", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 12, color: T.textLight, fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: T.darkGreen }}>{s.value}</div>
            </div>
          ))}
        </div>
        {/* tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16 }}>
          {TILES.map(t => (
            <div key={t.id} onMouseEnter={() => setHovId(t.id)} onMouseLeave={() => setHovId(null)}
              onClick={() => setPage(t.id)}
              style={{ background: hovId === t.id ? t.color : T.white, border: `1.5px solid ${hovId === t.id ? t.color : T.border}`, borderRadius: 16, padding: "24px 20px", cursor: "pointer", transition: "all .25s", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{t.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: hovId === t.id ? T.white : T.darkGreen, lineHeight: 1.3, marginBottom: 6 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: hovId === t.id ? "rgba(255,255,255,.65)" : T.textLight, lineHeight: 1.4 }}>{t.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── POS ──────────────────────────────────────────────────────────────────────
function POS({ state, dispatch, setPage }) {
  const cats = [...new Set(state.products.map(p => p.category))];
  const [selCats, setSelCats] = useState(new Set(cats));
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loyaltyCode, setLoyaltyCode] = useState("");
  const [scanMsg, setScanMsg] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [receipt, setReceipt] = useState(null);

  const toggleCat = c => { const s = new Set(selCats); s.has(c) ? s.delete(c) : s.add(c); setSelCats(s); };
  const visible = state.products.filter(p => selCats.has(p.category));
  const addToCart = p => setCart(c => { const e = c.find(i => i.id === p.id); return e ? c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...c, { ...p, qty: 1 }]; });
  const removeItem = id => setCart(c => c.filter(i => i.id !== id));
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = customer ? (state.loyaltyTiers.find(t => t.name === customer.loyalty_tier)?.discount || 0) : 0;
  const discountAmt = Math.round(subtotal * discount / 100);
  const total = subtotal - discountAmt;

  const scanLoyalty = () => {
    const c = state.customers.find(c => c.id.toString() === loyaltyCode || c.phone.replace(/-/g, "") === loyaltyCode);
    if (c) { setCustomer(c); setScanMsg(`✓ ${c.name} — ${c.loyalty_tier} (${c.loyalty_points} pts)`); }
    else setScanMsg("❌ Customer not found");
  };

  const checkout = () => {
    if (!cart.length) return;
    const order = { id: Date.now(), customer: customer?.name || "Walk-in", channel: "pos", total, status: "completed", date: new Date().toISOString().split("T")[0], items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })) };
    dispatch({ type: "ADD_ORDER", order });
    setReceipt({ order, customer, discount, discountAmt, total, payMethod });
    setCart([]); setCustomer(null); setLoyaltyCode(""); setScanMsg("");
  };

  if (receipt) return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", background: T.white, borderRadius: 16, padding: 32, border: `1px solid ${T.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <h2 style={{ color: T.darkGreen }}>Sale Complete</h2>
          <p style={{ color: T.textLight, fontSize: 14, marginTop: 4 }}>Order #{receipt.order.id}</p>
        </div>
        {receipt.customer && <p style={{ fontSize: 14, marginBottom: 12 }}><strong>Customer:</strong> {receipt.customer.name}</p>}
        {receipt.order.items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 14 }}>
            <span>{it.name} × {it.qty}</span><span>Rs {(it.price * it.qty).toLocaleString()}</span>
          </div>
        ))}
        {receipt.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, color: T.success }}><span>Loyalty discount ({receipt.discount}%)</span><span>− Rs {receipt.discountAmt.toLocaleString()}</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 600, fontSize: 16 }}><span>Total</span><span>Rs {receipt.total.toLocaleString()}</span></div>
        <p style={{ fontSize: 13, color: T.textLight, marginBottom: 20 }}>Paid via {receipt.payMethod}</p>
        <Btn onClick={() => setReceipt(null)} full color={T.darkGreen}>New Sale</Btn>
        <div style={{ marginTop: 8 }}><Btn onClick={() => setPage("dashboard")} full variant="outline" color={T.darkGreen}>Back to Dashboard</Btn></div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.cream, display: "flex", flexDirection: "column" }}>
      <style>{css}</style>
      <div style={{ background: T.darkGreen, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setPage("dashboard")} style={{ background: "rgba(255,255,255,.1)", color: T.white, padding: "6px 14px", borderRadius: 8, fontSize: 13 }}>← Dashboard</button>
        <span style={{ color: T.white, fontWeight: 600, fontSize: 16 }}>🖥️ Point of Sale</span>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 360px", gap: 0 }}>
        {/* left: products */}
        <div style={{ padding: 24, overflow: "auto" }}>
          {/* loyalty scan */}
          <div style={{ background: T.white, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: T.darkGreen }}>📱 Scan Loyalty Card / QR</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={loyaltyCode} onChange={e => setLoyaltyCode(e.target.value)} placeholder="Enter customer ID or phone…" onKeyDown={e => e.key === "Enter" && scanLoyalty()} />
              <Btn onClick={scanLoyalty} color={T.gold} textColor={T.darkGreen}>Scan</Btn>
            </div>
            {scanMsg && <p style={{ fontSize: 13, marginTop: 8, color: scanMsg.startsWith("✓") ? T.success : T.danger }}>{scanMsg}</p>}
          </div>
          {/* categories */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {cats.map(c => (
              <label key={c} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: selCats.has(c) ? T.darkGreen : T.white, color: selCats.has(c) ? T.white : T.darkGreen, padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, border: `1.5px solid ${selCats.has(c) ? T.darkGreen : T.border}`, transition: "all .2s" }}>
                <input type="checkbox" checked={selCats.has(c)} onChange={() => toggleCat(c)} style={{ display: "none" }} />
                {c}
              </label>
            ))}
          </div>
          {/* products grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
            {visible.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} style={{ background: T.white, borderRadius: 12, padding: "16px 14px", cursor: "pointer", border: `1.5px solid ${T.border}`, transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.darkGreen; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; }}>
                <div style={{ fontSize: 11, color: T.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{p.category}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.darkGreen, marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.gold }}>Rs {p.price.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Stock: {p.stock} {p.unit}</div>
              </div>
            ))}
          </div>
        </div>
        {/* right: cart */}
        <div style={{ background: T.white, borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: T.darkGreen }}>Cart {customer && <span style={{ fontSize: 12, color: T.success }}>— {customer.name}</span>}</div>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {!cart.length ? <EmptyState icon="🛒" msg="Add items from the menu" /> : cart.map(i => (
              <div key={i.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{i.name}</div>
                  <div style={{ fontSize: 12, color: T.textLight }}>Rs {i.price.toLocaleString()} × {i.qty}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setCart(c => c.map(ci => ci.id === i.id ? { ...ci, qty: Math.max(1, ci.qty - 1) } : ci))} style={{ width: 26, height: 26, borderRadius: "50%", background: T.offWhite, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <span style={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>{i.qty}</span>
                  <button onClick={() => addToCart(i)} style={{ width: 26, height: 26, borderRadius: "50%", background: T.darkGreen, color: T.white, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  <button onClick={() => removeItem(i.id)} style={{ background: "none", color: T.danger, fontSize: 16, padding: "0 4px" }}>×</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 20, borderTop: `1px solid ${T.border}` }}>
            {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.textMid, marginBottom: 4 }}><span>Subtotal</span><span>Rs {subtotal.toLocaleString()}</span></div>}
            {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.success, marginBottom: 4 }}><span>Loyalty {discount}% off</span><span>− Rs {discountAmt.toLocaleString()}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, marginBottom: 16 }}><span>Total</span><span style={{ color: T.darkGreen }}>Rs {total.toLocaleString()}</span></div>
            <div className="field"><label>Payment method</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                {["Cash", "Card", "Easypaisa", "JazzCash", "Store Credit"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <Btn onClick={checkout} full color={T.gold} textColor={T.darkGreen} size="lg">Checkout → Rs {total.toLocaleString()}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GENERIC CRUD page factory ────────────────────────────────────────────────
function buildListPage(config) {
  return function Page({ state, dispatch, setPage }) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(config.emptyForm);
    const [search, setSearch] = useState("");
    const items = (state[config.stateKey] || []).filter(it =>
      config.searchFields.some(f => String(it[f] || "").toLowerCase().includes(search.toLowerCase()))
    );
    const openAdd = () => { setForm(config.emptyForm); setEditing(null); setShowForm(true); };
    const openEdit = it => { setForm({ ...it }); setEditing(it.id); setShowForm(true); };
    const save = () => {
      if (editing) dispatch({ type: config.updateAction, item: { ...form, id: editing } });
      else dispatch({ type: config.addAction, item: { ...form, id: Date.now() } });
      setShowForm(false);
    };
    const del = id => { if (window.confirm("Delete this record?")) dispatch({ type: config.deleteAction, id }); };
    return (
      <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
        <style>{css}</style>
        <PageHeader title={config.title} subtitle={config.subtitle} back onBack={() => setPage("dashboard")} />
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`} style={{ maxWidth: 320 }} />
          <Btn onClick={openAdd} color={T.darkGreen}>+ Add {config.singular}</Btn>
        </div>
        <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          {!items.length ? <EmptyState icon={config.emptyIcon || "📭"} msg={`No ${config.title.toLowerCase()} yet. Add one above.`} /> : (
            <table>
              <thead><tr>{config.columns.map(c => <th key={c.key}>{c.label}</th>)}<th>Actions</th></tr></thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id}>
                    {config.columns.map(c => <td key={c.key}>{c.render ? c.render(it[c.key], it) : (it[c.key] ?? "—")}</td>)}
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn onClick={() => openEdit(it)} size="sm" variant="outline" color={T.midGreen}>Edit</Btn>
                        <Btn onClick={() => del(it.id)} size="sm" variant="outline" color={T.danger}>Del</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {showForm && (
          <Modal title={editing ? `Edit ${config.singular}` : `Add ${config.singular}`} onClose={() => setShowForm(false)}>
            {config.fields.map(f => (
              <div key={f.key} className="field">
                <label>{f.label}</label>
                {f.type === "select" ? (
                  <select value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">— select —</option>
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} rows={3} />
                ) : (
                  <input type={f.type || "text"} value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? +e.target.value : e.target.value })} placeholder={f.placeholder || ""} />
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Btn onClick={save} color={T.darkGreen} full>Save</Btn>
              <Btn onClick={() => setShowForm(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
            </div>
          </Modal>
        )}
      </div>
    );
  };
}

const Customers = buildListPage({
  title: "Customers", singular: "Customer", subtitle: "Manage your customer profiles and credit accounts",
  stateKey: "customers", addAction: "ADD_CUSTOMER", updateAction: "UPDATE_CUSTOMER", deleteAction: "DELETE_CUSTOMER",
  searchFields: ["name", "phone", "email"], emptyIcon: "👥",
  emptyForm: { name: "", phone: "", email: "", address: "", loyalty_tier: "Bronze", credit_limit: 5000, credit_balance: 0, route: "" },
  columns: [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "loyalty_tier", label: "Tier", render: v => <span className={`badge badge-${v === "Gold" ? "amber" : v === "Silver" ? "blue" : "green"}`}>{v}</span> },
    { key: "loyalty_points", label: "Points" },
    { key: "credit_balance", label: "Balance", render: v => `Rs ${(v || 0).toLocaleString()}` },
    { key: "route", label: "Route" },
  ],
  fields: [
    { key: "name", label: "Full Name", placeholder: "Ali Khan" },
    { key: "phone", label: "Phone", placeholder: "0300-1234567" },
    { key: "email", label: "Email", type: "email" },
    { key: "address", label: "Address" },
    { key: "loyalty_tier", label: "Loyalty Tier", type: "select", options: ["Bronze", "Silver", "Gold", "Platinum"] },
    { key: "credit_limit", label: "Credit Limit (Rs)", type: "number" },
    { key: "credit_balance", label: "Current Balance (Rs)", type: "number" },
    { key: "route", label: "Delivery Route", placeholder: "DHA Route" },
  ],
});

const Admins = buildListPage({
  title: "Admins", singular: "Admin", subtitle: "Manage admin users and their roles",
  stateKey: "admins", addAction: "ADD_ADMIN", updateAction: "UPDATE_ADMIN", deleteAction: "DELETE_ADMIN",
  searchFields: ["username", "email", "full_name"], emptyIcon: "🔐",
  emptyForm: { full_name: "", username: "", email: "", role: "cashier", password: "" },
  columns: [
    { key: "full_name", label: "Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: v => <span className="badge badge-blue">{v}</span> },
  ],
  fields: [
    { key: "full_name", label: "Full Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email", type: "email" },
    { key: "role", label: "Role", type: "select", options: ["owner", "manager", "accountant", "cashier", "barista", "rider", "viewer"] },
    { key: "password", label: "Password", type: "password" },
  ],
});

const Riders = buildListPage({
  title: "Riders", singular: "Rider", subtitle: "Manage your delivery fleet",
  stateKey: "riders", addAction: "ADD_RIDER", updateAction: "UPDATE_RIDER", deleteAction: "DELETE_RIDER",
  searchFields: ["name", "phone", "plate"], emptyIcon: "🏍️",
  emptyForm: { name: "", phone: "", vehicle: "Motorcycle", plate: "", status: "active" },
  columns: [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "vehicle", label: "Vehicle" },
    { key: "plate", label: "Plate No." },
    { key: "status", label: "Status", render: v => <span className={`badge badge-${v === "active" ? "green" : "red"}`}>{v}</span> },
  ],
  fields: [
    { key: "name", label: "Full Name" },
    { key: "phone", label: "Phone" },
    { key: "vehicle", label: "Vehicle Type", type: "select", options: ["Motorcycle", "Van", "Car"] },
    { key: "plate", label: "Number Plate" },
    { key: "status", label: "Status", type: "select", options: ["active", "inactive", "on_leave"] },
  ],
});

const Vendors = buildListPage({
  title: "Vendors", singular: "Vendor", subtitle: "Manage your supplier directory",
  stateKey: "vendors", addAction: "ADD_VENDOR", updateAction: "UPDATE_VENDOR", deleteAction: "DELETE_VENDOR",
  searchFields: ["name", "email", "category"], emptyIcon: "🏪",
  emptyForm: { name: "", contact: "", email: "", category: "", address: "" },
  columns: [
    { key: "name", label: "Vendor Name" },
    { key: "contact", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "category", label: "Category" },
  ],
  fields: [
    { key: "name", label: "Vendor Name" },
    { key: "contact", label: "Contact Number" },
    { key: "email", label: "Email", type: "email" },
    { key: "category", label: "Category", type: "select", options: ["Dairy Supplier", "Coffee Supplier", "Bakery Supplier", "Packaging", "Utilities", "Other"] },
    { key: "address", label: "Address" },
  ],
});

const Routes = buildListPage({
  title: "Delivery Routes", singular: "Route", subtitle: "Manage delivery route schedules",
  stateKey: "routes", addAction: "ADD_ROUTE", updateAction: "UPDATE_ROUTE", deleteAction: "DELETE_ROUTE",
  searchFields: ["name"], emptyIcon: "🗺️",
  emptyForm: { name: "", days: "Mon,Wed,Fri", stops: 0, notes: "" },
  columns: [
    { key: "name", label: "Route Name" },
    { key: "days", label: "Days", render: v => Array.isArray(v) ? v.join(", ") : v },
    { key: "stops", label: "Stops" },
  ],
  fields: [
    { key: "name", label: "Route Name", placeholder: "DHA Phase 5" },
    { key: "days", label: "Active Days (comma-separated)", placeholder: "Mon,Wed,Fri" },
    { key: "stops", label: "Number of Stops", type: "number" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
});

// ─── LOYALTY PROGRAM ──────────────────────────────────────────────────────────
function LoyaltyProgram({ state, dispatch, setPage }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const save = () => {
    dispatch({ type: "UPDATE_LOYALTY_TIER", tier: { ...form, id: editing } });
    setEditing(null);
  };
  return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <PageHeader title="Loyalty Program" subtitle="Configure tiers, point multipliers and discount rates" back onBack={() => setPage("dashboard")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20, marginBottom: 32 }}>
        {state.loyaltyTiers.map(t => (
          <div key={t.id} style={{ background: T.white, borderRadius: 16, padding: 24, border: `2px solid ${t.name === "Gold" ? T.gold : t.name === "Platinum" ? "#9B59B6" : T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: t.name === "Gold" ? T.gold : T.darkGreen }}>{t.name}</div>
                <div style={{ fontSize: 13, color: T.textLight, marginTop: 2 }}>Min spend: Rs {t.min_spend?.toLocaleString() || 0}</div>
              </div>
              <Btn onClick={() => { setForm({ ...t }); setEditing(t.id); }} size="sm" variant="outline" color={T.midGreen}>Edit</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: T.offWhite, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>DISCOUNT</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.darkGreen }}>{t.discount}%</div>
              </div>
              <div style={{ background: T.offWhite, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>POINTS ×</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.darkGreen }}>{t.multiplier}×</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title="Edit Loyalty Tier" onClose={() => setEditing(null)}>
          {[
            { key: "name", label: "Tier Name" },
            { key: "min_spend", label: "Minimum Spend (Rs)", type: "number" },
            { key: "discount", label: "Discount (%)", type: "number" },
            { key: "multiplier", label: "Points Multiplier", type: "number" },
          ].map(f => (
            <div key={f.key} className="field">
              <label>{f.label}</label>
              <input type={f.type || "text"} value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? +e.target.value : e.target.value })} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} color={T.darkGreen} full>Save Changes</Btn>
            <Btn onClick={() => setEditing(null)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── PURCHASES (general + vendor) ─────────────────────────────────────────────
function PurchasePage({ state, dispatch, setPage, vendorOnly = false }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor: "", product: "", qty: 1, unit_cost: 0, type: vendorOnly ? "vendor" : "general", notes: "", date: new Date().toISOString().split("T")[0] });
  const filtered = state.purchases.filter(p => !vendorOnly || p.type === "vendor");
  const save = () => {
    dispatch({ type: "ADD_PURCHASE", item: { ...form, id: Date.now(), total: form.qty * form.unit_cost } });
    setShowForm(false);
    setForm({ ...form, vendor: "", product: "", qty: 1, unit_cost: 0, notes: "" });
  };
  return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <PageHeader title={vendorOnly ? "Vendor Purchases" : "General Purchases"} subtitle={vendorOnly ? "Record stock received from suppliers" : "Record general expenses and miscellaneous purchases"} back onBack={() => setPage("dashboard")} />
      <div style={{ marginBottom: 20 }}><Btn onClick={() => setShowForm(true)} color={T.darkGreen}>+ New Purchase</Btn></div>
      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 20 }}>
        {!filtered.length ? <EmptyState icon="📦" msg="No purchases recorded yet" /> : (
          <table>
            <thead><tr><th>Date</th><th>Vendor</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.date}</td><td>{p.vendor}</td><td>{p.product}</td><td>{p.qty}</td>
                  <td>Rs {(p.unit_cost || 0).toLocaleString()}</td><td style={{ fontWeight: 600 }}>Rs {(p.total || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showForm && (
        <Modal title="Record Purchase" onClose={() => setShowForm(false)}>
          <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          {vendorOnly && <div className="field"><label>Vendor</label><select value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })}><option value="">— select vendor —</option>{state.vendors.map(v => <option key={v.id}>{v.name}</option>)}</select></div>}
          <div className="field"><label>Product / Item</label><input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="e.g. Full Cream Milk" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label>Quantity</label><input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: +e.target.value })} /></div>
            <div className="field"><label>Unit Cost (Rs)</label><input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: +e.target.value })} /></div>
          </div>
          <div style={{ background: T.offWhite, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontWeight: 600, fontSize: 15 }}>Total: Rs {(form.qty * form.unit_cost).toLocaleString()}</div>
          <div className="field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div style={{ display: "flex", gap: 10 }}><Btn onClick={save} color={T.darkGreen} full>Save</Btn><Btn onClick={() => setShowForm(false)} variant="outline" color={T.textMid} full>Cancel</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ─── RECORD SALE ──────────────────────────────────────────────────────────────
function RecordSale({ state, dispatch, setPage }) {
  const [form, setForm] = useState({ customer: "", channel: "pos", items: [{ product: "", qty: 1, price: 0 }], notes: "", date: new Date().toISOString().split("T")[0], payment: "Cash" });
  const [saved, setSaved] = useState(false);
  const addItem = () => setForm({ ...form, items: [...form.items, { product: "", qty: 1, price: 0 }] });
  const updateItem = (i, key, val) => setForm({ ...form, items: form.items.map((it, idx) => idx === i ? { ...it, [key]: key === "product" ? val : +val } : it) });
  const total = form.items.reduce((s, i) => s + i.qty * i.price, 0);
  const save = () => {
    dispatch({ type: "ADD_ORDER", order: { id: Date.now(), customer: form.customer || "Walk-in", channel: form.channel, total, status: "completed", date: form.date, items: form.items } });
    setSaved(true);
  };
  if (saved) return <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}><style>{css}</style><div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", paddingTop: 80 }}><div style={{ fontSize: 48, marginBottom: 16 }}>✅</div><h2 style={{ color: T.darkGreen, marginBottom: 8 }}>Sale Recorded</h2><p style={{ color: T.textLight, fontSize: 14, marginBottom: 24 }}>Total: Rs {total.toLocaleString()}</p><div style={{ display: "flex", gap: 12, justifyContent: "center" }}><Btn onClick={() => setSaved(false)} color={T.darkGreen}>New Sale</Btn><Btn onClick={() => setPage("dashboard")} variant="outline" color={T.darkGreen}>Dashboard</Btn></div></div></div>;
  return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <PageHeader title="Record Sale" subtitle="Log a counter, phone, or delivery sale" back onBack={() => setPage("dashboard")} />
      <div style={{ maxWidth: 680, background: T.white, borderRadius: 16, padding: 32, border: `1px solid ${T.border}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
          <div className="field"><label>Customer</label><select value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })}><option value="">Walk-in (no account)</option>{state.customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
          <div className="field"><label>Channel</label><select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}><option value="pos">POS Counter</option><option value="phone">Phone Order</option><option value="online">Online</option><option value="route_delivery">Route Delivery</option></select></div>
        </div>
        <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        <div style={{ fontWeight: 600, fontSize: 14, color: T.darkGreen, marginBottom: 10, marginTop: 4 }}>Items</div>
        {form.items.map((it, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginBottom: 10, alignItems: "end" }}>
            <div><label>Product</label><select value={it.product} onChange={e => { const p = state.products.find(p => p.name === e.target.value); updateItem(i, "product", e.target.value); if (p) updateItem(i, "price", p.price); }}><option value="">— select —</option>{state.products.map(p => <option key={p.id}>{p.name}</option>)}</select></div>
            <div><label>Qty</label><input type="number" value={it.qty} onChange={e => updateItem(i, "qty", e.target.value)} /></div>
            <div><label>Price (Rs)</label><input type="number" value={it.price} onChange={e => updateItem(i, "price", e.target.value)} /></div>
            <div style={{ paddingBottom: 2 }}><Btn onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })} size="sm" variant="outline" color={T.danger}>×</Btn></div>
          </div>
        ))}
        <Btn onClick={addItem} size="sm" variant="outline" color={T.midGreen}>+ Add item</Btn>
        <div style={{ background: T.offWhite, borderRadius: 10, padding: "12px 16px", margin: "16px 0", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}>
          <span>Total</span><span style={{ color: T.darkGreen }}>Rs {total.toLocaleString()}</span>
        </div>
        <div className="field"><label>Payment Method</label><select value={form.payment} onChange={e => setForm({ ...form, payment: e.target.value })}>{["Cash", "Card", "Easypaisa", "JazzCash", "Store Credit"].map(m => <option key={m}>{m}</option>)}</select></div>
        <div className="field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        <Btn onClick={save} color={T.darkGreen} full size="lg">Record Sale</Btn>
      </div>
    </div>
  );
}

// ─── INVOICE ──────────────────────────────────────────────────────────────────
function Invoice({ state, setPage }) {
  const [custId, setCustId] = useState("");
  const [invoice, setInvoice] = useState(null);
  const generate = () => {
    const c = state.customers.find(c => c.id.toString() === custId);
    if (!c) return alert("Select a customer");
    const orders = state.orders.filter(o => o.customer === c.name && o.status !== "cancelled");
    setInvoice({ customer: c, orders, total: orders.reduce((s, o) => s + o.total, 0), id: `INV-${Date.now().toString().slice(-6)}`, date: new Date().toLocaleDateString() });
  };
  return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <PageHeader title="Generate Invoice" subtitle="Create a printable invoice for a customer" back onBack={() => setPage("dashboard")} />
      <div style={{ display: "grid", gridTemplateColumns: invoice ? "1fr 1fr" : "1fr", gap: 24, maxWidth: invoice ? "100%" : 500 }}>
        <div style={{ background: T.white, borderRadius: 16, padding: 24, border: `1px solid ${T.border}` }}>
          <div className="field"><label>Select Customer</label>
            <select value={custId} onChange={e => { setCustId(e.target.value); setInvoice(null); }}>
              <option value="">— choose customer —</option>
              {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Btn onClick={generate} color={T.darkGreen} full>Generate Invoice</Btn>
        </div>
        {invoice && (
          <div style={{ background: T.white, borderRadius: 16, padding: 32, border: `2px solid ${T.darkGreen}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <div><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: T.darkGreen }}>livingfoods</div><div style={{ fontSize: 12, color: T.textLight }}>livingfoods.com</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, fontSize: 16 }}>{invoice.id}</div><div style={{ fontSize: 13, color: T.textLight }}>{invoice.date}</div></div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>BILL TO</div>
              <div style={{ fontWeight: 600 }}>{invoice.customer.name}</div>
              <div style={{ fontSize: 13, color: T.textMid }}>{invoice.customer.phone}</div>
              <div style={{ fontSize: 13, color: T.textMid }}>{invoice.customer.address}</div>
            </div>
            <table><thead><tr><th>Order</th><th>Date</th><th>Amount</th></tr></thead>
              <tbody>{invoice.orders.map(o => <tr key={o.id}><td>#{o.id}</td><td>{o.date}</td><td>Rs {o.total.toLocaleString()}</td></tr>)}</tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, padding: "16px 0", borderTop: `2px solid ${T.darkGreen}`, marginTop: 8 }}>
              <span>Total Due</span><span style={{ color: T.darkGreen }}>Rs {invoice.total.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <Btn onClick={() => window.print()} color={T.darkGreen} size="sm">🖨️ Print</Btn>
              <Btn onClick={() => setInvoice(null)} variant="outline" color={T.textMid} size="sm">Clear</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LEDGER ───────────────────────────────────────────────────────────────────
function Ledger({ state, dispatch, setPage }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], account: "", debit: 0, credit: 0, ref: "", memo: "" });
  const accounts = [...new Set(state.ledger.map(l => l.account))];
  const save = () => { dispatch({ type: "ADD_LEDGER", entry: { ...form, id: Date.now(), debit: +form.debit, credit: +form.credit } }); setShowForm(false); };
  const totalDebit = state.ledger.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = state.ledger.reduce((s, e) => s + (e.credit || 0), 0);
  return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <PageHeader title="General Ledger" subtitle="View and post journal entries" back onBack={() => setPage("dashboard")} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[{ label: "Total Debits", val: totalDebit }, { label: "Total Credits", val: totalCredit }, { label: "Balance", val: totalDebit - totalCredit }].map(s => (
          <div key={s.label} style={{ background: T.white, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.label === "Balance" && s.val < 0 ? T.danger : T.darkGreen }}>Rs {Math.abs(s.val).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}><Btn onClick={() => setShowForm(true)} color={T.darkGreen}>+ New Entry</Btn></div>
      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <table>
          <thead><tr><th>Date</th><th>Account</th><th>Memo</th><th>Reference</th><th style={{ textAlign: "right" }}>Debit</th><th style={{ textAlign: "right" }}>Credit</th></tr></thead>
          <tbody>
            {state.ledger.map(e => (
              <tr key={e.id}>
                <td>{e.date}</td><td>{e.account}</td><td style={{ color: T.textMid }}>{e.memo}</td><td style={{ color: T.textLight, fontSize: 12 }}>{e.ref}</td>
                <td style={{ textAlign: "right", color: T.darkGreen, fontWeight: 500 }}>{e.debit ? `Rs ${e.debit.toLocaleString()}` : "—"}</td>
                <td style={{ textAlign: "right", color: "#8B4513", fontWeight: 500 }}>{e.credit ? `Rs ${e.credit.toLocaleString()}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <Modal title="New Ledger Entry" onClose={() => setShowForm(false)}>
          <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field"><label>Account</label><select value={form.account} onChange={e => setForm({ ...form, account: e.target.value })}><option value="">— select —</option>{state.accounts.map(a => <option key={a.code}>{a.name}</option>)}</select></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label>Debit (Rs)</label><input type="number" value={form.debit} onChange={e => setForm({ ...form, debit: e.target.value })} /></div>
            <div className="field"><label>Credit (Rs)</label><input type="number" value={form.credit} onChange={e => setForm({ ...form, credit: e.target.value })} /></div>
          </div>
          <div className="field"><label>Reference</label><input value={form.ref} onChange={e => setForm({ ...form, ref: e.target.value })} placeholder="Order #, Invoice #…" /></div>
          <div className="field"><label>Memo</label><input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} /></div>
          <div style={{ display: "flex", gap: 10 }}><Btn onClick={save} color={T.darkGreen} full>Post Entry</Btn><Btn onClick={() => setShowForm(false)} variant="outline" color={T.textMid} full>Cancel</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ─── BOOKKEEPING / ACCOUNTS ───────────────────────────────────────────────────
function Bookkeeping({ state, setPage }) {
  const byType = t => state.accounts.filter(a => a.type === t);
  const total = t => byType(t).reduce((s, a) => s + (a.balance || 0), 0);
  const revenue = total("revenue"), expenses = total("expense"), assets = total("asset"), liabilities = total("liability");
  const types = ["asset", "liability", "equity", "revenue", "expense"];
  const typeColors = { asset: T.success, liability: T.danger, equity: "#8B4513", revenue: T.darkGreen, expense: "#C8973A" };
  return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <PageHeader title="Bookkeeping & Accounts" subtitle="Chart of accounts, P&L summary" back onBack={() => setPage("dashboard")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[{ label: "Total Assets", val: assets, color: T.success }, { label: "Total Liabilities", val: liabilities, color: T.danger }, { label: "Revenue", val: revenue, color: T.darkGreen }, { label: "Net Income", val: revenue - expenses, color: revenue - expenses >= 0 ? T.success : T.danger }].map(s => (
          <div key={s.label} style={{ background: T.white, borderRadius: 12, padding: "18px 20px", border: `2px solid ${s.color}20` }}>
            <div style={{ fontSize: 12, color: T.textLight, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>Rs {Math.abs(s.val).toLocaleString()}</div>
          </div>
        ))}
      </div>
      {types.map(type => (
        <div key={type} style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ background: T.offWhite, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: typeColors[type] || T.darkGreen, textTransform: "capitalize" }}>{type}s</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Rs {total(type).toLocaleString()}</div>
          </div>
          <table>
            <thead><tr><th>Code</th><th>Account Name</th><th style={{ textAlign: "right" }}>Balance</th></tr></thead>
            <tbody>
              {byType(type).map(a => (
                <tr key={a.code}>
                  <td style={{ fontFamily: "monospace", fontSize: 13, color: T.textLight }}>{a.code}</td>
                  <td>{a.name}</td>
                  <td style={{ textAlign: "right", fontWeight: 500 }}>Rs {(a.balance || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────
function Orders({ state, dispatch, setPage }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const statuses = ["all", "pending", "confirmed", "preparing", "delivered", "completed", "cancelled"];
  const filtered = state.orders.filter(o =>
    (filter === "all" || o.status === filter) &&
    (o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toString().includes(search))
  );
  const updateStatus = (id, status) => { dispatch({ type: "UPDATE_ORDER_STATUS", id, status }); setSelected(s => s && s.id === id ? { ...s, status } : s); };
  const badgeClass = s => ({ pending: "badge-amber", confirmed: "badge-blue", preparing: "badge-blue", delivered: "badge-green", completed: "badge-green", cancelled: "badge-red" }[s] || "badge-amber");
  return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <PageHeader title="View Orders" subtitle="Track all orders and update status after customer calls" back onBack={() => setPage("dashboard")} />
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or order #…" style={{ maxWidth: 280 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {statuses.map(s => <button key={s} onClick={() => setFilter(s)} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", background: filter === s ? T.darkGreen : T.white, color: filter === s ? T.white : T.textMid, border: `1.5px solid ${filter === s ? T.darkGreen : T.border}` }}>{s}</button>)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 20 }}>
        <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          {!filtered.length ? <EmptyState icon="📋" msg="No orders found" /> : (
            <table>
              <thead><tr><th>Order #</th><th>Customer</th><th>Channel</th><th>Date</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => setSelected(o)}>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>#{o.id}</td>
                    <td style={{ fontWeight: 500 }}>{o.customer}</td>
                    <td><span className="badge badge-blue">{o.channel}</span></td>
                    <td style={{ color: T.textLight }}>{o.date}</td>
                    <td style={{ fontWeight: 600 }}>Rs {o.total.toLocaleString()}</td>
                    <td><span className={`badge ${badgeClass(o.status)}`}>{o.status}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}>
                        {["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "completed", "cancelled"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {selected && (
          <div style={{ background: T.white, borderRadius: 12, border: `2px solid ${T.darkGreen}`, padding: 24, height: "fit-content" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ color: T.darkGreen, fontSize: 16 }}>Order #{selected.id}</h3>
              <button onClick={() => setSelected(null)} style={{ background: T.offWhite, color: T.textMid, padding: "4px 10px", borderRadius: 6, fontSize: 12 }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.textLight }}>Customer</span><strong>{selected.customer}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.textLight }}>Channel</span><span>{selected.channel}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.textLight }}>Date</span><span>{selected.date}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.textLight }}>Status</span><span className={`badge ${badgeClass(selected.status)}`}>{selected.status}</span></div>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginBottom: 12 }}>
              {(selected.items || []).map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                  <span>{it.name} × {it.qty}</span><span>Rs {(it.price * it.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}><span>Total</span><span style={{ color: T.darkGreen }}>Rs {selected.total.toLocaleString()}</span></div>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, marginBottom: 8, display: "block" }}>Update status after customer call:</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: selected.status === s ? T.darkGreen : T.offWhite, color: selected.status === s ? T.white : T.textMid, border: `1px solid ${selected.status === s ? T.darkGreen : T.border}` }}>{s.replace(/_/g, " ")}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DB TABLE EDITOR ──────────────────────────────────────────────────────────
function DBTableEditor({ state, dispatch, setPage }) {
  const tables = [
    { key: "products", label: "Products", fields: ["name", "sku", "category", "price", "cost", "stock", "unit"] },
    { key: "customers", label: "Customers", fields: ["name", "phone", "email", "address"] },
    { key: "vendors", label: "Vendors", fields: ["name", "contact", "email", "category"] },
    { key: "riders", label: "Riders", fields: ["name", "phone", "vehicle", "plate"] },
    { key: "routes", label: "Routes", fields: ["name", "stops"] },
  ];
  const [activeTable, setActiveTable] = useState(tables[0]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const rows = state[activeTable.key] || [];
  const save = () => {
    dispatch({ type: "ADD_" + activeTable.key.toUpperCase().replace("S", ""), item: { ...form, id: Date.now() } });
    setShowForm(false); setForm({});
  };
  return (
    <div style={{ minHeight: "100vh", background: T.cream, padding: 32 }}>
      <style>{css}</style>
      <PageHeader title="Database Table Editor" subtitle="Direct table-level data management" back onBack={() => setPage("dashboard")} />
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {tables.map(t => <button key={t.key} onClick={() => setActiveTable(t)} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", background: activeTable.key === t.key ? T.darkGreen : T.white, color: activeTable.key === t.key ? T.white : T.textMid, border: `1.5px solid ${activeTable.key === t.key ? T.darkGreen : T.border}` }}>{t.label}</button>)}
        <Btn onClick={() => { setForm({}); setShowForm(true); }} color={T.gold} textColor={T.darkGreen}>+ Insert Row</Btn>
      </div>
      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "auto" }}>
        <table>
          <thead><tr><th>ID</th>{activeTable.fields.map(f => <th key={f}>{f}</th>)}</tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td style={{ fontFamily: "monospace", fontSize: 11, color: T.textLight }}>{String(row.id).slice(-6)}</td>
                {activeTable.fields.map(f => <td key={f}>{row[f] ?? "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState icon="🗄️" msg="No rows in this table" />}
      </div>
      {showForm && (
        <Modal title={`Insert into ${activeTable.label}`} onClose={() => setShowForm(false)}>
          {activeTable.fields.map(f => (
            <div key={f} className="field"><label>{f}</label><input value={form[f] || ""} onChange={e => setForm({ ...form, [f]: e.target.value })} /></div>
          ))}
          <div style={{ display: "flex", gap: 10 }}><Btn onClick={save} color={T.darkGreen} full>Insert</Btn><Btn onClick={() => setShowForm(false)} variant="outline" color={T.textMid} full>Cancel</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ─── REDUCER ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  const upsert = (arr, item) => arr.find(i => i.id === item.id) ? arr.map(i => i.id === item.id ? item : i) : [...arr, item];
  const remove = (arr, id) => arr.filter(i => i.id !== id);
  switch (action.type) {
    case "ADD_CUSTOMER": return { ...state, customers: [...state.customers, action.item] };
    case "UPDATE_CUSTOMER": return { ...state, customers: upsert(state.customers, action.item) };
    case "DELETE_CUSTOMER": return { ...state, customers: remove(state.customers, action.id) };
    case "ADD_ADMIN": return { ...state, admins: [...state.admins, action.item] };
    case "UPDATE_ADMIN": return { ...state, admins: upsert(state.admins, action.item) };
    case "DELETE_ADMIN": return { ...state, admins: remove(state.admins, action.id) };
    case "ADD_RIDER": return { ...state, riders: [...state.riders, action.item] };
    case "UPDATE_RIDER": return { ...state, riders: upsert(state.riders, action.item) };
    case "DELETE_RIDER": return { ...state, riders: remove(state.riders, action.id) };
    case "ADD_VENDOR": return { ...state, vendors: [...state.vendors, action.item] };
    case "UPDATE_VENDOR": return { ...state, vendors: upsert(state.vendors, action.item) };
    case "DELETE_VENDOR": return { ...state, vendors: remove(state.vendors, action.id) };
    case "ADD_ROUTE": return { ...state, routes: [...state.routes, action.item] };
    case "UPDATE_ROUTE": return { ...state, routes: upsert(state.routes, action.item) };
    case "DELETE_ROUTE": return { ...state, routes: remove(state.routes, action.id) };
    case "ADD_ORDER": return { ...state, orders: [action.order, ...state.orders] };
    case "UPDATE_ORDER_STATUS": return { ...state, orders: state.orders.map(o => o.id === action.id ? { ...o, status: action.status } : o) };
    case "ADD_PURCHASE": return { ...state, purchases: [...state.purchases, action.item] };
    case "ADD_LEDGER": return { ...state, ledger: [...state.ledger, action.entry] };
    case "UPDATE_LOYALTY_TIER": return { ...state, loyaltyTiers: state.loyaltyTiers.map(t => t.id === action.tier.id ? action.tier : t) };
    case "ADD_PRODUCT": return { ...state, products: [...state.products, action.item] };
    default: return state;
  }
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, appDispatch] = React.useReducer(reducer, null, () => {
    try { const s = localStorage.getItem("lf_state"); return s ? JSON.parse(s) : initState(); } catch { return initState(); }
  });
  const [page, setPage] = useState("home");

  useEffect(() => {
    try { localStorage.setItem("lf_state", JSON.stringify(appState)); } catch {}
  }, [appState]);

  // hash-based routing
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h === "admin" || h === "admin/login") setPage("admin-login");
  }, []);
  useEffect(() => {
    const map = { "home": "#", "admin-login": "#admin", "dashboard": "#admin/dashboard" };
    if (map[page]) window.history.replaceState(null, "", map[page] || "#");
  }, [page]);

  const props = { state: appState, dispatch: appDispatch, setPage };

  const pages = {
    "home": <HomePage setPage={setPage} />,
    "admin-login": <AdminLogin {...props} />,
    "dashboard": <Dashboard {...props} />,
    "pos": <POS {...props} />,
    "customers": <Customers {...props} />,
    "admins": <Admins {...props} />,
    "loyalty": <LoyaltyProgram {...props} />,
    "riders": <Riders {...props} />,
    "vendors": <Vendors {...props} />,
    "gen-purchase": <PurchasePage {...props} vendorOnly={false} />,
    "vendor-purchase": <PurchasePage {...props} vendorOnly={true} />,
    "record-sale": <RecordSale {...props} />,
    "invoice": <Invoice {...props} />,
    "ledger": <Ledger {...props} />,
    "accounts": <Bookkeeping {...props} />,
    "routes": <Routes {...props} />,
    "db-table": <DBTableEditor {...props} />,
    "orders": <Orders {...props} />,
  };

  return pages[page] || pages["home"];
}
