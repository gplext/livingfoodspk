const express = require('express')
const pool    = require('../db/pool')
const { auth } = require('../middleware/auth')

const router = express.Router()
router.use(auth)   // all customer routes require login

// GET /api/customers  — list with loyalty tier joined
router.get('/', async (req, res) => {
  try {
    const { search = '', limit = 50, offset = 0 } = req.query
    const { rows } = await pool.query(
      `SELECT p.id, p.display_name, p.full_name, p.phone, p.email, p.whatsapp,
              cp.credit_balance, cp.credit_limit, cp.credit_due_day_of_month,
              cp.loyalty_points, lt.name AS loyalty_tier,
              r.name AS route_name
       FROM partner p
       LEFT JOIN customer_profile cp ON cp.partner_id = p.id
       LEFT JOIN loyalty_tier lt ON lt.id = cp.loyalty_tier_id
       LEFT JOIN route r ON r.id = cp.route_id
       WHERE p.partner_type IN ('customer','both') AND p.is_active = true
         AND (p.full_name ILIKE $1 OR p.phone ILIKE $1 OR p.email ILIKE $1)
       ORDER BY p.full_name
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    )
    res.json({ customers: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch customers.' })
  }
})

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, cp.*, lt.name AS loyalty_tier_name, r.name AS route_name
       FROM partner p
       LEFT JOIN customer_profile cp ON cp.partner_id = p.id
       LEFT JOIN loyalty_tier lt ON lt.id = cp.loyalty_tier_id
       LEFT JOIN route r ON r.id = cp.route_id
       WHERE p.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found.' })
    res.json({ customer: rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer.' })
  }
})

// POST /api/customers
router.post('/', async (req, res) => {
  const { full_name, display_name, phone, email, whatsapp, address,
          credit_limit = 0, credit_due_day_of_month, loyalty_tier_id, route_id } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Insert into partner
    const partnerRes = await client.query(
      `INSERT INTO partner (partner_type, full_name, display_name, phone, email, whatsapp)
       VALUES ('customer', $1, $2, $3, $4, $5) RETURNING id`,
      [full_name, display_name || full_name, phone, email, whatsapp]
    )
    const partnerId = partnerRes.rows[0].id

    // Insert address if provided
    if (address) {
      await client.query(
        `INSERT INTO partner_address (partner_id, line1, is_default) VALUES ($1, $2, true)`,
        [partnerId, address]
      )
    }

    // Insert customer profile
    await client.query(
      `INSERT INTO customer_profile
         (partner_id, credit_limit, credit_due_day_of_month, loyalty_tier_id, route_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [partnerId, credit_limit, credit_due_day_of_month || null,
       loyalty_tier_id || null, route_id || null]
    )

    await client.query('COMMIT')
    res.status(201).json({ id: partnerId, message: 'Customer created.' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to create customer.' })
  } finally {
    client.release()
  }
})

// PATCH /api/customers/:id
router.patch('/:id', async (req, res) => {
  const { full_name, display_name, phone, email, whatsapp,
          credit_limit, credit_due_day_of_month, loyalty_tier_id, route_id } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE partner SET full_name=$1, display_name=$2, phone=$3, email=$4, whatsapp=$5, updated_at=NOW()
       WHERE id=$6`,
      [full_name, display_name, phone, email, whatsapp, req.params.id]
    )
    await client.query(
      `UPDATE customer_profile
       SET credit_limit=$1, credit_due_day_of_month=$2, loyalty_tier_id=$3, route_id=$4
       WHERE partner_id=$5`,
      [credit_limit, credit_due_day_of_month, loyalty_tier_id, route_id, req.params.id]
    )
    await client.query('COMMIT')
    res.json({ message: 'Customer updated.' })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Failed to update customer.' })
  } finally {
    client.release()
  }
})

// DELETE /api/customers/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE partner SET is_active=false WHERE id=$1', [req.params.id])
    res.json({ message: 'Customer deactivated.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete customer.' })
  }
})

module.exports = router
