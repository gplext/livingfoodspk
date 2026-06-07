import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, Empty, ErrBanner, Card } from '../components/shared'

const EMPTY = { full_name:'', phone:'', email:'', payment_terms_days:30, notes:'' }

export default function Vendors() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form, setForm]     = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShow] = useState(false)
  const [err, setErr]       = useState('')

  const load = () => {
    setLoading(true)
    api.get('/vendors').then(r => setItems(r.data.vendors)).catch(() => setErr('Failed to load')).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = items.filter(v => [v.full_name, v.phone, v.email].some(f => (f||'').toLowerCase().includes(search.toLowerCase())))

  const save = async () => {
    try {
      if (editing) await api.patch(`/vendors/${editing}`, form)
      else         await api.post('/vendors', form)
      setShow(false); load()
    } catch (e) { setErr(e.response?.data?.error || 'Save failed') }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream }}>
      <GlobalStyles />
      <TopBar title="Vendors" icon="🏪" />
      <div style={{ padding: 32 }}>
        <PageHeader title="Vendors" subtitle="Manage your supplier directory" />
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…" style={{ maxWidth: 320 }} />
          <Btn onClick={() => { setForm(EMPTY); setEditing(null); setShow(true); setErr('') }}>+ Add Vendor</Btn>
        </div>
        <Card>
          {loading ? <Spinner /> : !filtered.length ? <Empty icon="🏪" msg="No vendors yet." /> : (
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Payment Terms</th><th>Balance Payable</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500 }}>{v.full_name}</td>
                    <td>{v.phone}</td>
                    <td style={{ color: T.textLight, fontSize: 13 }}>{v.email}</td>
                    <td>{v.payment_terms_days} days</td>
                    <td style={{ color: v.balance_payable > 0 ? T.danger : T.textLight }}>
                      Rs {(+v.balance_payable || 0).toLocaleString()}
                    </td>
                    <td>
                      <Btn onClick={() => { setForm({ ...v }); setEditing(v.id); setShow(true) }} size="sm" variant="outline" color={T.midGreen}>Edit</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      {showForm && (
        <Modal title={editing ? 'Edit Vendor' : 'Add Vendor'} onClose={() => setShow(false)}>
          <ErrBanner msg={err} />
          {[
            { k:'full_name', label:'Vendor Name', ph:'Haleeb Foods' },
            { k:'phone',     label:'Contact Number' },
            { k:'email',     label:'Email', type:'email' },
            { k:'payment_terms_days', label:'Payment Terms (days)', type:'number' },
            { k:'notes',     label:'Notes', type:'textarea' },
          ].map(f => (
            <div key={f.k} className="field">
              <label>{f.label}</label>
              {f.type === 'textarea'
                ? <textarea rows={3} value={form[f.k] || ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
                : <input type={f.type || 'text'} value={form[f.k] || ''} placeholder={f.ph || ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} full>Save</Btn>
            <Btn onClick={() => setShow(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
