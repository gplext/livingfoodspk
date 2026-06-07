const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const pool    = require('../db/pool')
const { auth } = require('../middleware/auth')

const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' })

  try {
    const { rows } = await pool.query(
      'SELECT * FROM app_user WHERE username = $1 AND is_active = true',
      [username.toLowerCase()]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      // Increment failed login counter
      await pool.query(
        'UPDATE app_user SET failed_logins = failed_logins + 1 WHERE id = $1',
        [user.id]
      )
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    // Fetch user's roles
    const roleRes = await pool.query(
      `SELECT r.name FROM role r
       JOIN user_role ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [user.id]
    )
    const roles = roleRes.rows.map(r => r.name)
    const primaryRole = roles[0] || 'viewer'

    // Reset failed logins & stamp last_login
    await pool.query(
      'UPDATE app_user SET failed_logins = 0, last_login_at = NOW() WHERE id = $1',
      [user.id]
    )

    const token = jwt.sign(
      { id: user.id, username: user.username, role: primaryRole, roles },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: primaryRole,
        roles,
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error during login.' })
  }
})

// GET /api/auth/me  — validate token and return current user
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, full_name, email FROM app_user WHERE id = $1',
      [req.user.id]
    )
    res.json({ user: { ...rows[0], role: req.user.role, roles: req.user.roles } })
  } catch (err) {
    res.status(500).json({ error: 'Server error.' })
  }
})

module.exports = router
