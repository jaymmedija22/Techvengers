-- =========================================================
-- S2-DEV-01: Add permission to view the customer list
-- =========================================================

INSERT INTO rights (right_code, module_id, description)
SELECT
    'customers.view',
    module_id,
    'View Customers'
FROM module
WHERE module_code = 'customers'
ON CONFLICT (right_code) DO NOTHING;