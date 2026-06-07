import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, Empty, ErrBanner, Card } from '../components/shared'

const ROLES = ['owner','manager','accountant','cashier','barista','rider','viewer']
const EMPTY = { full_name:'', username:'', email:'', password:'', role:'cashier' }

export default function AdminsPage() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState(EMPTY)
  const [showForm, setShow]   = useState(false)
  const [err, setErr]         = useState('')

  const load = () => {
    setLoading(true)
    api.get('/auth/users').then(r => setItems(r.data.users)).catch(() => setItems([])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async () => {
    if (!form.username || !form.password) { setErr('Username and password are required'); return }
    try {
      await api.post('/auth/users', form)
      setShow(false); load()
    } catch (e) { setErr(e.response?.data?.error || 'Failed to create admin') }
  }

  const roleColor = r => ({ owner:'badge-amber', manager:'badge-blue', accountant:'badge-blue', cashier:'badge-green', barista:'badge-green', rider:'badge-green', viewer:'badge-red' }[r] || 'badge-green')

  return (
    <div style={{ minHeight: '100vh', background: T.cream }}>
      <GlobalStyles />
      <TopBar title="Admins" icon="🔐" />
      <div style={{ padding: 32 }}>
        <PageHeader title="Admin Users" subtitle="Manage staff accounts and roles" />
        <div style={{ marginBottom: 20 }}>
          <Btn onClick={() => { setForm(EMPTY); setShow(true); setErr('') }}>+ Add Admin</Btn>
        </div>
        <Card>
          {loading ? <Spinner /> : !items.length ? <Empty icon="🔐" msg="No admins found." /> : (
            <table>
              <thead><tr><th>Full Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                {items.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.username}</td>
                    <td style={{ color: T.textLight, fontSize: 13 }}>{u.email}</td>
                    <td><span className={`badge ${roleColor(u.role)}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      {showForm && (
        <Modal title="Add Admin" onClose={() => setShow(false)}>
          <ErrBanner msg={err} />
          {[
            { k:'full_name', label:'Full Name' },
            { k:'username',  label:'Username' },
            { k:'email',     label:'Email', type:'email' },
            { k:'password',  label:'Password', type:'password' },
          ].map(f => (
            <div key={f.k} className="field">
              <label>{f.label}</label>
              <input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
            </div>
          ))}
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} full>Create Admin</Btn>
            <Btn onClick={() => setShow(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
