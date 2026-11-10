
-- S2-DBA-01: Customer and Product active views and indexes

-- 1. Add soft-delete columns
ALTER TABLE public.customer
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.product
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;


-- 2. Create views for active customers and products
CREATE OR REPLACE VIEW public.vw_active_customers
WITH (security_invoker = true)
AS
SELECT *
FROM public.customer
WHERE is_deleted = FALSE;

CREATE OR REPLACE VIEW public.vw_active_products
WITH (security_invoker = true)
AS
SELECT *
FROM public.product
WHERE is_deleted = FALSE;


-- 3. Create partial indexes for active customer searches
CREATE INDEX IF NOT EXISTS idx_customer_active_custname
ON public.customer (custname)
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_customer_active_payterm
ON public.customer (payterm)
WHERE is_deleted = FALSE;


-- 4. Create partial indexes for active product searches
CREATE INDEX IF NOT EXISTS idx_product_active_description
ON public.product (description)
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_product_active_unit
ON public.product (unit)
WHERE is_deleted = FALSE;