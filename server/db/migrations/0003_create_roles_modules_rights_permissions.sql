
-- =========================================================
-- S1-DBA-03: Roles, Modules, Rights and User Permissions
-- Database: PostgreSQL / Supabase
-- =========================================================

-- 1. ROLE CATALOGUE
CREATE TABLE role (
    role_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO role (role_name)
VALUES
    ('Superadmin'),
    ('Admin'),
    ('User');


-- 2. RENAME EXISTING USERS TABLE
-- This preserves all existing user records.

ALTER TABLE users RENAME TO app_user;

-- Add the role foreign key column.
ALTER TABLE app_user
ADD COLUMN role_id INTEGER;

-- Connect existing users to their matching role.
UPDATE app_user AS u
SET role_id = r.role_id
FROM role AS r
WHERE LOWER(TRIM(u.role)) = LOWER(r.role_name);

-- Require every account to have a valid role.
ALTER TABLE app_user
ALTER COLUMN role_id SET NOT NULL;

ALTER TABLE app_user
ADD CONSTRAINT fk_app_user_role
FOREIGN KEY (role_id) REFERENCES role(role_id);

-- The role catalogue now stores the role.
ALTER TABLE app_user
DROP COLUMN role;


-- 3. MODULE CATALOGUE
CREATE TABLE module (
    module_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_code VARCHAR(50) NOT NULL UNIQUE,
    module_name VARCHAR(100) NOT NULL
);

INSERT INTO module (module_code, module_name)
VALUES
    ('customers', 'Customer Management'),
    ('products', 'Product Management'),
    ('hr', 'Human Resources'),
    ('sales', 'Sales Management'),
    ('reports', 'Reports');


-- 4. RIGHTS CATALOGUE
CREATE TABLE rights (
    right_code VARCHAR(100) PRIMARY KEY,
    module_id INTEGER NOT NULL,
    description VARCHAR(150) NOT NULL,

    CONSTRAINT fk_rights_module
        FOREIGN KEY (module_id)
        REFERENCES module(module_id)
);


-- CUSTOMER MANAGEMENT: 3 RIGHTS
INSERT INTO rights (right_code, module_id, description)
SELECT v.right_code, m.module_id, v.description
FROM (VALUES
    ('customers.add', 'Add Customer'),
    ('customers.edit', 'Edit Customer'),
    ('customers.delete', 'Delete Customer')
) AS v(right_code, description)
JOIN module m ON m.module_code = 'customers';


-- PRODUCT MANAGEMENT: 6 RIGHTS
INSERT INTO rights (right_code, module_id, description)
SELECT v.right_code, m.module_id, v.description
FROM (VALUES
    ('products.add', 'Add Product'),
    ('products.edit', 'Edit Product'),
    ('products.delete', 'Delete Product'),
    ('prices.add', 'Add Price'),
    ('prices.edit', 'Edit Price'),
    ('prices.delete', 'Delete Price')
) AS v(right_code, description)
JOIN module m ON m.module_code = 'products';


-- HUMAN RESOURCES: 13 RIGHTS
INSERT INTO rights (right_code, module_id, description)
SELECT v.right_code, m.module_id, v.description
FROM (VALUES
    ('jobs.add', 'Add Job'),
    ('jobs.edit', 'Edit Job'),
    ('jobs.delete', 'Delete Job'),
    ('departments.add', 'Add Department'),
    ('departments.edit', 'Edit Department'),
    ('departments.delete', 'Delete Department'),
    ('employees.add', 'Add Employee'),
    ('employees.edit', 'Edit Employee'),
    ('employees.delete', 'Delete Employee'),
    ('job_history.view', 'View Job History'),
    ('job_history.add', 'Add Job History'),
    ('job_history.edit', 'Edit Job History'),
    ('job_history.delete', 'Delete Job History')
) AS v(right_code, description)
JOIN module m ON m.module_code = 'hr';


-- SALES: 7 RIGHTS
INSERT INTO rights (right_code, module_id, description)
SELECT v.right_code, m.module_id, v.description
FROM (VALUES
    ('sales.add', 'Add Sale'),
    ('sales.edit', 'Edit Sale'),
    ('sales.delete', 'Delete Sale'),
    ('sale_details.view', 'View Sale Detail'),
    ('sale_details.add', 'Add Sale Detail'),
    ('sale_details.edit', 'Edit Sale Detail'),
    ('sale_details.delete', 'Delete Sale Detail')
) AS v(right_code, description)
JOIN module m ON m.module_code = 'sales';


-- REPORTS: 7 RIGHTS
INSERT INTO rights (right_code, module_id, description)
SELECT v.right_code, m.module_id, v.description
FROM (VALUES
    ('reports.top_customers', 'Top Customers'),
    ('reports.product_master_list', 'Product Master List'),
    ('reports.top_products', 'Top Products'),
    ('reports.active_employees', 'Active Employees'),
    ('reports.all_employees', 'All Employees'),
    ('reports.employee_job_history', 'Employee Job History'),
    ('reports.top_sales', 'Top Sales')
) AS v(right_code, description)
JOIN module m ON m.module_code = 'reports';


-- 5. USER PERMISSION ASSIGNMENTS
CREATE TABLE user_permission (
    user_permission_id INTEGER
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id INTEGER NOT NULL,
    right_code VARCHAR(100) NOT NULL,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_user_permission_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(userid),

    CONSTRAINT fk_user_permission_right
        FOREIGN KEY (right_code)
        REFERENCES rights(right_code),

    CONSTRAINT chk_user_permission_deleted_at
        CHECK (
            (is_deleted = FALSE AND deleted_at IS NULL)
            OR
            (is_deleted = TRUE AND deleted_at IS NOT NULL)
        )
);

-- Prevent duplicate active assignments while allowing
-- a previously deleted permission to be assigned again.
CREATE UNIQUE INDEX uq_user_permission_active
ON user_permission(user_id, right_code)
WHERE is_deleted = FALSE;
