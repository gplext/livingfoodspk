import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, Empty, ErrBanner, Card } from '../components/shared'

const TABLES = [
  { key:'products',  label:'Products',  endpoint:'/products',  dataKey:'products',  fields:['name','sku','sale_price','cost_price','stock_uom','category_name'] },
  { key:'customers', label:'Customers', endpoint:'/customers', dataKey:'customers', fields:['full_name','phone','email','loyalty_tier','credit_balance'] },
  { key:'vendors',   label:'Vendors',   endpoint:'/vendors',   dataKey:'vendors',   fields:['full_name','phone','email','payment_terms_days','balance_payable'] },
  { key:'riders',    label:'Riders',    endpoint:'/riders',    dataKey:'riders',    fields:['name','phone','number_plate','is_active'] },
  { key:'routes',    label:'Routes',    endpoint:'/routes',    dataKey:'routes',    fields:['name','customer_count'] },
  { key:'orders',    label:'Orders',    endpoint:'/orders',    dataKey:'orders',    fields:['order_number','customer_name','channel','total','status','created_at'] },
  { key:'purchases', label:'Purchases', endpoint:'/purchases', dataKey:'purchases', fields:['po_number','supplier_name','order_date','total','status'] },
]

export default function DBTable() {
  const [active, setActive]     = useState(TABLES[0])
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showForm, setShow]     = useState(false)
  const [form, setForm]         = useState({})
  const [err, setErr]           = useState('')

  const load = (tbl = active) => {
    setLoading(true)
    api.get(tbl.endpoint).then(r => setRows(r.data[tbl.dataKey] || [])).catch(() => setRows([])).finally(() => setLoading(false))
  }
  useEffect(() => load(), [active])

  const switchTable = t => { setActive(t); setSearch(''); setRows([]) }

  const filtered = rows.filter(r =>
    active.fields.some(f => String(r[f]||'').toLowerCase().includes(search.toLowerCase()))
  )

  const insert = async () => {
    try {
      await api.post(active.endpoint, form)
      setShow(false); load()
    } catch (e) { setErr(e.response?.data?.error || 'Insert failed') }
  }

  const formatVal = (row, field) => {
    const v = row[field]
    if (v === null || v === undefined) return '—'
    if (typeof v === 'boolean') return v ? '✓' : '✗'
    if (field.includes('total') || field.includes('balance') || field.includes('price')) return `Rs ${(+v||0).toLocaleString()}`
    if (field === 'created_at') return String(v).split('T')[0]
    return String(v)
  }

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      <GlobalStyles />
      <TopBar title="DB Table Editor" icon="🗄️" />
      <div style={{ padding:32 }}>
        <PageHeader title="Database Table Editor" subtitle="Browse and insert rows into any table" />
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {TABLES.map(t => (
            <button key={t.key} onClick={() => switchTable(t)}
              style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer',
                       background:active.key===t.key ? T.darkGreen : T.white,
                       color:active.key===t.key ? T.white : T.textMid,
                       border:`1.5px solid ${active.key===t.key ? T.darkGreen : T.border}` }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:12, marginBottom:16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${active.label.toLowerCase()}…`} style={{ maxWidth:280 }} />
          <Btn onClick={() => { setForm({}); setErr(''); setShow(true) }} color={T.gold} textColor={T.darkGreen}>+ Insert Row</Btn>
          <Btn onClick={() => load()} variant="outline" color={T.midGreen}>↻ Refresh</Btn>
        </div>
        <div style={{ fontSize:13, color:T.textLight, marginBottom:10 }}>{filtered.length} row{filtered.length!==1?'s':''} in <strong>{active.label}</strong></div>
        <Card style={{ overflow:'auto' }}>
          {loading ? <Spinner /> : !filtered.length ? <Empty icon="🗄️" msg={`No rows in ${active.label}`} /> : (
            <table>
              <thead>
                <tr>
                  <th style={{ width:80 }}>ID</th>
                  {active.fields.map(f => <th key={f}>{f.replace(/_/g,' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontFamily:'monospace', fontSize:11, color:T.textLight }}>{String(row.id||'').slice(-6)}</td>
                    {active.fields.map(f => (
                      <td key={f} style={{ fontSize:13, color: f==='status' ? undefined : undefined }}>
                        {f==='status'
                          ? <span className={`badge badge-${row[f]==='active'||row[f]==='received'||row[f]==='completed'?'green':row[f]==='pending'?'amber':'red'}`}>{row[f]}</span>
                          : formatVal(row, f)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {showForm && (
        <Modal title={`Insert into ${active.label}`} onClose={() => setShow(false)}>
          <ErrBanner msg={err} />
          <p style={{ fontSize:13, color:T.textLight, marginBottom:16 }}>
            Fill in the fields below. For full control use the dedicated page for this table.
          </p>
          {active.fields.filter(f => !['category_name','customer_name','supplier_name','items_count','customer_count'].includes(f)).map(f => (
            <div key={f} className="field">
              <label>{f.replace(/_/g,' ')}</label>
              <input value={form[f]||''} onChange={e => setForm({ ...form, [f]:e.target.value })} />
            </div>
          ))}
          <div style={{ display:'flex', gap:10 }}>
            <Btn onClick={insert} full>Insert</Btn>
            <Btn onClick={() => setShow(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
