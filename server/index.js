require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const bcrypt  = require('bcryptjs')
const pool    = require('./db/pool')

const authRouter        = require('./routes/auth')
const mobileAuthRouter  = require('./routes/mobile-auth')
const mobileOrdersRouter = require('./routes/mobile-orders')
const { products, orders, vendors, riders, routes, purchases,
        ledger, analytics, paymentMethods, accountsRouter, loyaltyRouter } = require('./routes/api')
const { auth, requireRole } = require('./middleware/auth')

const app  = express()
const PORT = process.env.PORT || 3001

// Allow ERP web client + mobile app origins (no-origin requests like Expo/curl always pass)
const WEB_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
const extraOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || WEB_ORIGINS.includes(origin) || extraOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => { console.log(`  ${req.method} ${req.path}`); next() })
}

// ── Auth + user management ────────────────────────────────────────────────────
app.use('/api/auth', authRouter)

// List all users (admin management page)
app.get('/api/auth/users', auth, requireRole('owner','manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.is_active, r.name AS role
       FROM app_user u
       LEFT JOIN user_role ur ON ur.user_id=u.id
       LEFT JOIN role r ON r.id=ur.role_id
       ORDER BY u.created_at`
    )
    res.json({ users: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch users.' }) }
})

// Create new admin user
app.post('/api/auth/users', auth, requireRole('owner'), async (req, res) => {
  const { username, email, full_name, password, role='cashier' } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hash = await bcrypt.hash(password, 12)
    const uRes = await client.query(
      `INSERT INTO app_user (username,email,full_name,password_hash) VALUES ($1,$2,$3,$4) RETURNING id`,
      [username.toLowerCase(), email, full_name, hash]
    )
    await client.query(
      `INSERT INTO user_role (user_id,role_id) SELECT $1,id FROM role WHERE name=$2`,
      [uRes.rows[0].id, role]
    )
    await client.query('COMMIT')
    res.status(201).json({ id: uRes.rows[0].id, message: 'Admin user created.' })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists.' })
    res.status(500).json({ error: 'Failed to create user.' })
  } finally { client.release() }
})

// ── Mobile app routes (customer-facing) ──────────────────────────────────────
app.use('/api/mobile/auth',   mobileAuthRouter)
app.use('/api/mobile/orders', mobileOrdersRouter)

// ── Feature routes ────────────────────────────────────────────────────────────
app.use('/api/products',        products)
app.use('/api/orders',          orders)
app.use('/api/customers',       require('./routes/customers'))
app.use('/api/vendors',         vendors)
app.use('/api/riders',          riders)
app.use('/api/routes',          routes)
app.use('/api/purchases',       purchases)
app.use('/api/ledger',          ledger)
app.use('/api/analytics',       analytics)
app.use('/api/payment-methods', paymentMethods)
app.use('/api/accounts',        accountsRouter)
app.use('/api/loyalty',         loyaltyRouter)

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

app.use('/api/*', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }))
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error.' }) })

app.listen(PORT, () => {
  console.log(`\n🚀  LivingFoods API → http://localhost:${PORT}`)
  console.log(`    Health: http://localhost:${PORT}/api/health\n`)
})
