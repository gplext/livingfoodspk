const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const pool    = require('../db/pool')

const router = express.Router()

const CUSTOMER_TOKEN_EXPIRES  = '24h'
const REFRESH_TOKEN_EXPIRES   = '30d'

function signAccessToken(partner) {
  return jwt.sign(
    { id: partner.id, name: partner.full_name, email: partner.email, role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: CUSTOMER_TOKEN_EXPIRES }
  )
}

function signRefreshToken(partnerId) {
  return jwt.sign(
    { id: partnerId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  )
}

// POST /api/mobile/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' })
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check if an account already exists for this email
    const existing = await client.query(
      `SELECT p.id FROM partner p
       JOIN customer_mobile_auth cma ON cma.partner_id = p.id
       WHERE p.email = $1`,
      [email.toLowerCase().trim()]
    )
    if (existing.rows[0])
      return res.status(409).json({ error: 'An account with that email already exists.' })

    // Create partner record
    const partnerRes = await client.query(
      `INSERT INTO partner (partner_type, full_name, display_name, email)
       VALUES ('customer', $1, $1, $2) RETURNING id, full_name, email`,
      [name.trim(), email.toLowerCase().trim()]
    )
    const partner = partnerRes.rows[0]

    // Create customer_profile
    await client.query(
      `INSERT INTO customer_profile (partner_id) VALUES ($1)`,
      [partner.id]
    )

    // Hash password and store auth record
    const salt = await bcrypt.genSalt(12)
    const hash = await bcrypt.hash(password, salt)
    await client.query(
      `INSERT INTO customer_mobile_auth (partner_id, password_hash, password_salt)
       VALUES ($1, $2, $3)`,
      [partner.id, hash, salt]
    )

    await client.query('COMMIT')

    const token        = signAccessToken(partner)
    const refreshToken = signRefreshToken(partner.id)

    res.status(201).json({
      token,
      refreshToken,
      customer: { id: partner.id, name: partner.full_name, email: partner.email }
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Mobile register error:', err)
    res.status(500).json({ error: 'Registration failed. Please try again.' })
  } finally {
    client.release()
  }
})

// POST /api/mobile/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' })

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.full_name, p.email, cma.password_hash
       FROM partner p
       JOIN customer_mobile_auth cma ON cma.partner_id = p.id
       WHERE p.email = $1 AND p.is_active = true`,
      [email.toLowerCase().trim()]
    )
    const row = rows[0]
    if (!row)
      return res.status(401).json({ error: 'No account found for that email.' })

    const valid = await bcrypt.compare(password, row.password_hash)
    if (!valid)
      return res.status(401).json({ error: 'Incorrect password.' })

    const partner      = { id: row.id, full_name: row.full_name, email: row.email }
    const token        = signAccessToken(partner)
    const refreshToken = signRefreshToken(partner.id)

    res.json({
      token,
      refreshToken,
      customer: { id: partner.id, name: partner.full_name, email: partner.email }
    })
  } catch (err) {
    console.error('Mobile login error:', err)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

// POST /api/mobile/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken)
    return res.status(400).json({ error: 'Refresh token required.' })

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
    if (decoded.type !== 'refresh')
      return res.status(401).json({ error: 'Invalid refresh token.' })

    const { rows } = await pool.query(
      `SELECT id, full_name, email FROM partner WHERE id = $1 AND is_active = true`,
      [decoded.id]
    )
    if (!rows[0])
      return res.status(401).json({ error: 'Account not found.' })

    const token           = signAccessToken(rows[0])
    const newRefreshToken = signRefreshToken(rows[0].id)
    res.json({ token, refreshToken: newRefreshToken })
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token.' })
  }
})

module.exports = router
