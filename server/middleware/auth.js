const jwt = require('jsonwebtoken')

function auth(req, res, next) {
  // Accept token from Authorization: Bearer <token>  OR  cookie
  const header = req.headers['authorization'] || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'No token provided. Please log in.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded   // { id, username, role, ... }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' })
  }
}

// Role guard factory — usage: router.get('/...', auth, requireRole('owner','manager'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}` })
    }
    next()
  }
}

module.exports = { auth, requireRole }
