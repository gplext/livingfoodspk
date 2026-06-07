/**
 * Run this ONCE after running cafe_erp_full.sql to create the first superadmin.
 *
 * Usage:
 *   cd server
 *   cp .env.example .env          # fill in your DB credentials
 *   node db/seed.js
 */

require('dotenv').config()
const bcrypt = require('bcryptjs')
const pool   = require('./pool')

async function seed() {
  console.log('\n🌱  Seeding database…\n')

  // ── Create super-admin user ──────────────────────────────────────────────
  const password     = 'admin123'
  const passwordHash = await bcrypt.hash(password, 12)

  const userRes = await pool.query(
    `INSERT INTO app_user (username, email, full_name, password_hash, is_active)
     VALUES ('superadmin', 'admin@livingfoods.com', 'Super Admin', $1, true)
     ON CONFLICT (username) DO UPDATE SET password_hash = $1
     RETURNING id`,
    [passwordHash]
  )
  const userId = userRes.rows[0].id
  console.log(`✅  User created/updated: superadmin (id: ${userId})`)

  // ── Assign owner role ────────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO user_role (user_id, role_id)
     SELECT $1, id FROM role WHERE name='owner'
     ON CONFLICT DO NOTHING`,
    [userId]
  )
  console.log('✅  Role assigned: owner')

  // ── Create default company & location ─────────────────────────────────
  const coRes = await pool.query(
    `INSERT INTO company (legal_name, trading_name, base_currency, timezone)
     VALUES ('LivingFoods Pvt Ltd', 'Living Foods', 'PKR', 'Asia/Karachi')
     ON CONFLICT DO NOTHING RETURNING id`
  )
  let companyId = coRes.rows[0]?.id
  if (!companyId) {
    const r = await pool.query(`SELECT id FROM company LIMIT 1`)
    companyId = r.rows[0]?.id
  }
  console.log(`✅  Company: LivingFoods Pvt Ltd (id: ${companyId})`)

  const locRes = await pool.query(
    `INSERT INTO location (company_id, code, name, type)
     VALUES ($1, 'CAFE-MAIN', 'Main Café', 'cafe')
     ON CONFLICT (code) DO NOTHING RETURNING id`,
    [companyId]
  )
  let locationId = locRes.rows[0]?.id
  if (!locationId) {
    const r = await pool.query(`SELECT id FROM location WHERE code='CAFE-MAIN'`)
    locationId = r.rows[0]?.id
  }
  console.log(`✅  Location: Main Café (id: ${locationId})`)

  // ── Create default warehouse ───────────────────────────────────────────
  await pool.query(
    `INSERT INTO warehouse (location_id, name, is_default)
     VALUES ($1, 'Front Bar', true)
     ON CONFLICT DO NOTHING`,
    [locationId]
  )
  console.log('✅  Warehouse: Front Bar')

  // ── Create default POS register ───────────────────────────────────────
  await pool.query(
    `INSERT INTO pos_register (location_id, name, is_active)
     VALUES ($1, 'Till 1', true)
     ON CONFLICT DO NOTHING`,
    [locationId]
  )
  console.log('✅  POS Register: Till 1')

  // ── Sample products ───────────────────────────────────────────────────
  const catRes = await pool.query(
    `INSERT INTO category (name) VALUES ('Dairy'),('Coffee'),('Bakery'),('Beverages')
     ON CONFLICT DO NOTHING RETURNING id, name`
  )
  console.log(`✅  Categories inserted`)

  const taxRes = await pool.query(`SELECT id FROM tax_rate WHERE name='GST 17%' LIMIT 1`)
  const taxId  = taxRes.rows[0]?.id

  const sampleProducts = [
    { name:'Full Cream Milk',  sku:'MILK-FC-1L',  cat:'Dairy',    price:280, cost:220, unit:'L'   },
    { name:'Cappuccino',       sku:'COFFEE-CAP',  cat:'Coffee',   price:450, cost:180, unit:'cup' },
    { name:'Cold Brew',        sku:'COFFEE-CB',   cat:'Coffee',   price:520, cost:200, unit:'cup' },
    { name:'Croissant',        sku:'BAKERY-CROS', cat:'Bakery',   price:180, cost:90,  unit:'pcs' },
    { name:'Greek Yogurt',     sku:'DAIRY-YOG',   cat:'Dairy',    price:320, cost:240, unit:'pcs' },
    { name:'Fresh Orange Juice',sku:'BEV-OJ',     cat:'Beverages',price:380, cost:150, unit:'cup' },
  ]

  for (const p of sampleProducts) {
    const cRes = await pool.query(`SELECT id FROM category WHERE name=$1 LIMIT 1`, [p.cat])
    const catId = cRes.rows[0]?.id
    await pool.query(
      `INSERT INTO product (name,sku,category_id,sale_price,cost_price,stock_uom,tax_rate_id,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (sku) DO NOTHING`,
      [p.name, p.sku, catId, p.price, p.cost, p.unit, taxId]
    )
  }
  console.log(`✅  Sample products inserted`)

  console.log('\n🎉  Seed complete!\n')
  console.log('   Login:    superadmin')
  console.log('   Password: admin123')
  console.log('   URL:      http://localhost:5173/#/admin\n')

  await pool.end()
}

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message)
  process.exit(1)
})
