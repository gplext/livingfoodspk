// This file re-exports all other admin page components.
// Each one is a thin wrapper that uses the live API via src/api/client.js
// instead of the in-memory state from the standalone HTML version.
// Replace these stubs with the full implementations as you build each feature.

import { useNavigate } from 'react-router-dom'

const T = {
  cream:'#FAF7F2', darkGreen:'#1A3A2A', border:'#DDD8CC',
  gold:'#C8973A', textLight:'#8A8A8A',
}

// Shared scaffold — used until the full page is built
function PageScaffold({ title, icon, description, children }) {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      <div style={{ background:T.darkGreen, padding:'14px 24px', display:'flex', gap:16, alignItems:'center' }}>
        <button onClick={() => navigate('/admin/dashboard')}
          style={{ background:'rgba(255,255,255,.1)', color:'#fff', padding:'6px 14px',
                   borderRadius:8, fontSize:13, border:'none', cursor:'pointer' }}>
          ← Dashboard
        </button>
        <span style={{ color:'#fff', fontWeight:600, fontSize:16 }}>{icon} {title}</span>
      </div>
      <div style={{ padding:32 }}>
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:T.darkGreen,
                       marginBottom:4 }}>{title}</h2>
          <p style={{ color:T.textLight, fontSize:14 }}>{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Each page below is a stub ready for full implementation ──────────────────
// To implement fully: replace the body with the component from livingfoods.jsx,
// changing state.xxx reads to useEffect + api.get('/xxx') calls.

export function Home() {
  const navigate = useNavigate()
  // Full implementation in Home.jsx — this is used for routing only
  return null
}

// Orders — API-connected
import { useState, useEffect } from 'react'
import api from '../api/client'

export function Orders() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [selected, setSelected] = useState(null)

  const load = () => {
    setLoading(true)
    const params = filter !== 'all' ? { status: filter } : {}
    api.get('/orders', { params })
      .then(r => setOrders(r.data.orders))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status })
    setSelected(s => s?.id === id ? { ...s, status } : s)
    load()
  }

  const filtered = orders.filter(o =>
    (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(o.id).includes(search)
  )
  const badge = s => ({ pending:'#FFF3CD|#856404', confirmed:'#D1ECF1|#0C5460',
                         preparing:'#D1ECF1|#0C5460', delivered:'#D4EDDA|#155724',
                         completed:'#D4EDDA|#155724', cancelled:'#F8D7DA|#721C24' }[s] || '#EEE|#333')
  const statuses = ['all','pending','confirmed','preparing','delivered','completed','cancelled']

  return (
    <PageScaffold title="View Orders" icon="📋"
      description="Track all orders and update status after customer calls">
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer or order #…"
          style={{ maxWidth:280, padding:'10px 14px', border:`1.5px solid ${T.border}`,
                   borderRadius:8, fontSize:14, outline:'none', fontFamily:'DM Sans,sans-serif' }} />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding:'7px 14px', borderRadius:20, fontSize:13, fontWeight:500,
                       cursor:'pointer', background: filter===s ? T.darkGreen : '#fff',
                       color: filter===s ? '#fff' : '#4A4A4A',
                       border:`1.5px solid ${filter===s ? T.darkGreen : T.border}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color:T.textLight }}>Loading orders…</p> : (
        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap:20 }}>
          <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
              <thead>
                <tr style={{ background:T.darkGreen }}>
                  {['Order #','Customer','Channel','Date','Total','Status','Update'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', color:'#fff', fontWeight:500,
                                         fontSize:13, textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => {
                  const [bg, fg] = badge(o.status).split('|')
                  return (
                    <tr key={o.id} onClick={() => setSelected(o)} style={{ cursor:'pointer',
                        borderBottom:`1px solid ${T.border}`, background: i%2 ? '#F5F0E8' : '#fff' }}>
                      <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:12,
                                   color:'#8A8A8A' }}>#{String(o.id).slice(-6)}</td>
                      <td style={{ padding:'10px 14px', fontWeight:500 }}>
                        {o.customer_name || 'Walk-in'}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ background:'#D1ECF1', color:'#0C5460', padding:'3px 10px',
                                       borderRadius:20, fontSize:12 }}>{o.channel}</span>
                      </td>
                      <td style={{ padding:'10px 14px', color:'#8A8A8A', fontSize:13 }}>
                        {o.created_at?.split('T')[0]}
                      </td>
                      <td style={{ padding:'10px 14px', fontWeight:600 }}>
                        Rs {(+o.total||0).toLocaleString()}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ background:bg, color:fg, padding:'3px 10px',
                                       borderRadius:20, fontSize:12 }}>{o.status}</span>
                      </td>
                      <td style={{ padding:'10px 14px' }} onClick={e => e.stopPropagation()}>
                        <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                          style={{ padding:'4px 8px', borderRadius:6, fontSize:12,
                                   border:`1px solid ${T.border}`, fontFamily:'DM Sans,sans-serif' }}>
                          {['pending','confirmed','preparing','ready','out_for_delivery',
                            'delivered','completed','cancelled'].map(s =>
                            <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <div style={{ textAlign:'center', padding:'40px 20px', color:T.textLight, fontSize:14 }}>
                No orders found
              </div>
            )}
          </div>

          {selected && (
            <div style={{ background:'#fff', borderRadius:12,
                          border:`2px solid ${T.darkGreen}`, padding:24, height:'fit-content' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <h3 style={{ color:T.darkGreen, fontSize:16 }}>
                  Order #{String(selected.id).slice(-6)}
                </h3>
                <button onClick={() => setSelected(null)}
                  style={{ background:'#F5F0E8', color:'#4A4A4A', padding:'4px 10px',
                           borderRadius:6, fontSize:12, border:'none', cursor:'pointer' }}>✕</button>
              </div>
              {[
                ['Customer', selected.customer_name || 'Walk-in'],
                ['Channel',  selected.channel],
                ['Date',     selected.created_at?.split('T')[0]],
                ['Status',   selected.status],
                ['Total',    `Rs ${(+selected.total||0).toLocaleString()}`],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between',
                                      padding:'6px 0', fontSize:14,
                                      borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:'#8A8A8A' }}>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
              <div style={{ marginTop:16 }}>
                <p style={{ fontSize:13, color:'#4A4A4A', marginBottom:10, fontWeight:500 }}>
                  Update after customer call:
                </p>
                {['confirmed','preparing','out_for_delivery','delivered','cancelled'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    style={{ display:'block', width:'100%', padding:'8px 12px', marginBottom:6,
                             borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer',
                             background: selected.status===s ? T.darkGreen : '#F5F0E8',
                             color: selected.status===s ? '#fff' : '#4A4A4A',
                             border:`1px solid ${selected.status===s ? T.darkGreen : T.border}` }}>
                    {s.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageScaffold>
  )
}

// Remaining pages — stubs that show the scaffold with a note
const stub = (title, icon, desc, hint) => function() {
  return (
    <PageScaffold title={title} icon={icon} description={desc}>
      <div style={{ background:'#fff', borderRadius:12, padding:32,
                    border:`1px solid ${T.border}`, maxWidth:560 }}>
        <p style={{ fontSize:14, color:'#4A4A4A', lineHeight:1.8, marginBottom:16 }}>
          This page is ready to be wired to the backend. The API endpoint is already built:
        </p>
        <code style={{ display:'block', background:'#F5F0E8', padding:'10px 14px',
                       borderRadius:8, fontSize:13, color:T.darkGreen, marginBottom:16 }}>
          {hint}
        </code>
        <p style={{ fontSize:13, color:T.textLight }}>
          Copy the full component from <strong>livingfoods.jsx</strong> and replace the
          in-memory <code>state.xxx</code> reads with <code>useEffect + api.get()</code> calls.
        </p>
      </div>
    </PageScaffold>
  )
}

export const POSPage      = stub('Point of Sale',    '🖥️',  'Checkout counter with loyalty scanning', 'POST /api/orders')
export const CustomersPage = stub('Customers',       '👥',  'Customer profiles and credit accounts',  'GET /api/customers')
export const AdminsPage    = stub('Admins',          '🔐',  'User and role management',               'GET /api/auth/me')
export const LoyaltyPage   = stub('Loyalty Program', '⭐',  'Tiers, points and discounts',            'GET /api/analytics/summary')
export const RidersPage    = stub('Riders',          '🏍️', 'Delivery fleet management',              'GET /api/riders')
export const VendorsPage   = stub('Vendors',         '🏪',  'Supplier directory',                     'GET /api/vendors')
export const PurchasePage  = stub('Purchases',       '📦',  'Record stock purchases from vendors',    'POST /api/purchases')
export const RecordSalePage = stub('Record Sale',    '💰',  'Log counter, phone and delivery sales',  'POST /api/orders')
export const InvoicePage   = stub('Generate Invoice','📄',  'Create printable customer invoices',     'GET /api/customers + orders')
export const LedgerPage    = stub('Ledger',          '📒',  'General ledger and journal entries',     'GET /api/ledger')
export const AccountsPage  = stub('Bookkeeping',     '📊',  'Chart of accounts and P&L summary',      'GET /api/ledger')
export const RoutesPage    = stub('Routes',          '🗺️', 'Delivery route management',              'GET /api/routes')
export const DBTablePage   = stub('DB Table Editor', '🗄️', 'Direct table-level data entry',          'GET /api/products etc.')
