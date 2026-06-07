import { useNavigate } from 'react-router-dom'

export const T = {
  cream: '#FAF7F2', darkGreen: '#1A3A2A', midGreen: '#2D5A3D',
  lightGreen: '#4A8C5C', gold: '#C8973A', goldLight: '#F0C878',
  text: '#1A1A1A', textMid: '#4A4A4A', textLight: '#8A8A8A',
  white: '#FFFFFF', offWhite: '#F5F0E8', border: '#DDD8CC',
  danger: '#C0392B', success: '#27AE60',
}

export const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:${T.cream};color:${T.text};min-height:100vh}
    h1,h2,h3{font-family:'Playfair Display',serif}
    input,select,textarea{font-family:'DM Sans',sans-serif;width:100%;padding:10px 14px;border:1.5px solid ${T.border};border-radius:8px;font-size:14px;background:${T.white};color:${T.text};outline:none;transition:border .2s}
    input:focus,select:focus,textarea:focus{border-color:${T.midGreen}}
    button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;border-radius:8px;transition:all .2s}
    label{font-size:13px;font-weight:500;color:${T.textMid};display:block;margin-bottom:6px}
    .field{margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th{text-align:left;padding:10px 14px;background:${T.darkGreen};color:${T.white};font-weight:500;font-size:13px}
    td{padding:10px 14px;border-bottom:1px solid ${T.border}}
    tr:hover td{background:${T.offWhite}}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500}
    .badge-green{background:#D4EDDA;color:#155724}
    .badge-amber{background:#FFF3CD;color:#856404}
    .badge-red{background:#F8D7DA;color:#721C24}
    .badge-blue{background:#D1ECF1;color:#0C5460}
    ::-webkit-scrollbar{width:6px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
  `}</style>
)

export function TopBar({ title, icon }) {
  const navigate = useNavigate()
  return (
    <div style={{ background: T.darkGreen, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <button onClick={() => navigate('/admin/dashboard')}
        style={{ background: 'rgba(255,255,255,.1)', color: T.white, padding: '6px 14px', borderRadius: 8, fontSize: 13 }}>
        ← Dashboard
      </button>
      <span style={{ color: T.white, fontWeight: 600, fontSize: 16 }}>{icon} {title}</span>
    </div>
  )
}

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 26, color: T.darkGreen, marginBottom: 4 }}>{title}</h2>
      {subtitle && <p style={{ color: T.textLight, fontSize: 14 }}>{subtitle}</p>}
    </div>
  )
}

export function Btn({ children, onClick, color = T.darkGreen, textColor = T.white, size = 'md', full = false, variant = 'solid', disabled = false }) {
  const pad = { sm: '7px 14px', md: '10px 20px', lg: '13px 28px' }[size]
  const fs  = { sm: 13, md: 14, lg: 15 }[size]
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: variant === 'outline' ? 'transparent' : color,
               color: variant === 'outline' ? color : textColor,
               border: variant === 'outline' ? `1.5px solid ${color}` : 'none',
               padding: pad, fontSize: fs, fontWeight: 500, borderRadius: 8,
               width: full ? '100%' : 'auto', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

export function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: T.white, borderRadius: 16, width: '100%', maxWidth: width,
                    maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 18, color: T.darkGreen }}>{title}</h3>
          <button onClick={onClose} style={{ background: T.offWhite, color: T.textMid, padding: '6px 14px', borderRadius: 8, fontSize: 13 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export function Spinner() {
  return <div style={{ padding: '60px 20px', textAlign: 'center', color: T.textLight, fontSize: 14 }}>Loading…</div>
}

export function Empty({ icon = '📭', msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textLight }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 14 }}>{msg}</p>
    </div>
  )
}

export function ErrBanner({ msg }) {
  return msg ? <div style={{ background: '#FEE', color: T.danger, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{msg}</div> : null
}

export function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, color = T.darkGreen }) {
  return (
    <div style={{ background: T.white, borderRadius: 12, padding: '18px 20px', border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, color: T.textLight, fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}
