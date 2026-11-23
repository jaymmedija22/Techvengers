-- S3-DBA-03: Verify app_user to employee relationship
-- Apply migration 0016_app_user_employee_relationship.sql before running.

-- 1. Review linked and unassigned accounts. Unassigned accounts are permitted.
SELECT
    COUNT(*) AS total_accounts,
    COUNT(empno) AS accounts_with_employee,
    COUNT(*) FILTER (WHERE empno IS NULL) AS accounts_without_employee
FROM public.app_user;

-- 2. Confirm there are no unmatched employee references.
-- This query must return no rows.
SELECT
    app.userid,
    app.empno
FROM public.app_user AS app
LEFT JOIN public.employee AS employee
    ON employee.empno = app.empno
WHERE app.empno IS NOT NULL
  AND employee.empno IS NULL;

-- 3. Confirm the foreign key exists and has been validated.
SELECT
    constraint_name.conname AS constraint_name,
    pg_get_constraintdef(constraint_name.oid) AS constraint_definition,
    constraint_name.convalidated AS is_validated
FROM pg_constraint AS constraint_name
WHERE constraint_name.conrelid = 'public.app_user'::regclass
  AND constraint_name.conname = 'fk_app_user_employee';
