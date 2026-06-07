import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, Empty, ErrBanner, Card } from '../components/shared'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const EMPTY = { name:'', on_monday:false, on_tuesday:false, on_wednesday:false, on_thursday:false, on_friday:false, on_saturday:false, on_sunday:false }

export default function Routes() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShow]   = useState(false)
  const [err, setErr]         = useState('')

  const load = () => {
    setLoading(true)
    api.get('/routes').then(r => setItems(r.data.routes)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const activeDays = r => DAYS.filter(d => r[`on_${d}`]).map(d => d.slice(0,3).charAt(0).toUpperCase() + d.slice(1,3))

  const save = async () => {
    try {
      if (editing) await api.patch(`/routes/${editing}`, form)
      else         await api.post('/routes', form)
      setShow(false); load()
    } catch (e) { setErr(e.response?.data?.error || 'Save failed') }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream }}>
      <GlobalStyles />
      <TopBar title="Routes" icon="🗺️" />
      <div style={{ padding: 32 }}>
        <PageHeader title="Delivery Routes" subtitle="Define weekly delivery routes and schedules" />
        <div style={{ marginBottom: 20 }}>
          <Btn onClick={() => { setForm(EMPTY); setEditing(null); setShow(true); setErr('') }}>+ Add Route</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }}>
          {loading ? <Spinner /> : !items.length ? <Empty icon="🗺️" msg="No routes yet." /> :
            items.map(r => (
              <div key={r.id} style={{ background: T.white, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: T.darkGreen, marginBottom: 8 }}>{r.name}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                  {activeDays(r).map(d => (
                    <span key={d} style={{ background: T.darkGreen, color: T.white, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{d}</span>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: T.textLight, marginBottom: 12 }}>
                  {r.customer_count || 0} customers
                </div>
                <Btn onClick={() => { setForm({ ...r }); setEditing(r.id); setShow(true) }} size="sm" variant="outline" color={T.midGreen}>Edit</Btn>
              </div>
            ))
          }
        </div>
      </div>
      {showForm && (
        <Modal title={editing ? 'Edit Route' : 'Add Route'} onClose={() => setShow(false)}>
          <ErrBanner msg={err} />
          <div className="field"><label>Route Name</label><input value={form.name || ''} placeholder="DHA Phase 5" onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.textMid, marginBottom: 10 }}>Active Days</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map(d => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  background: form[`on_${d}`] ? T.darkGreen : T.offWhite,
                  color: form[`on_${d}`] ? T.white : T.textMid,
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: `1.5px solid ${form[`on_${d}`] ? T.darkGreen : T.border}` }}>
                  <input type="checkbox" style={{ display: 'none' }} checked={!!form[`on_${d}`]}
                    onChange={e => setForm({ ...form, [`on_${d}`]: e.target.checked })} />
                  {d.charAt(0).toUpperCase() + d.slice(1,3)}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} full>Save Route</Btn>
            <Btn onClick={() => setShow(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
