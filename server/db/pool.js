const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'cafe_erp',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Keep a few idle connections ready; cap to avoid exhausting Postgres
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test the connection on startup and print a clear message
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Database connection failed:', err.message)
    console.error('    Check your .env DB_* variables and make sure PostgreSQL is running.')
  } else {
    client.query('SELECT current_database(), current_user', (e, r) => {
      release()
      if (!e) {
        const { current_database, current_user } = r.rows[0]
        console.log(`✅  PostgreSQL connected → db: ${current_database}  user: ${current_user}`)
      }
    })
  }
})

module.exports = pool
