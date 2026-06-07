import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, Empty, ErrBanner, Card } from '../components/shared'

export default function Purchases({ vendorOnly = false }) {
  const [purchases, setPurchases] = useState([])
  const [vendors, setVendors]   = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShow]     = useState(false)
  const [err, setErr]           = useState('')
  const [form, setForm]         = useState({ supplier_id:'', items:[{ product_id:'', quantity:1, unit_cost:0 }], date: new Date().toISOString().split('T')[0] })

  const load = () => {
    setLoading(true)
    api.get('/purchases').then(r => setPurchases(r.data.purchases)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/vendors').then(r => setVendors(r.data.vendors)).catch(() => {})
    api.get('/products').then(r => setProducts(r.data.products)).catch(() => {})
  }, [])

  const updateItem = (i, key, val) =>
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [key]: val } : it) }))

  const total = form.items.reduce((s, i) => s + (+i.quantity || 0) * (+i.unit_cost || 0), 0)

  const save = async () => {
    if (vendorOnly && !form.supplier_id) { setErr('Select a vendor'); return }
    if (!form.items[0].product_id)       { setErr('Add at least one item'); return }
    try {
      await api.post('/purchases', { supplier_id: form.supplier_id || null, items: form.items.map(i => ({ ...i, quantity: +i.quantity, unit_cost: +i.unit_cost })) })
      setShow(false); load()
      setForm({ supplier_id:'', items:[{ product_id:'', quantity:1, unit_cost:0 }], date: new Date().toISOString().split('T')[0] })
    } catch (e) { setErr(e.response?.data?.error || 'Failed to save') }
  }

  const title = vendorOnly ? 'Vendor Purchases' : 'General Purchases'
  const icon  = vendorOnly ? '📦' : '🛍️'

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      <GlobalStyles />
      <TopBar title={title} icon={icon} />
      <div style={{ padding:32 }}>
        <PageHeader title={title} subtitle={vendorOnly ? 'Record stock received from suppliers' : 'Record general expenses and misc purchases'} />
        <div style={{ marginBottom:20 }}>
          <Btn onClick={() => { setErr(''); setShow(true) }}>+ New Purchase</Btn>
        </div>
        <Card>
          {loading ? <Spinner /> : !purchases.length ? <Empty icon={icon} msg="No purchases recorded yet." /> : (
            <table>
              <thead><tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily:'monospace', fontSize:13 }}>{p.po_number}</td>
                    <td>{p.supplier_name || 'General'}</td>
                    <td style={{ color:T.textLight }}>{p.order_date}</td>
                    <td>{p.items_count || '—'}</td>
                    <td style={{ fontWeight:600 }}>Rs {(+p.total||0).toLocaleString()}</td>
                    <td><span className={`badge badge-${p.status==='received'?'green':'amber'}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {showForm && (
        <Modal title="Record Purchase" onClose={() => setShow(false)} width={620}>
          <ErrBanner msg={err} />
          {vendorOnly && (
            <div className="field"><label>Vendor</label>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">— Select vendor —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
              </select>
            </div>
          )}
          <div style={{ fontWeight:600, fontSize:14, color:T.darkGreen, marginBottom:12 }}>Items</div>
          {form.items.map((it, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:10, marginBottom:10, alignItems:'end' }}>
              <div>
                {i === 0 && <label>Product</label>}
                <select value={it.product_id} onChange={e => { const p = products.find(p => p.id === e.target.value); updateItem(i,'product_id',e.target.value); if(p) updateItem(i,'unit_cost',p.cost_price||0) }}>
                  <option value="">— select —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                {i === 0 && <label>Qty</label>}
                <input type="number" min="1" value={it.quantity} onChange={e => updateItem(i,'quantity',e.target.value)} />
              </div>
              <div>
                {i === 0 && <label>Unit Cost (Rs)</label>}
                <input type="number" min="0" value={it.unit_cost} onChange={e => updateItem(i,'unit_cost',e.target.value)} />
              </div>
              <div style={{ paddingBottom:2 }}>
                {form.items.length > 1 && <Btn onClick={() => setForm(f => ({ ...f, items: f.items.filter((_,idx)=>idx!==i) }))} size="sm" variant="outline" color={T.danger}>✕</Btn>}
              </div>
            </div>
          ))}
          <Btn onClick={() => setForm(f => ({ ...f, items: [...f.items, { product_id:'', quantity:1, unit_cost:0 }] }))} size="sm" variant="outline" color={T.midGreen}>+ Add item</Btn>
          <div style={{ background:T.offWhite, borderRadius:10, padding:'12px 16px', margin:'16px 0', display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:16 }}>
            <span>Total</span><span style={{ color:T.darkGreen }}>Rs {total.toLocaleString()}</span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn onClick={save} full>Save Purchase</Btn>
            <Btn onClick={() => setShow(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
