import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Btn, Modal, Spinner, Empty, ErrBanner, Card, StatCard } from '../components/shared'

const ACCS = ['1000','1010','1100','1200','2000','2100','4000','5000','6000','6100','6200','6300']

export default function Ledger() {
  const [entries,  setEntries]  = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShow]     = useState(false)
  const [err,      setErr]      = useState('')
  const [filters, setFilters]   = useState({ from:'', to:'' })
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    memo:'', journal_code:'GEN',
    lines:[{ account_code:'', debit:0, credit:0, memo:'' }, { account_code:'', debit:0, credit:0, memo:'' }],
  })

  const load = () => {
    setLoading(true)
    api.get('/ledger', { params: filters }).then(r => setEntries(r.data.entries)).finally(() => setLoading(false))
  }
  useEffect(() => { load(); api.get('/accounts').then(r => setAccounts(r.data.accounts)).catch(() => {}) }, [])

  const totalDebit  = entries.reduce((s,e) => s + (+e.debit||0), 0)
  const totalCredit = entries.reduce((s,e) => s + (+e.credit||0), 0)

  const updateLine = (i,k,v) => setForm(f => ({ ...f, lines: f.lines.map((l,idx) => idx===i ? { ...l, [k]:v } : l) }))

  const save = async () => {
    const td = form.lines.reduce((s,l) => s+(+l.debit||0),0)
    const tc = form.lines.reduce((s,l) => s+(+l.credit||0),0)
    if (Math.abs(td-tc) > 0.01) { setErr(`Entry doesn't balance: Debit ${td.toFixed(2)} ≠ Credit ${tc.toFixed(2)}`); return }
    try {
      await api.post('/ledger', form)
      setShow(false); load()
      setForm(f => ({ ...f, memo:'', lines:[{account_code:'',debit:0,credit:0,memo:''},{account_code:'',debit:0,credit:0,memo:''}] }))
    } catch (e) { setErr(e.response?.data?.error || 'Post failed') }
  }

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      <GlobalStyles />
      <TopBar title="General Ledger" icon="📒" />
      <div style={{ padding:32 }}>
        <PageHeader title="General Ledger" subtitle="View and post journal entries" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          <StatCard label="Total Debits"  value={`Rs ${Math.round(totalDebit).toLocaleString()}`} />
          <StatCard label="Total Credits" value={`Rs ${Math.round(totalCredit).toLocaleString()}`} />
          <StatCard label="Net Balance"   value={`Rs ${Math.round(totalDebit-totalCredit).toLocaleString()}`} color={totalDebit>=totalCredit ? T.success : T.danger} />
        </div>
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from:e.target.value }))} style={{ width:160 }} />
          <input type="date" value={filters.to}   onChange={e => setFilters(f => ({ ...f, to:e.target.value }))}   style={{ width:160 }} />
          <Btn onClick={load} variant="outline" color={T.darkGreen}>Filter</Btn>
          <Btn onClick={() => { setShow(true); setErr('') }}>+ New Entry</Btn>
        </div>
        <Card>
          {loading ? <Spinner /> : !entries.length ? <Empty icon="📒" msg="No ledger entries yet." /> : (
            <table>
              <thead><tr><th>Date</th><th>Account</th><th>Memo</th><th>Reference</th><th style={{ textAlign:'right' }}>Debit</th><th style={{ textAlign:'right' }}>Credit</th></tr></thead>
              <tbody>
                {entries.map((e,i) => (
                  <tr key={i}>
                    <td style={{ color:T.textLight, fontSize:13 }}>{e.entry_date}</td>
                    <td><span style={{ fontFamily:'monospace', fontSize:12, color:T.textLight, marginRight:6 }}>{e.account_code}</span>{e.account_name}</td>
                    <td style={{ color:T.textMid, fontSize:13 }}>{e.memo}</td>
                    <td style={{ color:T.textLight, fontSize:12 }}>{e.reference_type} {e.reference_id ? `#${String(e.reference_id).slice(-6)}` : ''}</td>
                    <td style={{ textAlign:'right', color:T.darkGreen, fontWeight:500 }}>{+e.debit > 0 ? `Rs ${(+e.debit).toLocaleString()}` : '—'}</td>
                    <td style={{ textAlign:'right', color:'#8B4513', fontWeight:500 }}>{+e.credit > 0 ? `Rs ${(+e.credit).toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {showForm && (
        <Modal title="New Journal Entry" onClose={() => setShow(false)} width={640}>
          <ErrBanner msg={err} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="field"><label>Date</label><input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date:e.target.value }))} /></div>
            <div className="field"><label>Journal</label>
              <select value={form.journal_code} onChange={e => setForm(f => ({ ...f, journal_code:e.target.value }))}>
                {['GEN','SAL','PUR','BNK','CSH'].map(j => <option key={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Memo</label><input value={form.memo} onChange={e => setForm(f => ({ ...f, memo:e.target.value }))} placeholder="Description of this entry" /></div>
          <div style={{ fontWeight:600, fontSize:13, color:T.darkGreen, marginBottom:10 }}>Lines (must balance)</div>
          {form.lines.map((l,i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8, marginBottom:8, alignItems:'end' }}>
              <div>
                {i===0 && <label>Account</label>}
                <select value={l.account_code} onChange={e => updateLine(i,'account_code',e.target.value)}>
                  <option value="">— select —</option>
                  {accounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>{i===0 && <label>Debit</label>}<input type="number" min="0" value={l.debit} onChange={e => updateLine(i,'debit',e.target.value)} /></div>
              <div>{i===0 && <label>Credit</label>}<input type="number" min="0" value={l.credit} onChange={e => updateLine(i,'credit',e.target.value)} /></div>
              <div style={{ paddingBottom:2 }}>
                {form.lines.length>2 && <Btn onClick={() => setForm(f => ({ ...f, lines:f.lines.filter((_,idx)=>idx!==i) }))} size="sm" variant="outline" color={T.danger}>✕</Btn>}
              </div>
            </div>
          ))}
          <Btn onClick={() => setForm(f => ({ ...f, lines:[...f.lines,{account_code:'',debit:0,credit:0,memo:''}] }))} size="sm" variant="outline" color={T.midGreen}>+ Add line</Btn>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <Btn onClick={save} full>Post Entry</Btn>
            <Btn onClick={() => setShow(false)} variant="outline" color={T.textMid} full>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
