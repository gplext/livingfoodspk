import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Spinner, ErrBanner } from '../components/shared'

export default function RecordSale() {
  const [products,   setProducts]   = useState([])
  const [customers,  setCustomers]  = useState([])
  const [payMethods, setPayMethods] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [done,       setDone]       = useState(null)
  const [err,        setErr]        = useState('')
  const [form, setForm] = useState({
    customer_id:'', channel:'pos', payment_method_id:'',
    discount_amount:0, notes:'',
    items:[{ product_id:'', quantity:1, unit_price:0 }],
  })

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/customers'),
      api.get('/payment-methods').catch(() => ({ data:{ methods:[] } })),
    ]).then(([p, c, m]) => {
      setProducts(p.data.products)
      setCustomers(c.data.customers)
      const methods = m.data.methods || []
      setPayMethods(methods)
      if (methods[0]) setForm(f => ({ ...f, payment_method_id: methods[0].id }))
    }).finally(() => setLoading(false))
  }, [])

  const updateItem = (i, key, val) =>
    setForm(f => ({ ...f, items: f.items.map((it,idx) => idx===i ? { ...it, [key]: val } : it) }))

  const subtotal = form.items.reduce((s,i) => s + (+i.quantity||0) * (+i.unit_price||0), 0)
  const total    = subtotal - (+form.discount_amount||0)

  const save = async () => {
    if (!form.items[0].product_id) { setErr('Add at least one item'); return }
    setSaving(true); setErr('')
    try {
      const r = await api.post('/orders', {
        customer_id: form.customer_id || null,
        channel: form.channel,
        payment_method_id: form.payment_method_id || null,
        discount_amount: +form.discount_amount || 0,
        notes: form.notes,
        idempotency_key: `sale-${Date.now()}`,
        items: form.items.filter(i => i.product_id).map(i => ({ product_id:i.product_id, quantity:+i.quantity, unit_price:+i.unit_price })),
      })
      setDone({ orderId: r.data.order_number, total })
    } catch (e) { setErr(e.response?.data?.error || 'Failed to record sale') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ minHeight:'100vh', background:T.cream }}><GlobalStyles /><TopBar title="Record Sale" icon="💰" /><Spinner /></div>

  if (done) return (
    <div style={{ minHeight:'100vh', background:T.cream, padding:32 }}>
      <GlobalStyles /><TopBar title="Record Sale" icon="💰" />
      <div style={{ maxWidth:420, margin:'60px auto', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <h2 style={{ color:T.darkGreen, marginBottom:8 }}>Sale Recorded</h2>
        <p style={{ color:T.textLight, fontSize:14, marginBottom:24 }}>Order {done.orderId} · Rs {done.total.toLocaleString()}</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <Btn onClick={() => { setDone(null); setForm({ customer_id:'', channel:'pos', payment_method_id: payMethods[0]?.id||'', discount_amount:0, notes:'', items:[{product_id:'',quantity:1,unit_price:0}] }) }} color={T.darkGreen}>New Sale</Btn>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      <GlobalStyles />
      <TopBar title="Record Sale" icon="💰" />
      <div style={{ padding:32 }}>
        <PageHeader title="Record Sale" subtitle="Log a counter, phone or delivery sale" />
        <div style={{ maxWidth:680, background:T.white, borderRadius:16, padding:32, border:`1px solid ${T.border}` }}>
          <ErrBanner msg={err} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:4 }}>
            <div className="field">
              <label>Customer</label>
              <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id:e.target.value })}>
                <option value="">Walk-in (no account)</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name || c.display_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Channel</label>
              <select value={form.channel} onChange={e => setForm({ ...form, channel:e.target.value })}>
                <option value="pos">POS Counter</option>
                <option value="phone">Phone Order</option>
                <option value="online">Online</option>
                <option value="route_delivery">Route Delivery</option>
              </select>
            </div>
          </div>

          <div style={{ fontWeight:600, fontSize:14, color:T.darkGreen, marginBottom:10, marginTop:4 }}>Items</div>
          {form.items.map((it,i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:10, marginBottom:10, alignItems:'end' }}>
              <div>
                {i===0 && <label>Product</label>}
                <select value={it.product_id} onChange={e => { const p=products.find(p=>p.id===e.target.value); updateItem(i,'product_id',e.target.value); if(p) updateItem(i,'unit_price',p.sale_price) }}>
                  <option value="">— select —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>{i===0 && <label>Qty</label>}<input type="number" min="1" value={it.quantity} onChange={e => updateItem(i,'quantity',e.target.value)} /></div>
              <div>{i===0 && <label>Price (Rs)</label>}<input type="number" min="0" value={it.unit_price} onChange={e => updateItem(i,'unit_price',e.target.value)} /></div>
              <div style={{ paddingBottom:2 }}>
                {form.items.length>1 && <Btn onClick={() => setForm(f => ({ ...f, items:f.items.filter((_,idx)=>idx!==i) }))} size="sm" variant="outline" color={T.danger}>✕</Btn>}
              </div>
            </div>
          ))}
          <Btn onClick={() => setForm(f => ({ ...f, items:[...f.items,{product_id:'',quantity:1,unit_price:0}] }))} size="sm" variant="outline" color={T.midGreen}>+ Add item</Btn>

          <div style={{ background:T.offWhite, borderRadius:10, padding:'12px 16px', margin:'16px 0', display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:16 }}>
            <span>Total</span><span style={{ color:T.darkGreen }}>Rs {total.toLocaleString()}</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="field">
              <label>Payment Method</label>
              <select value={form.payment_method_id} onChange={e => setForm({ ...form, payment_method_id:e.target.value })}>
                <option value="">— select —</option>
                {payMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Discount (Rs)</label>
              <input type="number" min="0" value={form.discount_amount} onChange={e => setForm({ ...form, discount_amount:e.target.value })} />
            </div>
          </div>
          <div className="field"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes:e.target.value })} /></div>
          <Btn onClick={save} disabled={saving} full color={T.darkGreen} size="lg">{saving ? 'Saving…' : 'Record Sale'}</Btn>
        </div>
      </div>
    </div>
  )
}
