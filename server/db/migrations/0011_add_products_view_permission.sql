-- =========================================================
-- S2-DEV-04: Add permission to view the product list
-- =========================================================

INSERT INTO rights (right_code, module_id, description)
SELECT
    'products.view',
    module_id,
    'View Products'
FROM module
WHERE module_code = 'products'
ON CONFLICT (right_code) DO NOTHING;
