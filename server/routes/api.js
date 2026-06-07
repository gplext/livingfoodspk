// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
const express  = require('express')
const pool     = require('../db/pool')
const { auth, requireRole } = require('../middleware/auth')

// ── Products router ──────────────────────────────────────────────────────────
const products = express.Router()
products.use(auth)

products.get('/', async (req, res) => {
  try {
    const { category, active = 'true' } = req.query
    let q = `SELECT p.*, c.name AS category_name, t.rate AS tax_rate_value
             FROM product p
             LEFT JOIN category c ON c.id = p.category_id
             LEFT JOIN tax_rate t ON t.id = p.tax_rate_id
             WHERE p.is_active = $1`
    const params = [active === 'true']
    if (category) { q += ` AND c.name = $2`; params.push(category) }
    q += ' ORDER BY c.name, p.name'
    const { rows } = await pool.query(q, params)
    res.json({ products: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch products.' }) }
})

products.post('/', auth, requireRole('owner','manager'), async (req, res) => {
  const { name, sku, category_id, product_type='finished', sale_price, cost_price=0,
          stock_uom='pcs', tax_rate_id, preparation_minutes=0, reorder_point=0, description } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO product (name,sku,category_id,product_type,sale_price,cost_price,
        stock_uom,tax_rate_id,preparation_minutes,reorder_point,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [name,sku,category_id,product_type,sale_price,cost_price,
       stock_uom,tax_rate_id,preparation_minutes,reorder_point,description]
    )
    res.status(201).json({ id: rows[0].id, message: 'Product created.' })
  } catch (err) { res.status(500).json({ error: 'Failed to create product.' }) }
})

products.patch('/:id', auth, requireRole('owner','manager'), async (req, res) => {
  const { name, sale_price, cost_price, description, is_active, reorder_point } = req.body
  try {
    await pool.query(
      `UPDATE product SET name=$1, sale_price=$2, cost_price=$3,
       description=$4, is_active=$5, reorder_point=$6, updated_at=NOW() WHERE id=$7`,
      [name, sale_price, cost_price, description, is_active, reorder_point, req.params.id]
    )
    res.json({ message: 'Product updated.' })
  } catch (err) { res.status(500).json({ error: 'Failed to update product.' }) }
})

// ── Orders router ─────────────────────────────────────────────────────────────
const orders = express.Router()
orders.use(auth)

orders.get('/', async (req, res) => {
  try {
    const { status, customer_id, channel, limit=50, offset=0 } = req.query
    let q = `SELECT so.*, p.full_name AS customer_name
             FROM sales_order so
             LEFT JOIN partner p ON p.id = so.customer_id
             WHERE 1=1`
    const params = []
    if (status)      { params.push(status);      q += ` AND so.status=$${params.length}` }
    if (customer_id) { params.push(customer_id); q += ` AND so.customer_id=$${params.length}` }
    if (channel)     { params.push(channel);     q += ` AND so.channel=$${params.length}` }
    params.push(limit, offset)
    q += ` ORDER BY so.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`
    const { rows } = await pool.query(q, params)
    res.json({ orders: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch orders.' }) }
})

orders.get('/:id', async (req, res) => {
  try {
    const orderRes = await pool.query(
      `SELECT so.*, p.full_name AS customer_name
       FROM sales_order so LEFT JOIN partner p ON p.id=so.customer_id WHERE so.id=$1`,
      [req.params.id]
    )
    if (!orderRes.rows[0]) return res.status(404).json({ error: 'Order not found.' })
    const itemsRes = await pool.query(
      `SELECT oi.*, pr.name AS product_name FROM sales_order_item oi
       JOIN product pr ON pr.id=oi.product_id WHERE oi.order_id=$1`,
      [req.params.id]
    )
    res.json({ order: orderRes.rows[0], items: itemsRes.rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch order.' }) }
})

// Create order (POS checkout)
orders.post('/', async (req, res) => {
  const { customer_id, channel='pos', items=[], payment_method_id,
          discount_amount=0, notes, location_id, idempotency_key } = req.body
  if (!items.length) return res.status(400).json({ error: 'Order must have at least one item.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check idempotency
    if (idempotency_key) {
      const existing = await client.query(
        'SELECT id FROM sales_order WHERE idempotency_key=$1', [idempotency_key]
      )
      if (existing.rows[0]) {
        await client.query('ROLLBACK')
        return res.status(409).json({ id: existing.rows[0].id, message: 'Duplicate order.' })
      }
    }

    // Compute totals
    let subtotal = 0
    const enriched = []
    for (const it of items) {
      const pRes = await client.query('SELECT id, sale_price FROM product WHERE id=$1', [it.product_id])
      if (!pRes.rows[0]) throw new Error(`Product ${it.product_id} not found`)
      const unit_price = it.unit_price ?? pRes.rows[0].sale_price
      const line_total = unit_price * it.quantity
      subtotal += line_total
      enriched.push({ ...it, unit_price, line_total })
    }
    const total = subtotal - (+discount_amount || 0)

    // Insert order header
    const orderNo = `ORD-${Date.now().toString().slice(-8)}`
    const orderRes = await client.query(
      `INSERT INTO sales_order
         (order_number,customer_id,channel,subtotal,discount_amount,total,status,
          location_id,idempotency_key,notes,user_id)
       VALUES ($1,$2,$3,$4,$5,$6,'confirmed',$7,$8,$9,$10) RETURNING id`,
      [orderNo, customer_id||null, channel, subtotal, discount_amount, total,
       location_id||null, idempotency_key||null, notes||null, req.user.id]
    )
    const orderId = orderRes.rows[0].id

    // Insert items + decrement stock
    for (const it of enriched) {
      await client.query(
        `INSERT INTO sales_order_item (order_id,product_id,quantity,unit_price,line_total)
         VALUES ($1,$2,$3,$4,$5)`,
        [orderId, it.product_id, it.quantity, it.unit_price, it.line_total]
      )
      // Decrement stock_level (default warehouse for location)
      await client.query(
        `UPDATE stock_level SET quantity = quantity - $1::numeric
         WHERE product_id=$2
           AND warehouse_id=(
             SELECT id FROM warehouse WHERE location_id=$3 AND is_default=true LIMIT 1
           )`,
        [it.quantity, it.product_id, location_id||null]
      )
      // Append movement ledger
      await client.query(
        `INSERT INTO inventory_movement
           (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, user_id)
         SELECT $1,
                (SELECT id FROM warehouse WHERE location_id=$2 AND is_default LIMIT 1),
                'sale', -$3::numeric, 'sales_order', $4, $5
         WHERE EXISTS (SELECT 1 FROM warehouse WHERE location_id=$2 AND is_default)`,
        [it.product_id, location_id||null, it.quantity, orderId, req.user.id]
      )
    }

    // Record payment
    if (payment_method_id) {
      await client.query(
        `INSERT INTO sales_payment (order_id, payment_method_id, amount, received_by)
         VALUES ($1,$2,$3,$4)`,
        [orderId, payment_method_id, total, req.user.id]
      )
      await client.query(
        `UPDATE sales_order SET status='paid', amount_paid=$1 WHERE id=$2`,
        [total, orderId]
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ id: orderId, order_number: orderNo, total, message: 'Order created.' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Order creation error:', err)
    res.status(500).json({ error: err.message || 'Failed to create order.' })
  } finally {
    client.release()
  }
})

// PATCH /api/orders/:id/status
orders.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  const allowed = ['pending','confirmed','preparing','ready','out_for_delivery','delivered','completed','paid','cancelled']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' })
  try {
    await pool.query('UPDATE sales_order SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id])
    res.json({ message: 'Status updated.' })
  } catch (err) { res.status(500).json({ error: 'Failed to update status.' }) }
})

// ── Vendors router ────────────────────────────────────────────────────────────
const vendors = express.Router()
vendors.use(auth)

vendors.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.full_name, p.phone, p.email, sp.payment_terms_days, sp.lead_time_days, sp.balance_payable
       FROM partner p LEFT JOIN supplier_profile sp ON sp.partner_id=p.id
       WHERE p.partner_type IN ('supplier','both') AND p.is_active=true ORDER BY p.full_name`
    )
    res.json({ vendors: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch vendors.' }) }
})

vendors.post('/', async (req, res) => {
  const { full_name, phone, email, payment_terms_days=30, notes } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO partner (partner_type, full_name, phone, email, notes)
       VALUES ('supplier',$1,$2,$3,$4) RETURNING id`,
      [full_name, phone, email, notes]
    )
    await client.query(
      `INSERT INTO supplier_profile (partner_id, payment_terms_days) VALUES ($1,$2)`,
      [rows[0].id, payment_terms_days]
    )
    await client.query('COMMIT')
    res.status(201).json({ id: rows[0].id })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Failed to create vendor.' })
  } finally { client.release() }
})

vendors.patch('/:id', async (req, res) => {
  const { full_name, phone, email, notes } = req.body
  try {
    await pool.query(
      `UPDATE partner SET full_name=$1,phone=$2,email=$3,notes=$4,updated_at=NOW() WHERE id=$5`,
      [full_name, phone, email, notes, req.params.id]
    )
    res.json({ message: 'Vendor updated.' })
  } catch (err) { res.status(500).json({ error: 'Failed to update vendor.' }) }
})

// ── Riders router ─────────────────────────────────────────────────────────────
const riders = express.Router()
riders.use(auth)

riders.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rider WHERE is_active=true ORDER BY name'
    )
    res.json({ riders: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch riders.' }) }
})

riders.post('/', async (req, res) => {
  const { name, phone, has_motorcycle=true, number_plate } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO rider (name,phone,has_motorcycle,number_plate) VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, phone, has_motorcycle, number_plate]
    )
    res.status(201).json({ id: rows[0].id })
  } catch (err) { res.status(500).json({ error: 'Failed to create rider.' }) }
})

riders.patch('/:id', async (req, res) => {
  const { name, phone, has_motorcycle, number_plate, is_active } = req.body
  try {
    await pool.query(
      `UPDATE rider SET name=$1,phone=$2,has_motorcycle=$3,number_plate=$4,is_active=$5 WHERE id=$6`,
      [name, phone, has_motorcycle, number_plate, is_active, req.params.id]
    )
    res.json({ message: 'Rider updated.' })
  } catch (err) { res.status(500).json({ error: 'Failed to update rider.' }) }
})

// ── Routes router ─────────────────────────────────────────────────────────────
const routes = express.Router()
routes.use(auth)

routes.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*,
         (SELECT count(*) FROM customer_profile cp WHERE cp.route_id=r.id) AS customer_count
       FROM route r WHERE r.is_active=true ORDER BY r.name`
    )
    res.json({ routes: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch routes.' }) }
})

routes.post('/', async (req, res) => {
  const { name, location_id, on_monday=false, on_tuesday=false, on_wednesday=false,
          on_thursday=false, on_friday=false, on_saturday=false, on_sunday=false } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO route (name,location_id,on_monday,on_tuesday,on_wednesday,on_thursday,on_friday,on_saturday,on_sunday)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [name,location_id,on_monday,on_tuesday,on_wednesday,on_thursday,on_friday,on_saturday,on_sunday]
    )
    res.status(201).json({ id: rows[0].id })
  } catch (err) { res.status(500).json({ error: 'Failed to create route.' }) }
})

// ── Purchases router ──────────────────────────────────────────────────────────
const purchases = express.Router()
purchases.use(auth)

purchases.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT po.*, p.full_name AS supplier_name
       FROM purchase_order po LEFT JOIN partner p ON p.id=po.supplier_id
       ORDER BY po.created_at DESC LIMIT 100`
    )
    res.json({ purchases: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch purchases.' }) }
})

purchases.post('/', async (req, res) => {
  const { supplier_id, location_id, items=[], notes } = req.body
  if (!items.length) return res.status(400).json({ error: 'Purchase must have at least one item.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)
    const poNo = `PO-${Date.now().toString().slice(-8)}`
    const poRes = await client.query(
      `INSERT INTO purchase_order (po_number,supplier_id,location_id,subtotal,total,status)
       VALUES ($1,$2,$3,$4,$4,'received') RETURNING id`,
      [poNo, supplier_id||null, location_id||null, subtotal]
    )
    const poId = poRes.rows[0].id
    for (const it of items) {
      await client.query(
        `INSERT INTO purchase_order_item (po_id,product_id,quantity,unit_cost,line_total)
         VALUES ($1,$2,$3,$4,$5)`,
        [poId, it.product_id, it.quantity, it.unit_cost, it.quantity * it.unit_cost]
      )
      // Update stock
      await client.query(
        `INSERT INTO stock_level (warehouse_id,product_id,quantity,avg_cost)
         SELECT w.id,$1,$2,$3 FROM warehouse w WHERE w.location_id=$4 AND w.is_default LIMIT 1
         ON CONFLICT (warehouse_id,product_id,variant_id) DO UPDATE
           SET quantity = stock_level.quantity + EXCLUDED.quantity,
               avg_cost = (stock_level.avg_cost * stock_level.quantity + $3*$2)
                          / (stock_level.quantity + $2)`,
        [it.product_id, it.quantity, it.unit_cost, location_id||null]
      )
    }
    await client.query('COMMIT')
    res.status(201).json({ id: poId, po_number: poNo })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Failed to create purchase.' })
  } finally { client.release() }
})

// ── Ledger router ─────────────────────────────────────────────────────────────
const ledger = express.Router()
ledger.use(auth)

ledger.get('/', async (req, res) => {
  try {
    const { from, to, account } = req.query
    let q = `SELECT je.id, je.entry_date, je.memo, je.reference_type, je.reference_id,
                    jl.debit, jl.credit, a.name AS account_name, a.code AS account_code
             FROM journal_entry je
             JOIN journal_line jl ON jl.entry_id=je.id
             JOIN account a ON a.id=jl.account_id
             WHERE je.is_posted=true`
    const params = []
    if (from)    { params.push(from);    q += ` AND je.entry_date>=$${params.length}` }
    if (to)      { params.push(to);      q += ` AND je.entry_date<=$${params.length}` }
    if (account) { params.push(account); q += ` AND a.name ILIKE $${params.length}` }
    q += ' ORDER BY je.entry_date DESC, je.id LIMIT 200'
    const { rows } = await pool.query(q, params)
    res.json({ entries: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch ledger.' }) }
})

ledger.post('/', auth, requireRole('owner','manager','accountant'), async (req, res) => {
  const { entry_date, memo, reference_type, reference_id, lines=[], journal_code='GEN' } = req.body
  if (lines.length < 2) return res.status(400).json({ error: 'Need at least 2 lines.' })
  const totalDebit  = lines.reduce((s, l) => s + (+l.debit  || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (+l.credit || 0), 0)
  if (Math.abs(totalDebit - totalCredit) > 0.01)
    return res.status(400).json({ error: `Entry does not balance. Debit ${totalDebit} ≠ Credit ${totalCredit}` })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const jRes = await client.query(
      `INSERT INTO journal_entry (journal_id,entry_date,memo,reference_type,reference_id,is_posted,created_by)
       SELECT id,$1,$2,$3,$4,true,$5 FROM journal WHERE code=$6 RETURNING id`,
      [entry_date||new Date().toISOString().split('T')[0], memo, reference_type||null, reference_id||null, req.user.id, journal_code]
    )
    const entryId = jRes.rows[0].id
    for (const ln of lines) {
      await client.query(
        `INSERT INTO journal_line (entry_id,account_id,debit,credit,memo)
         SELECT $1,id,$2,$3,$4 FROM account WHERE code=$5`,
        [entryId, ln.debit||0, ln.credit||0, ln.memo||null, ln.account_code]
      )
    }
    await client.query('COMMIT')
    res.status(201).json({ id: entryId })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Failed to post journal entry.' })
  } finally { client.release() }
})

// ── Analytics router ──────────────────────────────────────────────────────────
const analytics = express.Router()
analytics.use(auth)

analytics.get('/summary', async (req, res) => {
  try {
    const salesR = await pool.query(
      `SELECT COUNT(*) AS order_count, COALESCE(SUM(total),0) AS revenue
       FROM sales_order
       WHERE status NOT IN ('cancelled','open')
       AND created_at >= CURRENT_DATE`
    )
    const stockR = await pool.query(
      `SELECT COUNT(*) AS low_stock
       FROM product
       WHERE is_active = true
       AND reorder_point > 0`
    )
    const creditR = await pool.query(
      `SELECT COALESCE(SUM(credit_balance),0) AS total_receivable
       FROM customer_profile`
    )
    const custR = await pool.query(
      `SELECT COUNT(*) AS total_customers FROM partner
       WHERE partner_type IN ('customer','both') AND is_active = true`
    )
    res.json({
      today_orders:     +salesR.rows[0].order_count,
      today_revenue:    +salesR.rows[0].revenue,
      low_stock_count:  +stockR.rows[0].low_stock,
      total_receivable: +creditR.rows[0].total_receivable,
      total_customers:  +custR.rows[0].total_customers,
      top_products:     [],
    })
  } catch (err) {
    console.error('Analytics error:', err.message)
    res.json({
      today_orders: 0,
      today_revenue: 0,
      low_stock_count: 0,
      total_receivable: 0,
      total_customers: 0,
      top_products: [],
    })
  }
})


// ── Payment Methods ───────────────────────────────────────────────────────────
const paymentMethods = express.Router()
paymentMethods.use(auth)
paymentMethods.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM payment_method WHERE is_active=true ORDER BY name')
    res.json({ methods: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch payment methods.' }) }
})

// ── Accounts (chart of accounts) ─────────────────────────────────────────────
const accountsRouter = express.Router()
accountsRouter.use(auth)
accountsRouter.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM account WHERE is_active=true ORDER BY code')
    res.json({ accounts: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch accounts.' }) }
})

// ── Loyalty ───────────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken')
const loyaltyRouter = express.Router()

// Middleware: accepts both staff tokens (auth) AND customer tokens
function staffOrCustomerAuth(req, res, next) {
  const header = req.headers['authorization'] || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    req.caller = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

loyaltyRouter.use(auth)  // default: staff auth for tier management

// GET /api/loyalty/tiers — staff only
loyaltyRouter.get('/tiers', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM loyalty_tier ORDER BY display_order')
    res.json({ tiers: rows })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch tiers.' }) }
})

loyaltyRouter.patch('/tiers/:id', async (req, res) => {
  const { name, min_spend_threshold, discount_pct, points_multiplier } = req.body
  try {
    await pool.query(
      'UPDATE loyalty_tier SET name=$1, min_spend_threshold=$2, discount_pct=$3, points_multiplier=$4 WHERE id=$5',
      [name, min_spend_threshold, discount_pct, points_multiplier, req.params.id]
    )
    res.json({ message: 'Tier updated.' })
  } catch (err) { res.status(500).json({ error: 'Failed to update tier.' }) }
})

// GET /api/loyalty/my-balance — customer token required
// Returns loyalty points, tier, total orders, and total spent for the calling customer
loyaltyRouter.get('/my-balance', staffOrCustomerAuth, async (req, res) => {
  const partnerId = req.caller.id
  try {
    const { rows } = await pool.query(
      `SELECT
         cp.loyalty_points   AS points,
         lt.name             AS tier,
         COUNT(so.id)        AS total_orders,
         COALESCE(SUM(so.total), 0) AS total_spent
       FROM customer_profile cp
       LEFT JOIN loyalty_tier lt ON lt.id = cp.loyalty_tier_id
       LEFT JOIN sales_order so
         ON so.customer_id = $1
        AND so.channel = 'mobile'
        AND so.status != 'cancelled'
       WHERE cp.partner_id = $1
       GROUP BY cp.loyalty_points, lt.name`,
      [partnerId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Customer profile not found.' })
    res.json({
      points:      Number(rows[0].points),
      tier:        rows[0].tier ?? 'Bronze',
      totalOrders: Number(rows[0].total_orders),
      totalSpent:  Number(rows[0].total_spent),
    })
  } catch (err) {
    console.error('Loyalty balance error:', err)
    res.status(500).json({ error: 'Failed to fetch loyalty balance.' })
  }
})

module.exports = { products, orders, vendors, riders, routes, purchases, ledger, analytics, paymentMethods, accountsRouter, loyaltyRouter }
