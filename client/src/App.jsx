import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import HomePage      from './pages/Home'
import AdminLogin    from './pages/AdminLogin'
import Dashboard     from './pages/Dashboard'
import POSPage       from './pages/POS'
import CustomersPage from './pages/Customers'
import AdminsPage    from './pages/AdminsPage'
import LoyaltyPage   from './pages/Loyalty'
import RidersPage    from './pages/Riders'
import VendorsPage   from './pages/Vendors'
import PurchasePage  from './pages/Purchases'
import RecordSalePage from './pages/RecordSale'
import InvoicePage   from './pages/Invoice'
import LedgerPage    from './pages/Ledger'
import AccountsPage  from './pages/Accounts'
import RoutesPage    from './pages/Routes'
import DBTablePage   from './pages/DBTable'
import OrdersPage    from './pages/Orders'

function Protected({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'DM Sans,sans-serif', color:'#4A8C5C', fontSize:15 }}>
      Loading…
    </div>
  )
  return isLoggedIn ? children : <Navigate to="/admin" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/"     element={<HomePage />} />
      <Route path="/admin" element={<AdminLogin />} />

      <Route path="/admin/dashboard"       element={<Protected><Dashboard /></Protected>} />
      <Route path="/admin/pos"             element={<Protected><POSPage /></Protected>} />
      <Route path="/admin/customers"       element={<Protected><CustomersPage /></Protected>} />
      <Route path="/admin/admins"          element={<Protected><AdminsPage /></Protected>} />
      <Route path="/admin/loyalty"         element={<Protected><LoyaltyPage /></Protected>} />
      <Route path="/admin/riders"          element={<Protected><RidersPage /></Protected>} />
      <Route path="/admin/vendors"         element={<Protected><VendorsPage /></Protected>} />
      <Route path="/admin/gen-purchase"    element={<Protected><PurchasePage vendorOnly={false} /></Protected>} />
      <Route path="/admin/vendor-purchase" element={<Protected><PurchasePage vendorOnly={true} /></Protected>} />
      <Route path="/admin/record-sale"     element={<Protected><RecordSalePage /></Protected>} />
      <Route path="/admin/invoice"         element={<Protected><InvoicePage /></Protected>} />
      <Route path="/admin/ledger"          element={<Protected><LedgerPage /></Protected>} />
      <Route path="/admin/accounts"        element={<Protected><AccountsPage /></Protected>} />
      <Route path="/admin/routes"          element={<Protected><RoutesPage /></Protected>} />
      <Route path="/admin/db-table"        element={<Protected><DBTablePage /></Protected>} />
      <Route path="/admin/orders"          element={<Protected><OrdersPage /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
