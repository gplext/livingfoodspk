import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Spinner, Empty, Card } from '../components/shared'

export default function Orders() {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)

  const STATUSES = ['all','pending','confirmed','preparing','ready','out_for_delivery','delivered','completed','cancelled']

  const load = () => {
    setLoading(true)
    const params = filter !== 'all' ? { status: filter } : {}
    api.get('/orders', { params }).then(r => setOrders(r.data.orders)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status })
    setSelected(s => s?.id === id ? { ...s, status } : s)
    load()
  }

  const badgeClass = s => ({
    pending:'badge-amber', confirmed:'badge-blue', preparing:'badge-blue',
    ready:'badge-blue', out_for_delivery:'badge-blue',
    delivered:'badge-green', completed:'badge-green',
    paid:'badge-green', cancelled:'badge-red',
  }[s] || 'badge-amber')

  const filtered = orders.filter(o =>
    (o.customer_name||'Walk-in').toLowerCase().includes(search.toLowerCase()) ||
    (o.order_number||'').includes(search) ||
    String(o.id).includes(search)
  )

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      <GlobalStyles />
      <TopBar title="View Orders" icon="📋" />
      <div style={{ padding:32 }}>
        <PageHeader title="Orders" subtitle="Track all orders and update status after customer calls" />
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or order #…" style={{ maxWidth:280 }} />
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                style={{ padding:'7px 14px', borderRadius:20, fontSize:13, fontWeight:500, cursor:'pointer',
                         background:filter===s ? T.darkGreen : T.white,
                         color:filter===s ? T.white : T.textMid,
                         border:`1.5px solid ${filter===s ? T.darkGreen : T.border}` }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap:20 }}>
          <Card>
            {loading ? <Spinner /> : !filtered.length ? <Empty icon="📋" msg="No orders found" /> : (
              <table>
                <thead>
                  <tr>
                    {['Order #','Customer','Channel','Date','Total','Status','Update'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o.id} onClick={() => setSelected(o)} style={{ cursor:'pointer' }}>
                      <td style={{ fontFamily:'monospace', fontSize:12, color:T.textLight }}>{o.order_number || `#${String(o.id).slice(-6)}`}</td>
                      <td style={{ fontWeight:500 }}>{o.customer_name || 'Walk-in'}</td>
                      <td><span className="badge badge-blue">{o.channel}</span></td>
                      <td style={{ color:T.textLight, fontSize:13 }}>{o.created_at?.split('T')[0]}</td>
                      <td style={{ fontWeight:600 }}>Rs {(+o.total||0).toLocaleString()}</td>
                      <td><span className={`badge ${badgeClass(o.status)}`}>{o.status}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                          style={{ padding:'4px 8px', fontSize:12, borderRadius:6, border:`1px solid ${T.border}`, fontFamily:'DM Sans,sans-serif' }}>
                          {STATUSES.slice(1).map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {selected && (
            <div style={{ background:T.white, borderRadius:12, border:`2px solid ${T.darkGreen}`, padding:24, height:'fit-content' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <h3 style={{ color:T.darkGreen, fontSize:16 }}>{selected.order_number || `Order #${String(selected.id).slice(-6)}`}</h3>
                <button onClick={() => setSelected(null)} style={{ background:T.offWhite, color:T.textMid, padding:'4px 10px', borderRadius:6, fontSize:12, border:'none', cursor:'pointer' }}>✕</button>
              </div>
              {[
                ['Customer', selected.customer_name || 'Walk-in'],
                ['Channel',  selected.channel],
                ['Date',     selected.created_at?.split('T')[0]],
                ['Status',   selected.status],
                ['Total',    `Rs ${(+selected.total||0).toLocaleString()}`],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', fontSize:14, borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.textLight }}>{k}</span>
                  <strong>{k==='Status' ? <span className={`badge ${badgeClass(selected.status)}`}>{v}</span> : v}</strong>
                </div>
              ))}
              <div style={{ marginTop:16 }}>
                <p style={{ fontSize:13, color:T.textMid, marginBottom:10, fontWeight:500 }}>Update after customer call:</p>
                {['confirmed','preparing','out_for_delivery','delivered','cancelled'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    style={{ display:'block', width:'100%', padding:'8px 12px', marginBottom:6, borderRadius:8,
                             fontSize:13, fontWeight:500, cursor:'pointer', textAlign:'left',
                             background:selected.status===s ? T.darkGreen : T.offWhite,
                             color:selected.status===s ? T.white : T.textMid,
                             border:`1px solid ${selected.status===s ? T.darkGreen : T.border}` }}>
                    {s.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
