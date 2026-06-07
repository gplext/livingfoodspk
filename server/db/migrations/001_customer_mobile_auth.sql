-- Migration: Customer Mobile Auth
-- Run once against your cafe_erp database:
--   psql -U postgres -d cafe_erp -f server/db/migrations/001_customer_mobile_auth.sql

CREATE TABLE IF NOT EXISTS customer_mobile_auth (
  partner_id    UUID PRIMARY KEY REFERENCES partner(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
