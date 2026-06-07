import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, Empty, ErrBanner, Card } from '../components/shared'

const EMPTY = { full_name:'', phone:'', email:'', address:'', credit_limit:5000, credit_due_day_of_month:'', loyalty_tier_id:'', route_id:'' }

export default function Customers() {
  const [items, setItems]     = useState([])
  const [tiers, setTiers]     = useState([])
  const [routes, setRoutes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [form, setForm]       = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShow]   = useState(false)
  const [err, setErr]         = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/customers', { params: { search } }),
      api.get('/analytics/summary').catch(() => ({ data: {} })),
    ]).then(([c]) => setItems(c.data.customers))
      .catch(() => setErr('Failed to load customers'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { api.get('/routes').then(r => setRoutes(r.data.routes)).catch(() => {}) }, [])
  useEffect(load, [search])

  const openAdd  = () => { setForm(EMPTY); setEditing(null); setShow(true); setErr('') }
  const openEdit = c  => { setForm({ ...c }); setEditing(c.id); setShow(true); setErr('') }

  const save = async () => {
    try {
      if (editing) await api.patch(`/customers/${editing}`, form)
      else         await api.post('/customers', form)
      setShow(false); load()
    } catch (e) { setErr(e.response?.data?.error || 'Save failed') }
  }

  const del = async (id) => {
    if (!window.confirm('Deactivate this customer?')) return
    await api.delete(`/customers/${id}`); load()
  }

  const tierBadge = t =>
    t === 'Gold'     ? 'badge-amber' :
    t === 'Platinum' ? 'badge-amber' :
    t === 'Silver'   ? 'badge-blue'  : 'badge-green'

  return (
    <div style={{ minHeight: '100vh', background: T.cream }}>
      <GlobalStyles />
      <TopBar title="Customers" icon="👥" />
      <div style={{ padding: 32 }}>
        <PageHeader title="Customers" subtitle="Manage customer profiles, credit and loyalty" />
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email…" style={{ maxWidth: 320 }} />
          <Btn onClick={openAdd}>+ Add Customer</Btn>
        </div>
        <Card>
          {loading ? <Spinner /> : !items.length ? <Empty icon="👥" msg="No customers yet. Add one above." /> : (
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Tier</th><th>Points</th><th>Balance</th><th>Route</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.full_name || c.display_name}</td>
                    <td>{c.phone}</td>
                    <td style={{ color: T.textLight, fontSize: 13 }}>{c.email}</td>
                    <td><span className={`badge ${tierBadge(c.loyalty_tier)}`}>{c.loyalty_tier || 'Bronze'}</span></td>
                    <td>{c.loyalty_points || 0}</td>
                    <td style={{ fontWeight: 500, color: c.credit_balance > 0 ? T.danger : T.success }}>
                      Rs {(+c.credit_balance || 0).toLocaleString()}
                    </td>
                    <td style={{ color: T.textLight, fontSize: 13 }}>{c.route_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn onClick={() => openEdit(c)} size="sm" variant="outline" color={T.midGreen}>Edit</Btn>
                        <Btn onClick={() => del(c.id)}   size="sm" variant="outline" color={T.danger}>Del</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      {showForm && (
        <Modal title={editing ? 'Edit Customer' : 'Add Customer'} onClose={() => setShow(false)}>
          <ErrBanner msg={err} />
          {[
            { k:'full_name',              label:'Full Name',          ph:'Ali Khan' },
            { k:'phone',                  label:'Phone',              ph:'0300-1234567' },
            { k:'email',                  label:'Email',              type:'email' },
            { k:'address',                label:'Address' },
            { k:'credit_limit',           label:'Credit Limit (Rs)',  type:'number' },
            { k:'credit_due_day_of_month',label:'Due Day of Month',   type:'number', ph:'1–28' },
          ].map(f => (
            <div key={f.k} className="field">
              <label>{f.label}</label>
              <input type={f.type || 'text'} value={form[f.k] || ''} placeholder={f.ph || ''}
                onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
            </div>
          ))}
          <div className="field"><label>Delivery Route</label>
            <select value={form.route_id || ''} onChange={e => setForm({ ...form, route_id: e.target.value })}>
              <option value="">— No route —</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn onClick={save} full>Save Customer</Btn>
            <Btn onClick={() => setShow(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
