import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()
  const [hov, setHov] = useState(null)
  const T = { darkGreen:'#1A3A2A', gold:'#C8973A', goldLight:'#F0C878', white:'#FFFFFF' }
  return (
    <div style={{ minHeight:'100vh', background:T.darkGreen, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 80%, rgba(200,151,58,.18) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(74,140,92,.25) 0%, transparent 50%)', pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:40 }}>
        <div style={{ marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:T.gold, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🌿</div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:T.white, letterSpacing:-0.5 }}>livingfoods</div>
            <div style={{ fontSize:12, color:T.goldLight, letterSpacing:3, textTransform:'uppercase', fontWeight:500, marginTop:-2 }}>· com</div>
          </div>
        </div>
        <p style={{ color:'rgba(255,255,255,.55)', fontSize:15, marginBottom:64, letterSpacing:1, fontWeight:300 }}>Fresh. Pure. Delivered.</p>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap', justifyContent:'center' }}>
          {[{id:'marketplace',label:'Marketplace',sub:'Shop fresh products',icon:'🛒',desc:'Browse our full range of dairy, beverages & artisan foods'},{id:'dairies',label:'Living Dairies',sub:'Farm to door',icon:'🥛',desc:'Pure, farm-fresh dairy delivered to your doorstep daily'}].map(btn => (
            <div key={btn.id} onMouseEnter={()=>setHov(btn.id)} onMouseLeave={()=>setHov(null)} onClick={()=>alert(`${btn.label} — storefront coming soon!`)} style={{ background:hov===btn.id?T.gold:'rgba(255,255,255,.08)', border:`2px solid ${hov===btn.id?T.gold:'rgba(255,255,255,.2)'}`, borderRadius:20, padding:'40px 48px', textAlign:'center', cursor:'pointer', transition:'all .3s', minWidth:260 }}>
              <div style={{ fontSize:44, marginBottom:16 }}>{btn.icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:T.white, marginBottom:6 }}>{btn.label}</div>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:10, color:hov===btn.id?T.darkGreen:T.goldLight }}>{btn.sub}</div>
              <p style={{ fontSize:13, maxWidth:200, lineHeight:1.6, color:hov===btn.id?T.darkGreen:'rgba(255,255,255,.55)' }}>{btn.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop:60, display:'flex', gap:48, color:'rgba(255,255,255,.35)', fontSize:13 }}>
          {['100% Natural','Same-Day Delivery','Farm Certified'].map(t=><span key={t}>✓ {t}</span>)}
        </div>
      </div>
      <button onClick={()=>navigate('/admin')} style={{ position:'fixed', top:20, right:24, background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'7px 16px', borderRadius:8, fontSize:12, border:'1px solid rgba(255,255,255,.15)', cursor:'pointer' }}>Admin</button>
    </div>
  )
}
