import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, ErrBanner } from '../components/shared'

export default function Loyalty() {
  const [tiers, setTiers]   = useState([])
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm]     = useState({})
  const [err, setErr]       = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/loyalty/tiers').catch(() => ({ data: { tiers: [] } })),
      api.get('/analytics/summary').catch(() => ({ data: {} })),
    ]).then(([t, s]) => {
      setTiers(t.data.tiers || [])
      setStats(s.data)
    }).finally(() => setLoading(false))
  }, [])

  const tierColor = n => ({ Gold:'#C8973A', Platinum:'#9B59B6', Silver:'#5DADE2', Bronze:'#A04000' }[n] || T.darkGreen)

  const save = async () => {
    try {
      await api.patch(`/loyalty/tiers/${editing}`, form)
      setEditing(null)
      const r = await api.get('/loyalty/tiers')
      setTiers(r.data.tiers || [])
    } catch (e) { setErr(e.response?.data?.error || 'Save failed') }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream }}>
      <GlobalStyles />
      <TopBar title="Loyalty Program" icon="⭐" />
      <div style={{ padding: 32 }}>
        <PageHeader title="Loyalty Program" subtitle="Configure tiers, discounts and point multipliers" />

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Members', value: stats.total_customers || '—' },
              { label: 'Points in Circulation', value: stats.total_points?.toLocaleString() || '—' },
              { label: 'Outstanding Credit', value: `Rs ${(stats.total_receivable || 0).toLocaleString()}` },
            ].map(s => (
              <div key={s.label} style={{ background: T.white, borderRadius: 12, padding: '18px 20px', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, color: T.textLight, fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: T.darkGreen }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? <Spinner /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
            {tiers.map(t => (
              <div key={t.id} style={{ background: T.white, borderRadius: 16, padding: 24, border: `2px solid ${tierColor(t.name)}30` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: tierColor(t.name) }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: T.textLight, marginTop: 2 }}>
                      Min spend: Rs {(+t.min_spend_threshold || 0).toLocaleString()}
                    </div>
                  </div>
                  <Btn onClick={() => { setForm({ ...t }); setEditing(t.id) }} size="sm" variant="outline" color={T.midGreen}>Edit</Btn>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: T.offWhite, borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>DISCOUNT</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.darkGreen }}>{t.discount_pct}%</div>
                  </div>
                  <div style={{ background: T.offWhite, borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>POINTS ×</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.darkGreen }}>{t.points_multiplier}×</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !tiers.length && (
          <div style={{ background: T.white, borderRadius: 12, padding: 24, border: `1px solid ${T.border}` }}>
            <p style={{ color: T.textLight, fontSize: 14, marginBottom: 12 }}>Loyalty tiers are seeded from the database. If none appear, make sure you ran <code>node db/seed.js</code>.</p>
          </div>
        )}
      </div>

      {editing && (
        <Modal title="Edit Loyalty Tier" onClose={() => setEditing(null)}>
          <ErrBanner msg={err} />
          {[
            { k:'name', label:'Tier Name' },
            { k:'min_spend_threshold', label:'Minimum Spend (Rs)', type:'number' },
            { k:'discount_pct',        label:'Discount (%)',       type:'number' },
            { k:'points_multiplier',   label:'Points Multiplier',  type:'number' },
          ].map(f => (
            <div key={f.k} className="field">
              <label>{f.label}</label>
              <input type={f.type || 'text'} value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} full>Save Changes</Btn>
            <Btn onClick={() => setEditing(null)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
