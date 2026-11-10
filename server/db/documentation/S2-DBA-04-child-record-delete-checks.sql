-- S2-DBA-04: Verify child-record delete checks
-- Purpose: Confirm customer and product records cannot be
-- physically deleted while referenced by child records.
--
-- Existing foreign keys are defined in:
-- server/db/migrations/0001_hope_base_tables.sql
--
-- No schema changes are required.

-- 1. Customer foreign key
-- sales.custNo references customer.custNo.
-- Default PostgreSQL delete behavior: NO ACTION.

-- 2. Product foreign keys
-- priceHist.prodCode references product.prodCode.
-- salesDetail.prodCode references product.prodCode.
-- Default PostgreSQL delete behavior: NO ACTION.

-- 3. Verification queries

-- Confirm customers with existing sales records.
SELECT
    c.custno,
    c.custname,
    COUNT(s.custno) AS sales_count
FROM public.customer c
JOIN public.sales s ON s.custno = c.custno
GROUP BY c.custno, c.custname
ORDER BY sales_count DESC
LIMIT 5;

-- Confirm products with existing child records.
SELECT
    p.prodcode,
    p.description,
    EXISTS (
        SELECT 1
        FROM public.pricehist ph
        WHERE ph.prodcode = p.prodcode
    ) AS has_price_history,
    EXISTS (
        SELECT 1
        FROM public.salesdetail sd
        WHERE sd.prodcode = p.prodcode
    ) AS has_sales_details
FROM public.product p
WHERE p.prodcode = 'AD0001';

-- 4. Verified foreign-key definitions
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname IN (
    'sales_custno_fkey',
    'pricehist_prodcode_fkey',
    'salesdetail_prodcode_fkey'
)
ORDER BY conname;

-- Expected:
-- sales_custno_fkey: FOREIGN KEY (custno) REFERENCES customer(custno)
-- pricehist_prodcode_fkey: FOREIGN KEY (prodcode) REFERENCES product(prodcode)
-- salesdetail_prodcode_fkey: FOREIGN KEY (prodcode) REFERENCES product(prodcode)
--
-- All three use the default NO ACTION delete behavior.
-- Existing referenced parent records are protected from deletion.