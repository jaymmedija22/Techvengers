-- S3-DBA-04: Verify employee, department, and job delete restrictions.
-- Run after migration 0018_employee_department_job_delete_restrictions.sql.
--
-- Relationship review:
--   employee <- jobhistory.empno, sales.empno, app_user.empno
--   department <- jobhistory.deptcode
--   job <- jobhistory.jobcode
-- Employee has sepDate (employment separation), not a soft-delete flag.
-- No employee or job soft-delete/restore endpoint or column exists in this
-- schema. These records use physical deletion; callers should translate
-- SQLSTATE 23503 into a conflict response. Referenced records must be
-- retained; unreferenced records can be physically deleted.
--
-- Review all validated foreign keys and delete actions. Every listed FK must
-- show RESTRICT (or the existing app_user employee FK).
SELECT
    child.relname AS child_table,
    parent.relname AS parent_table,
    constraint_row.conname AS constraint_name,
    pg_get_constraintdef(constraint_row.oid) AS definition,
    constraint_row.convalidated AS is_validated
FROM pg_constraint AS constraint_row
JOIN pg_class AS child
    ON child.oid = constraint_row.conrelid
JOIN pg_namespace AS child_schema
    ON child_schema.oid = child.relnamespace
JOIN pg_class AS parent
    ON parent.oid = constraint_row.confrelid
WHERE constraint_row.contype = 'f'
  AND child_schema.nspname = 'public'
  AND parent.relname IN ('employee', 'department', 'job')
ORDER BY parent.relname, child.relname, constraint_row.conname;

-- Current dependent record counts. A zero count means the parent is eligible
-- for deletion under these relationships; nonzero counts must block deletion.
SELECT
    (SELECT COUNT(*) FROM public.jobhistory WHERE empno = employee.empno)
        AS job_history_count,
    (SELECT COUNT(*) FROM public.sales WHERE empno = employee.empno)
        AS sales_count,
    (SELECT COUNT(*) FROM public.app_user WHERE empno = employee.empno)
        AS app_user_count
FROM public.employee AS employee
ORDER BY employee.empno;

SELECT
    department.deptcode,
    COUNT(jobhistory.deptcode) AS job_history_count
FROM public.department AS department
LEFT JOIN public.jobhistory AS jobhistory
    ON jobhistory.deptcode = department.deptcode
GROUP BY department.deptcode
ORDER BY department.deptcode;

SELECT
    job.jobcode,
    COUNT(jobhistory.jobcode) AS job_history_count
FROM public.job AS job
LEFT JOIN public.jobhistory AS jobhistory
    ON jobhistory.jobcode = job.jobcode
GROUP BY job.jobcode
ORDER BY job.jobcode;

-- Functional check using temporary records. The DO block raises an error if
-- any referenced deletion succeeds or if any unreferenced deletion fails.
-- Everything is rolled back, so no test data remains.
BEGIN;

INSERT INTO public.employee (empno, lastname, firstname)
VALUES
    ('ZZ998', 'Check', 'History'),
    ('ZZ996', 'Check', 'Sale'),
    ('ZZ995', 'Check', 'Account');

INSERT INTO public.department (deptcode, deptname)
VALUES ('ZQ9', 'Delete Check');

INSERT INTO public.job (jobcode, jobdesc)
VALUES ('ZQ99', 'Delete Check');

INSERT INTO public.jobhistory (empno, jobcode, effdate, salary, deptcode)
VALUES ('ZZ998', 'ZQ99', DATE '2099-01-01', 0, 'ZQ9');

INSERT INTO public.sales (transno, empno)
VALUES ('ZZTEST01', 'ZZ996');

INSERT INTO public.app_user (firstname, lastname, email, role_id, empno)
SELECT 'Delete', 'Check',
       'delete-check-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 16)
           || '@example.invalid',
       role_id,
       'ZZ995'
FROM public.role
ORDER BY role_id
LIMIT 1;

DO $$
DECLARE
    actual_constraint TEXT;
BEGIN
    BEGIN
        DELETE FROM public.employee WHERE empno = 'ZZ998';
        RAISE EXCEPTION 'Expected job-history employee delete to be blocked.'
            USING ERRCODE = 'P0001';
    EXCEPTION
        WHEN foreign_key_violation THEN
            GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
            IF actual_constraint <> 'fk_jobhistory_employee_delete_restrict' THEN
                RAISE EXCEPTION 'Unexpected job-history employee constraint: %',
                    actual_constraint;
            END IF;
    END;

    BEGIN
        DELETE FROM public.employee WHERE empno = 'ZZ996';
        RAISE EXCEPTION 'Expected sales employee delete to be blocked.'
            USING ERRCODE = 'P0001';
    EXCEPTION
        WHEN foreign_key_violation THEN
            GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
            IF actual_constraint <> 'fk_sales_employee_delete_restrict' THEN
                RAISE EXCEPTION 'Unexpected sales employee constraint: %',
                    actual_constraint;
            END IF;
    END;

    BEGIN
        DELETE FROM public.employee WHERE empno = 'ZZ995';
        RAISE EXCEPTION 'Expected account-linked employee delete to be blocked.'
            USING ERRCODE = 'P0001';
    EXCEPTION
        WHEN foreign_key_violation THEN
            GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
            IF actual_constraint <> 'fk_app_user_employee' THEN
                RAISE EXCEPTION 'Unexpected account employee constraint: %',
                    actual_constraint;
            END IF;
    END;

    BEGIN
        DELETE FROM public.department WHERE deptcode = 'ZQ9';
        RAISE EXCEPTION 'Expected department delete to be blocked.'
            USING ERRCODE = 'P0001';
    EXCEPTION
        WHEN foreign_key_violation THEN
            GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
            IF actual_constraint <> 'fk_jobhistory_department_delete_restrict' THEN
                RAISE EXCEPTION 'Unexpected department delete constraint: %',
                    actual_constraint;
            END IF;
    END;

    BEGIN
        DELETE FROM public.job WHERE jobcode = 'ZQ99';
        RAISE EXCEPTION 'Expected job delete to be blocked.'
            USING ERRCODE = 'P0001';
    EXCEPTION
        WHEN foreign_key_violation THEN
            GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
            IF actual_constraint <> 'fk_jobhistory_job_delete_restrict' THEN
                RAISE EXCEPTION 'Unexpected job delete constraint: %',
                    actual_constraint;
            END IF;
    END;

    IF NOT EXISTS (SELECT 1 FROM public.employee WHERE empno = 'ZZ998')
       OR NOT EXISTS (SELECT 1 FROM public.employee WHERE empno = 'ZZ996')
       OR NOT EXISTS (SELECT 1 FROM public.employee WHERE empno = 'ZZ995')
       OR NOT EXISTS (SELECT 1 FROM public.department WHERE deptcode = 'ZQ9')
       OR NOT EXISTS (SELECT 1 FROM public.job WHERE jobcode = 'ZQ99') THEN
        RAISE EXCEPTION 'A referenced parent row was unexpectedly deleted.';
    END IF;
END;
$$;

INSERT INTO public.employee (empno, lastname, firstname)
VALUES ('ZZ997', 'Check', 'Unreferenced');

INSERT INTO public.department (deptcode, deptname)
VALUES ('ZQ8', 'Unused Check');

INSERT INTO public.job (jobcode, jobdesc)
VALUES ('ZQ98', 'Unused Check');

DELETE FROM public.employee WHERE empno = 'ZZ997';
DELETE FROM public.department WHERE deptcode = 'ZQ8';
DELETE FROM public.job WHERE jobcode = 'ZQ98';

ROLLBACK;

-- Expected functional results: each employee child FK, plus department and
-- job history FKs, blocks its referenced parent with SQLSTATE 23503.
-- Unreferenced test rows delete successfully; the final ROLLBACK leaves no
-- test records.
