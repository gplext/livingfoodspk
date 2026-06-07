const express = require('express')
const jwt     = require('jsonwebtoken')
const pool    = require('../db/pool')

const router = express.Router()

// Middleware: verify customer JWT
function customerAuth(req, res, next) {
  const header = req.headers['authorization'] || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token)
    return res.status(401).json({ error: 'Authentication required.' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'customer')
      return res.status(403).json({ error: 'Customer access only.' })
    req.customer = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// Points calculation — single source of truth (matches mobile cart display)
function calculatePoints(total) {
  return Math.round(total / 2)
}

// POST /api/mobile/orders — place a new mobile order
router.post('/', customerAuth, async (req, res) => {
  const { items = [], total } = req.body
  if (!items.length)
    return res.status(400).json({ error: 'Cart is empty.' })
  if (!total || total <= 0)
    return res.status(400).json({ error: 'Invalid order total.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const orderNo  = `MOB-${Date.now().toString().slice(-8)}`
    const orderRes = await client.query(
      `INSERT INTO sales_order
         (order_number, customer_id, channel, subtotal, total, status, notes)
       VALUES ($1, $2, 'mobile', $3, $3, 'paid', 'Mobile app order')
       RETURNING id`,
      [orderNo, req.customer.id, total]
    )
    const orderId = orderRes.rows[0].id

    // Best-effort product match by name; skip item insert if not found in ERP catalog
    for (const item of items) {
      const prodRes = await client.query(
        `SELECT id FROM product WHERE name ILIKE $1 AND is_active = true LIMIT 1`,
        [item.name]
      )
      if (prodRes.rows[0]) {
        const lineTotal = item.unitPrice * item.quantity
        await client.query(
          `INSERT INTO sales_order_item
             (order_id, product_id, quantity, unit_price, line_total, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, prodRes.rows[0].id, item.quantity, item.unitPrice, lineTotal, item.itemId ?? null]
        )
      }
    }

    // Award loyalty points
    const pointsEarned = calculatePoints(total)
    await client.query(
      `UPDATE customer_profile
       SET loyalty_points = loyalty_points + $1,
           lifetime_spend  = lifetime_spend  + $2
       WHERE partner_id = $3`,
      [pointsEarned, total, req.customer.id]
    )
    await client.query(
      `INSERT INTO loyalty_transaction (partner_id, points_delta, reason, reference_id)
       VALUES ($1, $2, 'Mobile order earn', $3)`,
      [req.customer.id, pointsEarned, orderId]
    )

    await client.query('COMMIT')
    res.status(201).json({ orderId, total, pointsEarned })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Mobile order error:', err)
    res.status(500).json({ error: 'Failed to place order. Please try again.' })
  } finally {
    client.release()
  }
})

// GET /api/mobile/orders — order history for the authenticated customer
router.get('/', customerAuth, async (req, res) => {
  try {
    const ordersRes = await pool.query(
      `SELECT so.id, so.order_number, so.created_at, so.total,
              COALESCE(
                (SELECT SUM(lt.points_delta)
                 FROM loyalty_transaction lt
                 WHERE lt.reference_id = so.id AND lt.points_delta > 0),
                0
              ) AS points_earned
       FROM sales_order so
       WHERE so.customer_id = $1
         AND so.channel = 'mobile'
         AND so.status != 'cancelled'
       ORDER BY so.created_at DESC
       LIMIT 20`,
      [req.customer.id]
    )

    if (ordersRes.rows.length === 0) return res.json({ orders: [] })

    // Fetch line items for all orders in one query
    const orderIds = ordersRes.rows.map(r => r.id)
    const itemsRes = await pool.query(
      `SELECT soi.order_id, soi.quantity, soi.unit_price, soi.notes AS item_id,
              p.name AS product_name
       FROM sales_order_item soi
       LEFT JOIN product p ON p.id = soi.product_id
       WHERE soi.order_id = ANY($1::uuid[])
       ORDER BY soi.id`,
      [orderIds]
    )

    const itemsByOrder = new Map()
    for (const row of itemsRes.rows) {
      const list = itemsByOrder.get(row.order_id) ?? []
      list.push({
        itemId:    row.item_id ?? '',
        itemName:  row.product_name ?? 'Item',
        quantity:  Number(row.quantity),
        unitPrice: Number(row.unit_price),
        modifiers: null,
      })
      itemsByOrder.set(row.order_id, list)
    }

    const orders = ordersRes.rows.map(o => {
      const items    = itemsByOrder.get(o.id) ?? []
      const itemCount = items.reduce((s, i) => s + i.quantity, 0)
      const preview   = items.map(i => i.itemName).join(', ')
      return {
        id:           o.id,
        orderNumber:  o.order_number,
        createdAt:    new Date(o.created_at).getTime(),
        total:        Number(o.total),
        pointsEarned: Number(o.points_earned),
        itemCount,
        preview,
        items,
      }
    })

    res.json({ orders })
  } catch (err) {
    console.error('Mobile orders fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch order history.' })
  }
})

module.exports = router
