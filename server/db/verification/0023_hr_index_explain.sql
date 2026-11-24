\timing on

-- Capture this plan before and after applying migration 0023.
EXPLAIN (ANALYZE, BUFFERS)
SELECT employee.empno
FROM public.employee AS employee
LEFT JOIN public.vw_employee_current_job_department AS assignment
    ON assignment.empno = employee.empno
WHERE employee.empno ILIKE '%xyz%'
   OR COALESCE(employee.firstname, '') ILIKE '%xyz%'
   OR COALESCE(employee.lastname, '') ILIKE '%xyz%'
   OR BTRIM(
       COALESCE(employee.firstname, '') || ' ' || COALESCE(employee.lastname, '')
   ) ILIKE '%xyz%'
   OR COALESCE(assignment.jobcode, '') ILIKE '%xyz%'
   OR COALESCE(assignment.jobdesc, '') ILIKE '%xyz%'
   OR COALESCE(assignment.deptcode, '') ILIKE '%xyz%'
   OR COALESCE(assignment.deptname, '') ILIKE '%xyz%';

-- Primary-key and existing job-history indexes serve profile joins/timelines.
EXPLAIN (ANALYZE, BUFFERS)
SELECT empno, jobcode, deptcode, effdate
FROM public.jobhistory
WHERE empno = (SELECT MIN(empno) FROM public.employee)
ORDER BY effdate;

EXPLAIN (ANALYZE, BUFFERS)
SELECT empno
FROM public.employee
WHERE empno = (SELECT MIN(empno) FROM public.employee);

SELECT
    table_name,
    index_name,
    index_definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('employee', 'department', 'job', 'jobhistory')
ORDER BY table_name, index_name;
