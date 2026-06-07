import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Spinner } from '../components/shared'

export default function Invoice() {
  const [customers, setCustomers] = useState([])
  const [custId,    setCustId]    = useState('')
  const [invoice,   setInvoice]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [generating,setGenerating]= useState(false)

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.customers)).finally(() => setLoading(false))
  }, [])

  const generate = async () => {
    if (!custId) return alert('Select a customer first')
    setGenerating(true)
    try {
      const [custRes, ordersRes] = await Promise.all([
        api.get(`/customers/${custId}`),
        api.get('/orders', { params: { customer_id: custId } }),
      ])
      const customer = custRes.data.customer
      const orders   = ordersRes.data.orders.filter(o => !['cancelled','open'].includes(o.status))
      const total    = orders.reduce((s, o) => s + (+o.total||0), 0)
      setInvoice({ customer, orders, total, id:`INV-${Date.now().toString().slice(-6)}`, date: new Date().toLocaleDateString('en-PK') })
    } catch { alert('Failed to generate invoice') }
    finally { setGenerating(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      <GlobalStyles />
      <TopBar title="Generate Invoice" icon="📄" />
      <div style={{ padding:32 }}>
        <PageHeader title="Generate Invoice" subtitle="Create a printable invoice for a customer" />
        <div style={{ display:'grid', gridTemplateColumns: invoice ? '340px 1fr' : '340px', gap:24 }}>
          <div style={{ background:T.white, borderRadius:16, padding:24, border:`1px solid ${T.border}`, height:'fit-content' }}>
            <div className="field">
              <label>Select Customer</label>
              {loading ? <Spinner /> : (
                <select value={custId} onChange={e => { setCustId(e.target.value); setInvoice(null) }}>
                  <option value="">— choose customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name || c.display_name}</option>)}
                </select>
              )}
            </div>
            <Btn onClick={generate} disabled={generating || !custId} full color={T.darkGreen}>
              {generating ? 'Generating…' : 'Generate Invoice'}
            </Btn>
          </div>

          {invoice && (
            <div style={{ background:T.white, borderRadius:16, padding:32, border:`2px solid ${T.darkGreen}` }} id="invoice-print">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:28 }}>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:T.darkGreen, fontWeight:700 }}>livingfoods</div>
                  <div style={{ fontSize:12, color:T.textLight, marginTop:2 }}>livingfoods.com</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:16, color:T.darkGreen }}>{invoice.id}</div>
                  <div style={{ fontSize:13, color:T.textLight, marginTop:2 }}>{invoice.date}</div>
                </div>
              </div>
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:11, color:T.textLight, marginBottom:6, textTransform:'uppercase', letterSpacing:0.8 }}>Bill To</div>
                <div style={{ fontWeight:600, fontSize:15 }}>{invoice.customer.full_name || invoice.customer.display_name}</div>
                <div style={{ fontSize:13, color:T.textMid, marginTop:2 }}>{invoice.customer.phone}</div>
                {invoice.customer.credit_balance > 0 && (
                  <div style={{ fontSize:13, color:T.danger, marginTop:4 }}>Outstanding credit: Rs {(+invoice.customer.credit_balance).toLocaleString()}</div>
                )}
              </div>
              {!invoice.orders.length
                ? <p style={{ color:T.textLight, fontSize:14, padding:'20px 0' }}>No completed orders for this customer.</p>
                : <>
                    <table style={{ marginBottom:0 }}>
                      <thead><tr><th>Order #</th><th>Date</th><th>Channel</th><th style={{ textAlign:'right' }}>Amount</th></tr></thead>
                      <tbody>
                        {invoice.orders.map(o => (
                          <tr key={o.id}>
                            <td style={{ fontFamily:'monospace', fontSize:12, color:T.textLight }}>{o.order_number || `#${String(o.id).slice(-6)}`}</td>
                            <td style={{ color:T.textLight, fontSize:13 }}>{o.created_at?.split('T')[0]}</td>
                            <td><span className="badge badge-blue">{o.channel}</span></td>
                            <td style={{ textAlign:'right', fontWeight:500 }}>Rs {(+o.total||0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:18, padding:'16px 14px', borderTop:`2px solid ${T.darkGreen}`, marginTop:8 }}>
                      <span>Total Due</span>
                      <span style={{ color:T.darkGreen }}>Rs {invoice.total.toLocaleString()}</span>
                    </div>
                  </>
              }
              <div style={{ marginTop:16, display:'flex', gap:10 }}>
                <Btn onClick={() => window.print()} size="sm" color={T.darkGreen}>🖨️ Print</Btn>
                <Btn onClick={() => setInvoice(null)} size="sm" variant="outline" color={T.textMid}>Clear</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
