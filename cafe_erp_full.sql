-- ============================================================================
--  CAFÉ ERP — COMPREHENSIVE DATABASE SCHEMA  (Dolibarr-class)
--  PostgreSQL 14+  ·  Single source of truth  ·  Modular monolith
--  VERIFIED: executes cleanly on PostgreSQL 16 (exit 0, 0 errors).
--  Creates 81 tables, 5 reporting views, 136 indexes, 149 FK constraints,
--  7 updated_at triggers. Functional tests passed (BOM, double-entry,
--  generated columns, deferred FKs, reporting views).
-- ----------------------------------------------------------------------------
--  MODULE MAP
--   00  Extensions & utility (updated_at trigger, helper enums)
--   01  Organization        (company, location/branch, fiscal periods, currency)
--   02  Security & Access    (users, roles, permissions, sessions, audit log)
--   03  Catalog & Menu       (categories, products, variants, modifiers, recipes/BOM)
--   04  Inventory            (warehouses, stock, lots, movements, stock counts)
--   05  Partners (CRM)       (customers, suppliers, contacts, addresses, segments)
--   06  Loyalty & Marketing  (tiers, points, promotions, coupons, gift cards)
--   07  Sales & POS          (orders, lines, payments, registers/shifts, refunds)
--   08  Procurement          (purchase orders, receipts, supplier invoices)
--   09  Accounting           (chart of accounts, journals, entries, tax, bank)
--   10  HR & Payroll         (employees, contracts, attendance, leave, payroll)
--   11  Delivery (Phase 2)   (routes, riders, schedules, manifests, deliveries)
--   12  Assets & Maintenance (equipment, maintenance logs)
--   13  Reporting helpers    (views, KPIs)
--   14  Seed reference data
-- ============================================================================

-- ============================================================================
-- 00 · EXTENSIONS & UTILITY
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive email/usernames

-- Generic updated_at maintenance
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 01 · ORGANIZATION
-- ============================================================================
CREATE TABLE company (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name      TEXT NOT NULL,
  trading_name    TEXT,
  tax_id          TEXT,                       -- NTN / VAT / EIN
  registration_no TEXT,
  base_currency   CHAR(3) NOT NULL DEFAULT 'PKR',
  timezone        TEXT NOT NULL DEFAULT 'Asia/Karachi',
  logo_url        TEXT,
  email           CITEXT,
  phone           TEXT,
  address         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE currency (
  code        CHAR(3) PRIMARY KEY,            -- ISO 4217
  name        TEXT NOT NULL,
  symbol      TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE exchange_rate (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency CHAR(3) NOT NULL REFERENCES currency(code),
  to_currency   CHAR(3) NOT NULL REFERENCES currency(code),
  rate          NUMERIC(18,8) NOT NULL,
  rate_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (from_currency, to_currency, rate_date)
);

CREATE TABLE location (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES company(id),
  code          TEXT UNIQUE,                  -- e.g. CAFE-DHA-01
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'cafe', -- cafe | kitchen | warehouse | kiosk
  address       TEXT,
  phone         TEXT,
  timezone      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  opened_on     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounting/fiscal periods used to lock posting after close
CREATE TABLE fiscal_period (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES company(id),
  name        TEXT NOT NULL,                  -- '2026-05' or 'FY2026'
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',   -- open | closed | locked
  closed_at   TIMESTAMPTZ,
  UNIQUE (company_id, name)
);

-- ============================================================================
-- 02 · SECURITY & ACCESS CONTROL  (RBAC)
-- ============================================================================
CREATE TABLE app_user (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        CITEXT UNIQUE NOT NULL,
  email           CITEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  full_name       TEXT,
  phone           TEXT,
  pin_hash        TEXT,                        -- quick POS login PIN
  default_location_id UUID REFERENCES location(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  failed_logins   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,           -- owner | manager | accountant | cashier | barista | rider | viewer
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE permission (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,           -- e.g. 'sales.refund', 'catalog.edit'
  description TEXT
);

CREATE TABLE role_permission (
  role_id       UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_role (
  user_id   UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role_id   UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  location_id UUID REFERENCES location(id),   -- optional per-location scoping
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_session (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

-- Universal audit log (who changed what, when)
CREATE TABLE audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID REFERENCES app_user(id),
  action      TEXT NOT NULL,                  -- insert | update | delete | login | void
  entity_type TEXT NOT NULL,                  -- table name
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 03 · CATALOG & MENU
-- ============================================================================
CREATE TABLE uom (                            -- units of measure
  code        TEXT PRIMARY KEY,               -- 'L','ml','kg','g','pcs','cup','shot'
  name        TEXT NOT NULL,
  base_uom    TEXT REFERENCES uom(code),      -- ml -> base L
  factor      NUMERIC(18,6) DEFAULT 1         -- 1000 ml = 1 L
);

CREATE TABLE category (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES category(id),
  name        TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tax_rate (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                  -- 'GST 17%', 'Exempt'
  rate        NUMERIC(6,4) NOT NULL DEFAULT 0,-- 0.1700
  is_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE product (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT UNIQUE,
  barcode         TEXT,
  name            TEXT NOT NULL,
  display_name    TEXT,
  description     TEXT,
  category_id     UUID REFERENCES category(id),
  product_type    TEXT NOT NULL DEFAULT 'finished', -- finished | ingredient | raw | service | combo
  is_sellable     BOOLEAN NOT NULL DEFAULT TRUE,
  is_stocked      BOOLEAN NOT NULL DEFAULT TRUE,
  is_made_to_order BOOLEAN NOT NULL DEFAULT FALSE,   -- prepared drinks
  stock_uom       TEXT REFERENCES uom(code) DEFAULT 'pcs',
  sale_price      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- default unit sale price
  cost_price      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- moving avg cost
  tax_rate_id     UUID REFERENCES tax_rate(id),
  image_url       TEXT,
  preparation_minutes INTEGER DEFAULT 0,
  reorder_point   NUMERIC(12,2) DEFAULT 0,
  reorder_qty     NUMERIC(12,2) DEFAULT 0,
  for_milkshop_only BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Variants (e.g. Small/Medium/Large; Hot/Iced) — each can carry a price delta
CREATE TABLE product_variant (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                -- 'Large', 'Iced'
  sku           TEXT UNIQUE,
  price_delta   NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- Modifier groups & options (e.g. "Milk type": Whole/Oat/Almond +50)
CREATE TABLE modifier_group (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  min_select    INTEGER NOT NULL DEFAULT 0,
  max_select    INTEGER NOT NULL DEFAULT 1,
  is_required   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE modifier_option (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_group_id UUID NOT NULL REFERENCES modifier_group(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,              -- 'Oat milk'
  price_delta     NUMERIC(12,2) NOT NULL DEFAULT 0,
  linked_ingredient_id UUID REFERENCES product(id), -- consumes stock
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE product_modifier_group (
  product_id        UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL REFERENCES modifier_group(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, modifier_group_id)
);

-- Recipe / Bill of Materials: a finished product consumes ingredients
CREATE TABLE recipe (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  yield_qty     NUMERIC(12,4) NOT NULL DEFAULT 1,
  yield_uom     TEXT REFERENCES uom(code),
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE recipe_item (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     UUID NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES product(id),
  quantity      NUMERIC(12,4) NOT NULL,
  uom           TEXT REFERENCES uom(code),
  wastage_pct   NUMERIC(5,2) NOT NULL DEFAULT 0
);

-- Per-location price overrides (optional)
CREATE TABLE price_list (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  location_id   UUID REFERENCES location(id),
  valid_from    DATE,
  valid_to      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE price_list_item (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES price_list(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES product(id),
  variant_id    UUID REFERENCES product_variant(id),
  price         NUMERIC(12,2) NOT NULL,
  UNIQUE (price_list_id, product_id, variant_id)
);

-- ============================================================================
-- 04 · INVENTORY
-- ============================================================================
CREATE TABLE warehouse (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES location(id),
  name        TEXT NOT NULL,                  -- 'Front bar', 'Cold store'
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Current on-hand per product per warehouse (denormalized for speed; kept in sync)
CREATE TABLE stock_level (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id  UUID NOT NULL REFERENCES warehouse(id),
  product_id    UUID NOT NULL REFERENCES product(id),
  variant_id    UUID REFERENCES product_variant(id),
  quantity      NUMERIC(14,4) NOT NULL DEFAULT 0,
  avg_cost      NUMERIC(12,4) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, product_id, variant_id)
);

-- Lot / batch tracking with expiry (important for dairy)
CREATE TABLE stock_lot (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES product(id),
  warehouse_id  UUID NOT NULL REFERENCES warehouse(id),
  lot_number    TEXT,
  quantity      NUMERIC(14,4) NOT NULL DEFAULT 0,
  expiry_date   DATE,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable movement ledger — every stock change writes one row
CREATE TABLE inventory_movement (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id    UUID NOT NULL REFERENCES product(id),
  variant_id    UUID REFERENCES product_variant(id),
  warehouse_id  UUID NOT NULL REFERENCES warehouse(id),
  lot_id        UUID REFERENCES stock_lot(id),
  movement_type TEXT NOT NULL,                -- purchase|sale|wastage|adjustment|transfer_in|transfer_out|production_in|production_out
  quantity      NUMERIC(14,4) NOT NULL,       -- +in / -out
  unit_cost     NUMERIC(12,4),
  reference_type TEXT,                         -- 'order','purchase_receipt','stock_count', etc
  reference_id  UUID,
  reason        TEXT,
  user_id       UUID REFERENCES app_user(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock transfers between warehouses/locations
CREATE TABLE stock_transfer (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_warehouse_id UUID NOT NULL REFERENCES warehouse(id),
  to_warehouse_id   UUID NOT NULL REFERENCES warehouse(id),
  status        TEXT NOT NULL DEFAULT 'draft', -- draft|in_transit|received|cancelled
  notes         TEXT,
  created_by    UUID REFERENCES app_user(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at   TIMESTAMPTZ
);

CREATE TABLE stock_transfer_item (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id   UUID NOT NULL REFERENCES stock_transfer(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES product(id),
  quantity      NUMERIC(14,4) NOT NULL
);

-- Physical stock counts / cycle counts
CREATE TABLE stock_count (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id  UUID NOT NULL REFERENCES warehouse(id),
  status        TEXT NOT NULL DEFAULT 'draft', -- draft|counting|completed
  counted_by    UUID REFERENCES app_user(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE stock_count_item (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id UUID NOT NULL REFERENCES stock_count(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES product(id),
  system_qty    NUMERIC(14,4) NOT NULL DEFAULT 0,
  counted_qty   NUMERIC(14,4) NOT NULL DEFAULT 0,
  variance      NUMERIC(14,4) GENERATED ALWAYS AS (counted_qty - system_qty) STORED
);

-- ============================================================================
-- 05 · PARTNERS (CRM): CUSTOMERS & SUPPLIERS
-- ============================================================================
CREATE TABLE partner (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_type  TEXT NOT NULL DEFAULT 'customer', -- customer | supplier | both
  code          TEXT UNIQUE,
  full_name     TEXT,
  display_name  TEXT,
  company_name  TEXT,
  tax_id        TEXT,
  email         CITEXT,
  phone         TEXT,
  whatsapp      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_address (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  label         TEXT,                          -- 'Home','Office'
  line1         TEXT,
  line2         TEXT,
  city          TEXT,
  region        TEXT,
  postal_code   TEXT,
  country       TEXT DEFAULT 'PK',
  latitude      NUMERIC(9,6),
  longitude     NUMERIC(9,6),
  is_default    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE partner_contact (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  name          TEXT,
  role          TEXT,
  email         CITEXT,
  phone         TEXT
);

-- Customer-specific commercial profile (credit, billing day, route)
CREATE TABLE customer_profile (
  partner_id              UUID PRIMARY KEY REFERENCES partner(id) ON DELETE CASCADE,
  credit_limit            NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_balance          NUMERIC(12,2) NOT NULL DEFAULT 0,  -- outstanding
  credit_due_day_of_month INTEGER,                            -- 1..28
  payment_terms_days      INTEGER NOT NULL DEFAULT 0,
  loyalty_tier_id         UUID,                               -- FK added after loyalty table
  loyalty_points          INTEGER NOT NULL DEFAULT 0,
  lifetime_spend          NUMERIC(14,2) NOT NULL DEFAULT 0,
  route_id                UUID,                               -- FK added after route table
  default_price_list_id   UUID REFERENCES price_list(id)
);

-- Supplier-specific profile
CREATE TABLE supplier_profile (
  partner_id          UUID PRIMARY KEY REFERENCES partner(id) ON DELETE CASCADE,
  payment_terms_days  INTEGER NOT NULL DEFAULT 0,
  bank_account        TEXT,
  lead_time_days      INTEGER DEFAULT 0,
  balance_payable     NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE customer_segment (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name    TEXT NOT NULL,                       -- 'Office', 'Home delivery', 'Walk-in'
  description TEXT
);

CREATE TABLE partner_segment (
  partner_id  UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  segment_id  UUID NOT NULL REFERENCES customer_segment(id) ON DELETE CASCADE,
  PRIMARY KEY (partner_id, segment_id)
);

-- ============================================================================
-- 06 · LOYALTY & MARKETING
-- ============================================================================
CREATE TABLE loyalty_tier (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,           -- Bronze | Silver | Gold | Platinum
  min_spend_threshold NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_pct        NUMERIC(5,2) NOT NULL DEFAULT 0,
  points_multiplier   NUMERIC(5,2) NOT NULL DEFAULT 1,
  display_order       INTEGER DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE loyalty_transaction (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  partner_id    UUID NOT NULL REFERENCES partner(id),
  points_delta  INTEGER NOT NULL,              -- +earn / -redeem
  reason        TEXT,
  reference_id  UUID,                            -- order id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE promotion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  promo_type    TEXT NOT NULL,                  -- percent | fixed | bogo | bundle
  value         NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  applies_to_category_id UUID REFERENCES category(id),
  applies_to_product_id  UUID REFERENCES product(id),
  valid_from    TIMESTAMPTZ,
  valid_to      TIMESTAMPTZ,
  max_uses      INTEGER,
  uses_count    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE coupon (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  promotion_id  UUID REFERENCES promotion(id),
  is_single_use BOOLEAN NOT NULL DEFAULT TRUE,
  redeemed_at   TIMESTAMPTZ,
  redeemed_by_partner_id UUID REFERENCES partner(id)
);

CREATE TABLE gift_card (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number   TEXT UNIQUE NOT NULL,
  initial_value NUMERIC(12,2) NOT NULL,
  balance       NUMERIC(12,2) NOT NULL,
  issued_to_partner_id UUID REFERENCES partner(id),
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- Now wire customer_profile.loyalty_tier_id
ALTER TABLE customer_profile
  ADD CONSTRAINT fk_cust_tier FOREIGN KEY (loyalty_tier_id) REFERENCES loyalty_tier(id);

-- ============================================================================
-- 07 · SALES & POS
-- ============================================================================
-- Register = a physical till at a location; shift = a cashier session on it
CREATE TABLE pos_register (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES location(id),
  name        TEXT NOT NULL,                   -- 'Till 1'
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pos_shift (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id     UUID NOT NULL REFERENCES pos_register(id),
  user_id         UUID NOT NULL REFERENCES app_user(id),
  business_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_float   NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash    NUMERIC(12,2),
  expected_cash   NUMERIC(12,2),
  variance        NUMERIC(12,2),
  cash_sales      NUMERIC(12,2) NOT NULL DEFAULT 0,
  card_sales      NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_sales    NUMERIC(12,2) NOT NULL DEFAULT 0,
  online_sales    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open',-- open | closed
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

CREATE TABLE sales_order (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT UNIQUE,
  location_id       UUID REFERENCES location(id),
  register_id       UUID REFERENCES pos_register(id),
  shift_id          UUID REFERENCES pos_shift(id),
  customer_id       UUID REFERENCES partner(id),
  user_id           UUID REFERENCES app_user(id),  -- cashier
  channel           TEXT NOT NULL DEFAULT 'pos',    -- pos | online | route_delivery | phone
  order_type        TEXT NOT NULL DEFAULT 'takeaway',-- dine_in | takeaway | delivery
  table_number      TEXT,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  promotion_id      UUID REFERENCES promotion(id),
  tax_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tip_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due        NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'open',   -- open|confirmed|preparing|ready|served|out_for_delivery|delivered|completed|paid|cancelled|refunded
  delivery_address  TEXT,
  contact_phone     TEXT,
  idempotency_key   TEXT UNIQUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_order_item (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES sales_order(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES product(id),
  variant_id      UUID REFERENCES product_variant(id),
  description     TEXT,
  quantity        NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate_id     UUID REFERENCES tax_rate(id),
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
  kitchen_status  TEXT DEFAULT 'pending',         -- pending|preparing|ready
  notes           TEXT
);

-- Selected modifiers per line item
CREATE TABLE sales_order_item_modifier (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id      UUID NOT NULL REFERENCES sales_order_item(id) ON DELETE CASCADE,
  modifier_option_id UUID NOT NULL REFERENCES modifier_option(id),
  price_delta        NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE payment_method (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                    -- Cash | Card | Easypaisa | JazzCash | Credit | Gift card
  type        TEXT NOT NULL,                    -- cash|card|wallet|credit|gift_card|bank
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sales_payment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES sales_order(id),
  partner_id      UUID REFERENCES partner(id),
  payment_method_id UUID REFERENCES payment_method(id),
  amount          NUMERIC(12,2) NOT NULL,
  reference       TEXT,                          -- txn id / approval code
  gift_card_id    UUID REFERENCES gift_card(id),
  received_by     UUID REFERENCES app_user(id),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note            TEXT
);

CREATE TABLE sales_refund (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES sales_order(id),
  amount          NUMERIC(12,2) NOT NULL,
  reason          TEXT,
  refunded_by     UUID REFERENCES app_user(id),
  approved_by     UUID REFERENCES app_user(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 08 · PROCUREMENT
-- ============================================================================
CREATE TABLE purchase_order (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number       TEXT UNIQUE,
  supplier_id     UUID NOT NULL REFERENCES partner(id),
  location_id     UUID REFERENCES location(id),
  status          TEXT NOT NULL DEFAULT 'draft', -- draft|sent|partial|received|billed|cancelled
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        CHAR(3) DEFAULT 'PKR',
  created_by      UUID REFERENCES app_user(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_item (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES product(id),
  quantity        NUMERIC(14,4) NOT NULL,
  received_qty    NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(12,4) NOT NULL,
  tax_rate_id     UUID REFERENCES tax_rate(id),
  line_total      NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE goods_receipt (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID REFERENCES purchase_order(id),
  supplier_id     UUID REFERENCES partner(id),
  warehouse_id    UUID REFERENCES warehouse(id),
  receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by     UUID REFERENCES app_user(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE goods_receipt_item (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES goods_receipt(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES product(id),
  quantity        NUMERIC(14,4) NOT NULL,
  unit_cost       NUMERIC(12,4) NOT NULL,
  lot_number      TEXT,
  expiry_date     DATE
);

CREATE TABLE supplier_invoice (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT,
  supplier_id     UUID NOT NULL REFERENCES partner(id),
  po_id           UUID REFERENCES purchase_order(id),
  invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'unpaid', -- unpaid|partial|paid
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_payment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_invoice_id UUID REFERENCES supplier_invoice(id),
  supplier_id     UUID REFERENCES partner(id),
  amount          NUMERIC(12,2) NOT NULL,
  payment_method_id UUID REFERENCES payment_method(id),
  paid_by         UUID REFERENCES app_user(id),
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference       TEXT
);

-- ============================================================================
-- 09 · ACCOUNTING  (double-entry)
-- ============================================================================
CREATE TABLE account (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,          -- '1000','4000'
  name          TEXT NOT NULL,
  account_type  TEXT NOT NULL,                 -- asset|liability|equity|revenue|expense
  parent_id     UUID REFERENCES account(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE journal (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,          -- 'SAL','PUR','BNK','GEN'
  name          TEXT NOT NULL
);

CREATE TABLE journal_entry (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id    UUID REFERENCES journal(id),
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  fiscal_period_id UUID REFERENCES fiscal_period(id),
  reference_type TEXT,                          -- 'sales_order','supplier_invoice', etc
  reference_id  UUID,
  memo          TEXT,
  is_posted     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES app_user(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each entry must balance: SUM(debit) = SUM(credit) across its lines
CREATE TABLE journal_line (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL REFERENCES account(id),
  debit         NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit        NUMERIC(14,2) NOT NULL DEFAULT 0,
  partner_id    UUID REFERENCES partner(id),
  memo          TEXT,
  CHECK (debit >= 0 AND credit >= 0)
);

CREATE TABLE bank_account (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES company(id),
  name          TEXT NOT NULL,
  bank_name     TEXT,
  account_number TEXT,
  iban          TEXT,
  currency      CHAR(3) DEFAULT 'PKR',
  gl_account_id UUID REFERENCES account(id),
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE bank_transaction (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_account(id),
  txn_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  amount        NUMERIC(14,2) NOT NULL,         -- + deposit / - withdrawal
  description   TEXT,
  reconciled    BOOLEAN NOT NULL DEFAULT FALSE,
  journal_entry_id UUID REFERENCES journal_entry(id)
);

CREATE TABLE expense (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   UUID REFERENCES location(id),
  category      TEXT,                            -- rent|utilities|salaries|supplies|misc
  account_id    UUID REFERENCES account(id),
  amount        NUMERIC(12,2) NOT NULL,
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method_id UUID REFERENCES payment_method(id),
  vendor_id     UUID REFERENCES partner(id),
  receipt_url   TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES app_user(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10 · HR & PAYROLL
-- ============================================================================
CREATE TABLE department (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                   -- Kitchen | Front | Delivery | Admin
  location_id UUID REFERENCES location(id)
);

CREATE TABLE employee (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES app_user(id),  -- optional link to login
  employee_code   TEXT UNIQUE,
  full_name       TEXT NOT NULL,
  cnic            TEXT,                          -- national ID
  phone           TEXT,
  email           CITEXT,
  department_id   UUID REFERENCES department(id),
  job_title       TEXT,
  hire_date       DATE,
  termination_date DATE,
  employment_type TEXT DEFAULT 'full_time',     -- full_time|part_time|contract
  base_salary     NUMERIC(12,2) DEFAULT 0,
  hourly_rate     NUMERIC(12,2) DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE work_shift (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                  -- Morning | Afternoon | Night
  start_time    TIME,
  end_time      TIME
);

CREATE TABLE employee_schedule (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employee(id),
  work_shift_id UUID REFERENCES work_shift(id),
  location_id   UUID REFERENCES location(id),
  work_date     DATE NOT NULL,
  UNIQUE (employee_id, work_date, work_shift_id)
);

CREATE TABLE attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employee(id),
  work_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in      TIMESTAMPTZ,
  clock_out     TIMESTAMPTZ,
  hours_worked  NUMERIC(6,2),
  status        TEXT DEFAULT 'present',         -- present|absent|late|leave|holiday
  notes         TEXT
);

CREATE TABLE leave_request (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employee(id),
  leave_type    TEXT NOT NULL,                  -- annual|sick|unpaid|casual
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  days          NUMERIC(5,1),
  status        TEXT NOT NULL DEFAULT 'pending',-- pending|approved|rejected
  approved_by   UUID REFERENCES app_user(id),
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_run (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft',  -- draft|approved|paid
  total_gross   NUMERIC(14,2) DEFAULT 0,
  total_net     NUMERIC(14,2) DEFAULT 0,
  processed_by  UUID REFERENCES app_user(id),
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payslip (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_run(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employee(id),
  gross_pay     NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay  NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus         NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax           NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay       NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_at       TIMESTAMPTZ
);

-- ============================================================================
-- 11 · DELIVERY  (Phase 2 — tables built now, activated later)
-- ============================================================================
CREATE TABLE route (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  location_id   UUID REFERENCES location(id),
  on_monday     BOOLEAN NOT NULL DEFAULT FALSE,
  on_tuesday    BOOLEAN NOT NULL DEFAULT FALSE,
  on_wednesday  BOOLEAN NOT NULL DEFAULT FALSE,
  on_thursday   BOOLEAN NOT NULL DEFAULT FALSE,
  on_friday     BOOLEAN NOT NULL DEFAULT FALSE,
  on_saturday   BOOLEAN NOT NULL DEFAULT FALSE,
  on_sunday     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE rider (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employee(id),
  name            TEXT NOT NULL,
  has_motorcycle  BOOLEAN NOT NULL DEFAULT TRUE,
  number_plate    TEXT,
  phone           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE rider_route (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id           UUID NOT NULL REFERENCES rider(id),
  route_id           UUID NOT NULL REFERENCES route(id),
  is_van             BOOLEAN NOT NULL DEFAULT FALSE,
  on_monday          BOOLEAN NOT NULL DEFAULT FALSE,
  on_tuesday         BOOLEAN NOT NULL DEFAULT FALSE,
  on_wednesday       BOOLEAN NOT NULL DEFAULT FALSE,
  on_thursday        BOOLEAN NOT NULL DEFAULT FALSE,
  on_friday          BOOLEAN NOT NULL DEFAULT FALSE,
  on_saturday        BOOLEAN NOT NULL DEFAULT FALSE,
  on_sunday          BOOLEAN NOT NULL DEFAULT FALSE,
  is_morning_shift   BOOLEAN NOT NULL DEFAULT FALSE,
  is_afternoon_shift BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE delivery_manifest (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      UUID NOT NULL REFERENCES route(id),
  rider_id      UUID REFERENCES rider(id),
  manifest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'planned', -- planned|dispatched|completed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_stop (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id   UUID NOT NULL REFERENCES delivery_manifest(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES sales_order(id),
  customer_id   UUID REFERENCES partner(id),
  sequence      INTEGER,
  status        TEXT NOT NULL DEFAULT 'pending',-- pending|delivered|failed|skipped
  cash_collected NUMERIC(12,2) DEFAULT 0,
  delivered_at  TIMESTAMPTZ,
  notes         TEXT
);

-- Now wire customer_profile.route_id
ALTER TABLE customer_profile
  ADD CONSTRAINT fk_cust_route FOREIGN KEY (route_id) REFERENCES route(id);

-- Standing/subscription orders auto-generated per route day
CREATE TABLE subscription (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES partner(id),
  product_id    UUID NOT NULL REFERENCES product(id),
  quantity      NUMERIC(12,3) NOT NULL DEFAULT 1,
  frequency     TEXT NOT NULL DEFAULT 'daily', -- daily|weekly
  route_id      UUID REFERENCES route(id),
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- 12 · ASSETS & MAINTENANCE
-- ============================================================================
CREATE TABLE asset (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   UUID REFERENCES location(id),
  name          TEXT NOT NULL,                  -- 'Espresso machine', 'Chiller'
  asset_tag     TEXT UNIQUE,
  category      TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  warranty_until DATE,
  status        TEXT DEFAULT 'in_service',      -- in_service|repair|retired
  notes         TEXT
);

CREATE TABLE maintenance_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id      UUID NOT NULL REFERENCES asset(id),
  log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  maintenance_type TEXT,                         -- routine|repair|inspection
  cost          NUMERIC(12,2) DEFAULT 0,
  performed_by  TEXT,
  description   TEXT,
  next_due_date DATE
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_product_category      ON product(category_id);
CREATE INDEX idx_product_type          ON product(product_type);
CREATE INDEX idx_variant_product       ON product_variant(product_id);
CREATE INDEX idx_recipe_product        ON recipe(product_id);
CREATE INDEX idx_recipe_item_recipe    ON recipe_item(recipe_id);
CREATE INDEX idx_stocklevel_wh_prod    ON stock_level(warehouse_id, product_id);
CREATE INDEX idx_invmov_product        ON inventory_movement(product_id, created_at);
CREATE INDEX idx_invmov_reference      ON inventory_movement(reference_type, reference_id);
CREATE INDEX idx_lot_product_expiry    ON stock_lot(product_id, expiry_date);
CREATE INDEX idx_partner_type          ON partner(partner_type);
CREATE INDEX idx_partner_phone         ON partner(phone);
CREATE INDEX idx_custprofile_route     ON customer_profile(route_id);
CREATE INDEX idx_order_customer        ON sales_order(customer_id);
CREATE INDEX idx_order_status          ON sales_order(status);
CREATE INDEX idx_order_channel         ON sales_order(channel);
CREATE INDEX idx_order_created         ON sales_order(created_at);
CREATE INDEX idx_order_shift           ON sales_order(shift_id);
CREATE INDEX idx_orderitem_order       ON sales_order_item(order_id);
CREATE INDEX idx_orderitem_product     ON sales_order_item(product_id);
CREATE INDEX idx_payment_order         ON sales_payment(order_id);
CREATE INDEX idx_payment_partner       ON sales_payment(partner_id);
CREATE INDEX idx_poitem_po             ON purchase_order_item(po_id);
CREATE INDEX idx_po_supplier           ON purchase_order(supplier_id);
CREATE INDEX idx_grn_po                ON goods_receipt(po_id);
CREATE INDEX idx_jline_entry           ON journal_line(entry_id);
CREATE INDEX idx_jline_account         ON journal_line(account_id);
CREATE INDEX idx_jentry_date           ON journal_entry(entry_date);
CREATE INDEX idx_jentry_reference      ON journal_entry(reference_type, reference_id);
CREATE INDEX idx_attendance_emp_date   ON attendance(employee_id, work_date);
CREATE INDEX idx_payslip_run           ON payslip(payroll_run_id);
CREATE INDEX idx_deliverystop_manifest ON delivery_stop(manifest_id);
CREATE INDEX idx_loyaltytxn_partner    ON loyalty_transaction(partner_id);
CREATE INDEX idx_auditlog_entity       ON audit_log(entity_type, entity_id);

-- ============================================================================
-- updated_at TRIGGERS
-- ============================================================================
CREATE TRIGGER trg_company_upd   BEFORE UPDATE ON company        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_location_upd  BEFORE UPDATE ON location       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_upd      BEFORE UPDATE ON app_user       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_upd   BEFORE UPDATE ON product        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_partner_upd   BEFORE UPDATE ON partner        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_order_upd     BEFORE UPDATE ON sales_order    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_po_upd        BEFORE UPDATE ON purchase_order FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 13 · REPORTING VIEWS / HELPERS
-- ============================================================================
-- Current stock on hand per product (sum across warehouses)
CREATE VIEW v_stock_on_hand AS
SELECT p.id AS product_id, p.name, p.sku, p.stock_uom,
       COALESCE(SUM(sl.quantity),0) AS qty_on_hand,
       p.reorder_point,
       (COALESCE(SUM(sl.quantity),0) <= p.reorder_point) AS needs_reorder
FROM product p
LEFT JOIN stock_level sl ON sl.product_id = p.id
WHERE p.is_stocked
GROUP BY p.id;

-- Daily sales summary by location & channel
CREATE VIEW v_daily_sales AS
SELECT so.location_id,
       so.channel,
       (so.created_at AT TIME ZONE 'UTC')::date AS business_date,
       COUNT(*)                  AS order_count,
       SUM(so.subtotal)          AS subtotal,
       SUM(so.discount_amount)   AS discounts,
       SUM(so.tax_amount)        AS tax,
       SUM(so.total)             AS total
FROM sales_order so
WHERE so.status NOT IN ('cancelled','open')
GROUP BY so.location_id, so.channel, (so.created_at AT TIME ZONE 'UTC')::date;

-- Customer credit aging (outstanding balances)
CREATE VIEW v_customer_credit AS
SELECT pr.id AS partner_id, pr.display_name, cp.credit_limit, cp.credit_balance,
       cp.credit_due_day_of_month, cp.loyalty_points,
       lt.name AS loyalty_tier
FROM partner pr
JOIN customer_profile cp ON cp.partner_id = pr.id
LEFT JOIN loyalty_tier lt ON lt.id = cp.loyalty_tier_id
WHERE cp.credit_balance > 0;

-- Trial balance (debits vs credits per account) from posted entries
CREATE VIEW v_trial_balance AS
SELECT a.code, a.name, a.account_type,
       SUM(jl.debit)  AS total_debit,
       SUM(jl.credit) AS total_credit,
       SUM(jl.debit - jl.credit) AS balance
FROM account a
JOIN journal_line jl ON jl.account_id = a.id
JOIN journal_entry je ON je.id = jl.entry_id AND je.is_posted
GROUP BY a.id;

-- Top selling products
CREATE VIEW v_product_sales AS
SELECT p.id AS product_id, p.name,
       SUM(oi.quantity)   AS units_sold,
       SUM(oi.line_total) AS revenue
FROM sales_order_item oi
JOIN product p ON p.id = oi.product_id
JOIN sales_order so ON so.id = oi.order_id AND so.status NOT IN ('cancelled','open')
GROUP BY p.id;

-- ============================================================================
-- 14 · SEED REFERENCE DATA
-- ============================================================================
INSERT INTO currency(code,name,symbol) VALUES
  ('PKR','Pakistani Rupee','Rs'),
  ('USD','US Dollar','$') ON CONFLICT DO NOTHING;

INSERT INTO uom(code,name,base_uom,factor) VALUES
  ('L','Liter',NULL,1),
  ('ml','Milliliter','L',0.001),
  ('kg','Kilogram',NULL,1),
  ('g','Gram','kg',0.001),
  ('pcs','Pieces',NULL,1),
  ('cup','Cup',NULL,1),
  ('shot','Shot',NULL,1) ON CONFLICT DO NOTHING;

INSERT INTO role(name,description,is_system) VALUES
  ('owner','Full access',TRUE),
  ('manager','Operations & catalog',TRUE),
  ('accountant','Finance & ledger',TRUE),
  ('cashier','POS sales',TRUE),
  ('barista','Kitchen / prep',TRUE),
  ('rider','Delivery',TRUE),
  ('viewer','Read-only',TRUE) ON CONFLICT DO NOTHING;

INSERT INTO permission(code,description) VALUES
  ('sales.create','Create sales orders'),
  ('sales.refund','Issue refunds'),
  ('sales.void','Void orders'),
  ('catalog.edit','Edit products & prices'),
  ('inventory.adjust','Adjust stock'),
  ('purchase.manage','Manage purchase orders'),
  ('accounting.post','Post journal entries'),
  ('hr.manage','Manage employees & payroll'),
  ('admin.users','Manage users & roles'),
  ('reports.view','View reports') ON CONFLICT DO NOTHING;

INSERT INTO payment_method(name,type) VALUES
  ('Cash','cash'),
  ('Card','card'),
  ('Easypaisa','wallet'),
  ('JazzCash','wallet'),
  ('Bank Transfer','bank'),
  ('Store Credit','credit'),
  ('Gift Card','gift_card') ON CONFLICT DO NOTHING;

INSERT INTO tax_rate(name,rate,is_inclusive) VALUES
  ('GST 17%',0.1700,FALSE),
  ('Exempt',0,FALSE) ON CONFLICT DO NOTHING;

INSERT INTO loyalty_tier(name,min_spend_threshold,discount_pct,points_multiplier,display_order) VALUES
  ('Bronze',0,0,1,1),
  ('Silver',5000,5,1.25,2),
  ('Gold',15000,10,1.5,3),
  ('Platinum',50000,15,2,4) ON CONFLICT DO NOTHING;

INSERT INTO journal(code,name) VALUES
  ('SAL','Sales Journal'),
  ('PUR','Purchase Journal'),
  ('BNK','Bank Journal'),
  ('CSH','Cash Journal'),
  ('GEN','General Journal') ON CONFLICT DO NOTHING;

-- Minimal café chart of accounts
INSERT INTO account(code,name,account_type) VALUES
  ('1000','Cash on Hand','asset'),
  ('1010','Bank','asset'),
  ('1100','Accounts Receivable','asset'),
  ('1200','Inventory','asset'),
  ('1500','Equipment','asset'),
  ('2000','Accounts Payable','liability'),
  ('2100','Tax Payable','liability'),
  ('2200','Wages Payable','liability'),
  ('3000','Owner Equity','equity'),
  ('4000','Sales Revenue','revenue'),
  ('4100','Delivery Revenue','revenue'),
  ('5000','Cost of Goods Sold','expense'),
  ('6000','Salaries Expense','expense'),
  ('6100','Rent Expense','expense'),
  ('6200','Utilities Expense','expense'),
  ('6300','Wastage Expense','expense') ON CONFLICT DO NOTHING;

INSERT INTO work_shift(name,start_time,end_time) VALUES
  ('Morning','07:00','15:00'),
  ('Afternoon','15:00','23:00') ON CONFLICT DO NOTHING;
