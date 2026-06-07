import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const T = {
  cream:'#FAF7F2', darkGreen:'#1A3A2A', midGreen:'#2D5A3D',
  gold:'#C8973A', goldLight:'#F0C878', text:'#1A1A1A', textMid:'#4A4A4A',
  textLight:'#8A8A8A', white:'#FFFFFF', offWhite:'#F5F0E8', border:'#DDD8CC',
  danger:'#C0392B',
}

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!form.username || !form.password) { setError('Both fields are required.'); return }
    setLoading(true); setError('')
    try {
      await login(form.username, form.password)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:T.cream, display:'flex' }}>
      {/* Left brand panel */}
      <div style={{ width:400, background:T.darkGreen, display:'flex', flexDirection:'column',
                    justifyContent:'center', padding:56, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0,
          backgroundImage:`radial-gradient(circle at 30% 70%, rgba(200,151,58,.2) 0%, transparent 60%)`,
          pointerEvents:'none' }} />
        <div style={{ position:'relative' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:T.gold,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        marginBottom:24, fontSize:20 }}>🌿</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", color:'#fff', fontSize:28,
                       marginBottom:8, lineHeight:1.3 }}>Living Foods<br/>Admin Console</h1>
          <p style={{ color:'rgba(255,255,255,.5)', fontSize:14, lineHeight:1.8, marginTop:12 }}>
            Manage your café operations, inventory, and customer relationships.
          </p>
          <div style={{ marginTop:40, display:'flex', flexDirection:'column', gap:12 }}>
            {['POS & Sales','Inventory Management','Customer & Loyalty','Accounting & Reports'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10,
                                    color:'rgba(255,255,255,.65)', fontSize:13 }}>
                <span style={{ color:T.gold }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
        <div style={{ width:'100%', maxWidth:380 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:T.darkGreen,
                       marginBottom:6 }}>Sign in</h2>
          <p style={{ color:T.textLight, fontSize:14, marginBottom:32 }}>
            Enter your admin credentials to continue
          </p>

          <label style={{ display:'block', fontSize:13, fontWeight:500, color:T.textMid, marginBottom:6 }}>
            Username
          </label>
          <input autoFocus value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="superadmin"
            style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${T.border}`,
                     borderRadius:8, fontSize:14, marginBottom:16, outline:'none',
                     fontFamily:'DM Sans,sans-serif' }} />

          <label style={{ display:'block', fontSize:13, fontWeight:500, color:T.textMid, marginBottom:6 }}>
            Password
          </label>
          <input type="password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${T.border}`,
                     borderRadius:8, fontSize:14, marginBottom:16, outline:'none',
                     fontFamily:'DM Sans,sans-serif' }} />

          {error && (
            <div style={{ background:'#FEE', color:T.danger, padding:'10px 14px',
                          borderRadius:8, fontSize:13, marginBottom:16 }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading}
            style={{ width:'100%', padding:'12px 20px', background:T.darkGreen, color:'#fff',
                     border:'none', borderRadius:8, fontSize:15, fontWeight:500, cursor:'pointer' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p style={{ textAlign:'center', marginTop:16, color:T.textLight, fontSize:12 }}>
            First time? Make sure the server is running and the DB is seeded.
          </p>

          <button onClick={() => navigate('/')}
            style={{ background:'none', border:'none', color:T.textLight, fontSize:13,
                     marginTop:16, display:'block', cursor:'pointer' }}>
            ← Back to site
          </button>
        </div>
      </div>
    </div>
  )
}
