
-- =====================================================
-- S2-DBA-05
-- DEMO DATA: CUSTOMER, PRODUCT, PRICE HISTORY
-- HOPE ERP - TECHVENGERS
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CUSTOMER DEMO DATA (10 RECORDS)
-- =====================================================

INSERT INTO customer (custno, custname, address, payterm)
VALUES
('D9001', 'Demo Alpha', '100 Demo Street, Quezon City', 'COD'),
('D9002', 'Demo Bravo', '200 Sample Avenue, Manila', '30D'),
('D9003', 'Demo Charlie', '300 Test Road, Pasig City', '45D'),
('D9004', 'Demo Delta', '400 Sample Street, Makati City', 'COD'),
('D9005', 'Demo Echo', '500 Demo Avenue, Marikina City', '30D'),
('D9006', 'Demo Foxtrot', '600 Test Boulevard, Taguig City', '45D'),
('D9007', 'Demo Golf', '700 Sample Road, Quezon City', 'COD'),
('D9008', 'Demo Hotel', '800 Demo Street, Manila', '30D'),
('D9009', 'Demo India', '900 Test Avenue, Pasig City', '45D'),
('D9010', 'Demo Juliet', '1000 Sample Boulevard, Makati City', 'COD')
ON CONFLICT (custno) DO NOTHING;


-- =====================================================
-- 2. PRODUCT DEMO DATA (12 RECORDS)
-- =====================================================

INSERT INTO product (prodcode, description, unit)
VALUES
('D90001', 'Demo Wireless Mouse', 'pc'),
('D90002', 'Demo Mechanical Keyboard', 'pc'),
('D90003', 'Demo USB Flash Drive 64GB', 'ea'),
('D90004', 'Demo External Hard Drive 1TB', 'ea'),
('D90005', 'Demo HDMI Cable 2M', 'mtr'),
('D90006', 'Demo Ethernet Cable', 'mtr'),
('D90007', 'Demo Printer Paper', 'pkg'),
('D90008', 'Demo Bond Paper A4', 'pkg'),
('D90009', 'Demo Cleaning Solution', 'ltr'),
('D90010', 'Demo Ink Refill', 'ltr'),
('D90011', 'Demo Computer Monitor', 'ea'),
('D90012', 'Demo Laptop Stand', 'pc')
ON CONFLICT (prodcode) DO NOTHING;


-- =====================================================
-- 3. PRICE HISTORY DEMO DATA (24 RECORDS)
-- TWO PRICE RECORDS PER PRODUCT
-- =====================================================

INSERT INTO pricehist (effdate, prodcode, unitprice)
VALUES
-- D90001
('2025-01-01', 'D90001', 450.00),
('2026-01-01', 'D90001', 475.00),

-- D90002
('2025-01-01', 'D90002', 1200.00),
('2026-01-01', 'D90002', 1350.00),

-- D90003
('2025-01-01', 'D90003', 250.00),
('2026-01-01', 'D90003', 275.00),

-- D90004
('2025-01-01', 'D90004', 2800.00),
('2026-01-01', 'D90004', 2950.00),

-- D90005
('2025-01-01', 'D90005', 80.00),
('2026-01-01', 'D90005', 95.00),

-- D90006
('2025-01-01', 'D90006', 35.00),
('2026-01-01', 'D90006', 40.00),

-- D90007
('2025-01-01', 'D90007', 180.00),
('2026-01-01', 'D90007', 195.00),

-- D90008
('2025-01-01', 'D90008', 220.00),
('2026-01-01', 'D90008', 235.00),

-- D90009
('2025-01-01', 'D90009', 150.00),
('2026-01-01', 'D90009', 165.00),

-- D90010
('2025-01-01', 'D90010', 320.00),
('2026-01-01', 'D90010', 350.00),

-- D90011
('2025-01-01', 'D90011', 5500.00),
('2026-01-01', 'D90011', 5800.00),

-- D90012
('2025-01-01', 'D90012', 650.00),
('2026-01-01', 'D90012', 700.00)

ON CONFLICT (effdate, prodcode) DO NOTHING;

COMMIT;


-- =====================================================
-- 4. VALIDATION
-- =====================================================

SELECT
    (SELECT COUNT(*) FROM customer
     WHERE custno BETWEEN 'D9001' AND 'D9010')
        AS demo_customers,

    (SELECT COUNT(*) FROM product
     WHERE prodcode BETWEEN 'D90001' AND 'D90012')
        AS demo_products,

    (SELECT COUNT(*) FROM pricehist
     WHERE prodcode BETWEEN 'D90001' AND 'D90012')
        AS demo_price_history;
