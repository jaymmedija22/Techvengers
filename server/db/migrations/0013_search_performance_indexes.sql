
-- =========================================================
-- S2-DBA-06: Search Performance Check and Index Tuning
-- Optimize substring searches using PostgreSQL trigram indexes
-- =========================================================

-- 1. Enable PostgreSQL trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Customer search indexes
-- Customer search supports both active and deleted records.

CREATE INDEX IF NOT EXISTS idx_customer_custno_trgm
ON public.customer
USING GIN (custno gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customer_custname_trgm
ON public.customer
USING GIN ((COALESCE(custname, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customer_address_trgm
ON public.customer
USING GIN ((COALESCE(address, '')) gin_trgm_ops);

-- 3. Product search indexes
-- Product searches only active products through vw_active_products.

CREATE INDEX IF NOT EXISTS idx_product_active_prodcode_trgm
ON public.product
USING GIN (prodcode gin_trgm_ops)
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_product_active_description_trgm
ON public.product
USING GIN ((COALESCE(description, '')) gin_trgm_ops)
WHERE is_deleted = FALSE;
