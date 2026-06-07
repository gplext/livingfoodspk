import { useState, useEffect } from 'react'
import api from '../api/client'
import { T, GlobalStyles, TopBar, PageHeader, Spinner, Card, StatCard } from '../components/shared'

const TYPE_COLOR = { asset:T.success, liability:T.danger, equity:'#8B4513', revenue:T.darkGreen, expense:T.gold }
const TYPES = ['asset','liability','equity','revenue','expense']

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data.accounts)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const byType  = t => accounts.filter(a => a.account_type === t)
  const total   = t => byType(t).reduce((s,a) => s + (+a.balance||0), 0)
  const revenue   = total('revenue')
  const expenses  = total('expense')
  const assets    = total('asset')
  const liabilities = total('liability')

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>
      <GlobalStyles />
      <TopBar title="Bookkeeping" icon="📊" />
      <div style={{ padding:32 }}>
        <PageHeader title="Chart of Accounts & P&L" subtitle="Financial overview by account type" />
        {loading ? <Spinner /> : <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
            <StatCard label="Total Assets"    value={`Rs ${Math.round(assets).toLocaleString()}`}           color={T.success} />
            <StatCard label="Total Liabilities" value={`Rs ${Math.round(liabilities).toLocaleString()}`}   color={T.danger} />
            <StatCard label="Revenue"         value={`Rs ${Math.round(revenue).toLocaleString()}`}          color={T.darkGreen} />
            <StatCard label="Net Income"      value={`Rs ${Math.round(revenue-expenses).toLocaleString()}`} color={revenue-expenses>=0 ? T.success : T.danger} />
          </div>
          {TYPES.map(type => (
            <Card key={type} style={{ marginBottom:16 }}>
              <div style={{ background:T.offWhite, padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ fontWeight:600, fontSize:15, color:TYPE_COLOR[type]||T.darkGreen, textTransform:'capitalize' }}>{type}s</div>
                <div style={{ fontSize:14, fontWeight:600 }}>Rs {Math.round(total(type)).toLocaleString()}</div>
              </div>
              {byType(type).length === 0
                ? <div style={{ padding:'16px 20px', color:T.textLight, fontSize:14 }}>No accounts of this type.</div>
                : <table>
                    <thead><tr><th>Code</th><th>Account Name</th><th style={{ textAlign:'right' }}>Balance</th></tr></thead>
                    <tbody>
                      {byType(type).map(a => (
                        <tr key={a.code}>
                          <td style={{ fontFamily:'monospace', fontSize:13, color:T.textLight, width:70 }}>{a.code}</td>
                          <td>{a.name}</td>
                          <td style={{ textAlign:'right', fontWeight:500 }}>Rs {(+a.balance||0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </Card>
          ))}
        </>}
      </div>
    </div>
  )
}
