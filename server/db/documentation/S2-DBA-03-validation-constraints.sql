
-- S2-DBA-03: Validation Constraints
-- Purpose: Document and verify existing validation constraints
-- No database schema changes are required for this task.

-- 1. Customer payment term validation
-- Constraint: pay_ck
-- Table: public.customer
-- Allowed values: COD, 30D, 45D

-- 2. Product unit validation
-- Constraint: unit_ck
-- Table: public.product
-- Allowed values: pc, ea, mtr, pkg, ltr

-- 3. Verify the existing CHECK constraints
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid IN (
    'public.customer'::regclass,
    'public.product'::regclass
)
AND conname IN ('pay_ck', 'unit_ck')
ORDER BY table_name, conname;

-- 4. Validation test results
-- pay_ck: Rejected invalid value 'XYZ' with error 23514.
-- unit_ck: Rejected invalid value 'xyz' with error 23514.
--
-- Both constraints are already implemented and working.
