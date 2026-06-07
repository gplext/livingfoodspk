import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { T, GlobalStyles, Btn, Spinner } from '../components/shared'

export default function POS() {
  const navigate = useNavigate()
  const [products, setProducts]     = useState([])
  const [payMethods, setPayMethods] = useState([])
  const [categories, setCategories] = useState([])
  const [selCats, setSelCats]       = useState(new Set())
  const [cart, setCart]             = useState([])
  const [customer, setCustomer]     = useState(null)
  const [loyaltyCode, setLoyaltyCode] = useState('')
  const [scanMsg, setScanMsg]       = useState('')
  const [payMethod, setPayMethod]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [receipt, setReceipt]       = useState(null)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/products', { params: { active: true } }),
      api.get('/payment-methods').catch(() => ({ data: { methods: [] } })),
    ]).then(([p, m]) => {
      const prods = p.data.products
      setProducts(prods)
      const cats = [...new Set(prods.map(x => x.category_name || 'Other'))]
      setCategories(cats)
      setSelCats(new Set(cats))
      const methods = m.data.methods || []
      setPayMethods(methods)
      if (methods[0]) setPayMethod(methods[0].id)
    }).finally(() => setLoading(false))
  }, [])

  const toggleCat = c => setSelCats(s => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n })
  const visible   = products.filter(p => selCats.has(p.category_name || 'Other'))

  const addToCart = p => setCart(c => {
    const e = c.find(i => i.id === p.id)
    return e ? c.map(i => i.id === p.id ? { ...i, qty: i.qty+1 } : i) : [...c, { ...p, qty:1 }]
  })
  const changeQty  = (id, delta) => setCart(c => c.map(i => i.id===id ? { ...i, qty: Math.max(1, i.qty+delta) } : i))
  const removeItem = id => setCart(c => c.filter(i => i.id !== id))

  const subtotal    = cart.reduce((s, i) => s + i.sale_price * i.qty, 0)
  const discountPct = customer ? (customer.discount_pct || 0) : 0
  const discountAmt = Math.round(subtotal * discountPct / 100)
  const total       = subtotal - discountAmt

  const scanLoyalty = async () => {
    if (!loyaltyCode.trim()) return
    try {
      const r = await api.get('/customers', { params: { search: loyaltyCode } })
      const c = r.data.customers?.[0]
      if (c) { setCustomer(c); setScanMsg(`✓ ${c.full_name || c.display_name} — ${c.loyalty_tier || 'Bronze'} (${c.loyalty_points||0} pts)`) }
      else     setScanMsg('❌ Customer not found')
    } catch { setScanMsg('❌ Search failed') }
  }

  const checkout = async () => {
    if (!cart.length) return
    setSaving(true)
    try {
      const r = await api.post('/orders', {
        customer_id: customer?.id || null,
        channel: 'pos',
        payment_method_id: payMethod || null,
        discount_amount: discountAmt,
        idempotency_key: `pos-${Date.now()}`,
        items: cart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.sale_price })),
      })
      setReceipt({ orderId: r.data.order_number, customer, cart, discountPct, discountAmt, total, payMethod })
      setCart([]); setCustomer(null); setLoyaltyCode(''); setScanMsg('')
    } catch (e) {
      alert(e.response?.data?.error || 'Checkout failed')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ minHeight:'100vh', background:T.cream, display:'flex', alignItems:'center', justifyContent:'center' }}><GlobalStyles /><Spinner /></div>

  if (receipt) return (
    <div style={{ minHeight:'100vh', background:T.cream, padding:32 }}>
      <GlobalStyles />
      <div style={{ maxWidth:480, margin:'0 auto', background:T.white, borderRadius:16, padding:32, border:`1px solid ${T.border}` }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <h2 style={{ color:T.darkGreen, marginBottom:4 }}>Sale Complete</h2>
          <p style={{ color:T.textLight, fontSize:14 }}>Order {receipt.orderId}</p>
        </div>
        {receipt.customer && <p style={{ fontSize:14, marginBottom:12 }}><strong>Customer:</strong> {receipt.customer.full_name || receipt.customer.display_name}</p>}
        {receipt.cart.map((it,i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${T.border}`, fontSize:14 }}>
            <span>{it.name} × {it.qty}</span>
            <span>Rs {(it.sale_price * it.qty).toLocaleString()}</span>
          </div>
        ))}
        {receipt.discountPct > 0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize:14, color:T.success }}><span>Loyalty {receipt.discountPct}% off</span><span>− Rs {receipt.discountAmt.toLocaleString()}</span></div>}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', fontWeight:600, fontSize:18 }}><span>Total</span><span>Rs {receipt.total.toLocaleString()}</span></div>
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <Btn onClick={() => setReceipt(null)} full>New Sale</Btn>
          <Btn onClick={() => navigate('/admin/dashboard')} variant="outline" color={T.darkGreen} full>Dashboard</Btn>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:T.cream, display:'flex', flexDirection:'column' }}>
      <GlobalStyles />
      <div style={{ background:T.darkGreen, padding:'14px 24px', display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={() => navigate('/admin/dashboard')} style={{ background:'rgba(255,255,255,.1)', color:T.white, padding:'6px 14px', borderRadius:8, fontSize:13 }}>← Dashboard</button>
        <span style={{ color:T.white, fontWeight:600, fontSize:16 }}>🖥️ Point of Sale</span>
      </div>
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 360px' }}>
        {/* Left — products */}
        <div style={{ padding:24, overflow:'auto' }}>
          {/* Loyalty scan */}
          <div style={{ background:T.white, borderRadius:12, padding:16, marginBottom:20, border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:10, color:T.darkGreen }}>📱 Scan Loyalty Card / QR</div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={loyaltyCode} onChange={e => setLoyaltyCode(e.target.value)} placeholder="Customer ID, phone or barcode…" onKeyDown={e => e.key==='Enter' && scanLoyalty()} />
              <Btn onClick={scanLoyalty} color={T.gold} textColor={T.darkGreen}>Scan</Btn>
            </div>
            {scanMsg && <p style={{ fontSize:13, marginTop:8, color:scanMsg.startsWith('✓') ? T.success : T.danger }}>{scanMsg}</p>}
          </div>
          {/* Category filter */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {categories.map(c => (
              <label key={c} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                background:selCats.has(c) ? T.darkGreen : T.white,
                color:selCats.has(c) ? T.white : T.darkGreen,
                padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:500,
                border:`1.5px solid ${selCats.has(c) ? T.darkGreen : T.border}`, transition:'all .2s' }}>
                <input type="checkbox" style={{ display:'none' }} checked={selCats.has(c)} onChange={() => toggleCat(c)} />
                {c}
              </label>
            ))}
          </div>
          {/* Products grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12 }}>
            {visible.map(p => (
              <div key={p.id} onClick={() => addToCart(p)}
                style={{ background:T.white, borderRadius:12, padding:'16px 14px', cursor:'pointer', border:`1.5px solid ${T.border}`, transition:'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.darkGreen; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform='none' }}>
                <div style={{ fontSize:11, color:T.textLight, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>{p.category_name}</div>
                <div style={{ fontWeight:600, fontSize:14, color:T.darkGreen, marginBottom:6 }}>{p.name}</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.gold }}>Rs {(+p.sale_price).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Right — cart */}
        <div style={{ background:T.white, borderLeft:`1px solid ${T.border}`, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:600, fontSize:15, color:T.darkGreen }}>
              Cart {customer && <span style={{ fontSize:12, color:T.success }}>— {customer.full_name || customer.display_name}</span>}
            </div>
          </div>
          <div style={{ flex:1, overflow:'auto', padding:16 }}>
            {!cart.length
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:T.textLight, fontSize:14 }}>Tap products to add</div>
              : cart.map(i => (
                  <div key={i.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500 }}>{i.name}</div>
                      <div style={{ fontSize:12, color:T.textLight }}>Rs {(+i.sale_price).toLocaleString()} × {i.qty}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <button onClick={() => changeQty(i.id,-1)} style={{ width:26, height:26, borderRadius:'50%', background:T.offWhite, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                      <span style={{ fontWeight:600, minWidth:20, textAlign:'center' }}>{i.qty}</span>
                      <button onClick={() => changeQty(i.id,1)}  style={{ width:26, height:26, borderRadius:'50%', background:T.darkGreen, color:T.white, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                      <button onClick={() => removeItem(i.id)} style={{ background:'none', color:T.danger, fontSize:18, padding:'0 4px' }}>×</button>
                    </div>
                  </div>
                ))
            }
          </div>
          <div style={{ padding:20, borderTop:`1px solid ${T.border}` }}>
            {discountPct > 0 && <>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:T.textMid, marginBottom:4 }}><span>Subtotal</span><span>Rs {subtotal.toLocaleString()}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:T.success, marginBottom:4 }}><span>Loyalty {discountPct}% off</span><span>− Rs {discountAmt.toLocaleString()}</span></div>
            </>}
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:18, marginBottom:16 }}><span>Total</span><span style={{ color:T.darkGreen }}>Rs {total.toLocaleString()}</span></div>
            {payMethods.length > 0 && (
              <div className="field">
                <label>Payment method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  {payMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <Btn onClick={checkout} disabled={saving || !cart.length} full color={T.gold} textColor={T.darkGreen} size="lg">
              {saving ? 'Processing…' : `Checkout → Rs ${total.toLocaleString()}`}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
