import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const T = {
  cream:'#FAF7F2', darkGreen:'#1A3A2A', midGreen:'#2D5A3D',
  gold:'#C8973A', white:'#FFFFFF', border:'#DDD8CC', textLight:'#8A8A8A', textMid:'#4A4A4A',
}

const TILES = [
  { path:'pos',             icon:'🖥️',  label:'Point of Sale',        sub:'Scan loyalty, checkout' },
  { path:'customers',       icon:'👥',  label:'Add Customers',         sub:'Manage customer profiles' },
  { path:'admins',          icon:'🔐',  label:'Add Admins',            sub:'User & role management' },
  { path:'loyalty',         icon:'⭐',  label:'Loyalty Program',       sub:'Tiers, points & discounts' },
  { path:'riders',          icon:'🏍️', label:'Add Riders',            sub:'Delivery fleet' },
  { path:'vendors',         icon:'🏪',  label:'Add Vendors',           sub:'Supplier directory' },
  { path:'gen-purchase',    icon:'🛍️', label:'General Purchases',     sub:'Expenses & misc buying' },
  { path:'vendor-purchase', icon:'📦',  label:'Vendor Purchases',      sub:'Restock from suppliers' },
  { path:'record-sale',     icon:'💰',  label:'Record Sale',           sub:'Log counter & phone sales' },
  { path:'invoice',         icon:'📄',  label:'Generate Invoice',      sub:'Create & print invoices' },
  { path:'ledger',          icon:'📒',  label:'View & Update Ledger',  sub:'Journal entries & GL' },
  { path:'accounts',        icon:'📊',  label:'Bookkeeping',           sub:'Chart of accounts, P&L' },
  { path:'routes',          icon:'🗺️', label:'Add Routes',            sub:'Delivery route management' },
  { path:'db-table',        icon:'🗄️', label:'Add by DB Table',       sub:'Direct table editor' },
  { path:'orders',          icon:'📋',  label:'View Orders',           sub:'Track & update status' },
]

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [hovId, setHovId]     = useState(null)
  const [stats, setStats]     = useState(null)
  const [statsErr, setStatsErr] = useState(false)

  useEffect(() => {
    api.get('/analytics/summary')
      .then(r => setStats(r.data))
      .catch((err) => { console.error('Dashboard stats error:', err); setStatsErr(true) })
  }, [])

  const handleLogout = () => { logout(); navigate('/admin') }

  const statCards = stats ? [
    { label: "Today's Revenue",  value: `Rs ${(stats.today_revenue||0).toLocaleString()}` },
    { label: 'Active Orders',    value: stats.today_orders || 0 },
    { label: 'Low Stock Items',  value: stats.low_stock_count || 0 },
    { label: 'Total Receivable', value: `Rs ${(stats.total_receivable||0).toLocaleString()}` },
  ] : [
    { label: "Today's Revenue",  value: '—' },
    { label: 'Active Orders',    value: '—' },
    { label: 'Low Stock Items',  value: '—' },
    { label: 'Total Receivable', value: '—' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      {/* Top bar */}
      <div style={{ background:T.darkGreen, padding:'0 32px', display:'flex',
                    alignItems:'center', justifyContent:'space-between', height:60 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>🌿</span>
          <span style={{ fontFamily:"'Playfair Display',serif", color:'#fff', fontSize:18, fontWeight:600 }}>
            livingfoods
          </span>
          <span style={{ color:'rgba(255,255,255,.3)', fontSize:13, marginLeft:8 }}>Admin Console</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ color:'rgba(255,255,255,.6)', fontSize:13 }}>
            👤 {user?.full_name || user?.username}
            <span style={{ marginLeft:6, background:'rgba(200,151,58,.3)', color:T.gold,
                           padding:'2px 8px', borderRadius:10, fontSize:11 }}>
              {user?.role}
            </span>
          </span>
          <button onClick={handleLogout}
            style={{ background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.8)',
                     padding:'6px 14px', borderRadius:8, fontSize:13, border:'none', cursor:'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ padding:'28px 32px' }}>
        {/* Stats */}
        {statsErr && (
          <div style={{ background:'#FFF3CD', color:'#856404', padding:'10px 16px', borderRadius:8,
                        fontSize:13, marginBottom:16 }}>
            ⚠️ Could not load live stats — API server may not be running yet. Stats will appear once connected.
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ background:T.white, borderRadius:12, padding:'18px 20px',
                                        border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:11, color:T.textLight, fontWeight:500, marginBottom:6,
                            textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
              <div style={{ fontSize:24, fontWeight:600, color:T.darkGreen }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:16 }}>
          {TILES.map(t => (
            <div key={t.path}
              onMouseEnter={() => setHovId(t.path)}
              onMouseLeave={() => setHovId(null)}
              onClick={() => navigate(`/admin/${t.path}`)}
              style={{ background: hovId===t.path ? T.darkGreen : T.white,
                       border:`1.5px solid ${hovId===t.path ? T.darkGreen : T.border}`,
                       borderRadius:16, padding:'24px 20px', cursor:'pointer',
                       transition:'all .25s', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>{t.icon}</div>
              <div style={{ fontSize:14, fontWeight:600, lineHeight:1.3, marginBottom:6,
                            color: hovId===t.path ? '#fff' : T.darkGreen }}>{t.label}</div>
              <div style={{ fontSize:12, lineHeight:1.4,
                            color: hovId===t.path ? 'rgba(255,255,255,.65)' : T.textLight }}>
                {t.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
