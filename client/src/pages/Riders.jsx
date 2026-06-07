import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, Empty, ErrBanner, Card } from '../components/shared'

const EMPTY = { name:'', phone:'', has_motorcycle:true, number_plate:'', is_active:true }

export default function Riders() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShow]   = useState(false)
  const [err, setErr]         = useState('')

  const load = () => {
    setLoading(true)
    api.get('/riders').then(r => setItems(r.data.riders)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async () => {
    try {
      if (editing) await api.patch(`/riders/${editing}`, form)
      else         await api.post('/riders', form)
      setShow(false); load()
    } catch (e) { setErr(e.response?.data?.error || 'Save failed') }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream }}>
      <GlobalStyles />
      <TopBar title="Riders" icon="🏍️" />
      <div style={{ padding: 32 }}>
        <PageHeader title="Riders" subtitle="Manage your delivery fleet" />
        <div style={{ marginBottom: 20 }}>
          <Btn onClick={() => { setForm(EMPTY); setEditing(null); setShow(true); setErr('') }}>+ Add Rider</Btn>
        </div>
        <Card>
          {loading ? <Spinner /> : !items.length ? <Empty icon="🏍️" msg="No riders yet." /> : (
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>Plate</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>{r.phone}</td>
                    <td>{r.has_motorcycle ? 'Motorcycle' : 'Van'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{r.number_plate}</td>
                    <td><span className={`badge ${r.is_active ? 'badge-green' : 'badge-red'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <Btn onClick={() => { setForm({ ...r }); setEditing(r.id); setShow(true) }} size="sm" variant="outline" color={T.midGreen}>Edit</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      {showForm && (
        <Modal title={editing ? 'Edit Rider' : 'Add Rider'} onClose={() => setShow(false)}>
          <ErrBanner msg={err} />
          <div className="field"><label>Full Name</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label>Number Plate</label><input value={form.number_plate || ''} onChange={e => setForm({ ...form, number_plate: e.target.value })} /></div>
          <div className="field">
            <label>Vehicle Type</label>
            <select value={form.has_motorcycle ? 'moto' : 'van'} onChange={e => setForm({ ...form, has_motorcycle: e.target.value === 'moto' })}>
              <option value="moto">Motorcycle</option>
              <option value="van">Van / Car</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} full>Save</Btn>
            <Btn onClick={() => setShow(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
