-- S3-DBA-05: Reusable HR demo data for department, job, employee,
-- and job history modules.
-- Demo identifiers use D90-D93, D901-D908, and D9001-D9008.

BEGIN;

INSERT INTO public.department (deptcode, deptname)
VALUES
    ('D90', 'People Operations'),
    ('D91', 'Technology Ops'),
    ('D92', 'Retail South'),
    ('D93', 'Retail North')
ON CONFLICT (deptcode) DO NOTHING;

INSERT INTO public.job (jobcode, jobdesc)
VALUES
    ('D901', 'HR Assistant'),
    ('D902', 'HR Specialist'),
    ('D903', 'Recruiter'),
    ('D904', 'Developer'),
    ('D905', 'Senior Developer'),
    ('D906', 'Sales Representative'),
    ('D907', 'Sales Lead'),
    ('D908', 'Systems Analyst')
ON CONFLICT (jobcode) DO NOTHING;

INSERT INTO public.employee
    (empno, lastname, firstname, gender, birthdate, hiredate, sepdate)
VALUES
    ('D9001', 'Brooks', 'Elena', 'F', '1989-04-12', '2022-01-10', NULL),
    ('D9002', 'Chen', 'Marcus', 'M', '1991-08-23', '2023-03-15', NULL),
    ('D9003', 'Patel', 'Priya', 'F', '1990-02-08', '2022-09-05', NULL),
    ('D9004', 'Rivera', 'Daniel', 'M', '1993-11-17', '2024-01-08', NULL),
    ('D9005', 'Yusuf', 'Amina', 'F', '1988-06-30', '2023-05-22', NULL),
    ('D9006', 'Grant', 'Oliver', 'M', '1985-09-14', '2021-08-02', '2024-12-31'),
    ('D9007', 'Nguyen', 'Sofia', 'F', '1992-03-21', '2020-04-20', '2022-06-30'),
    ('D9008', 'Cole', 'Ethan', 'M', '1997-12-04', '2025-01-13', NULL)
ON CONFLICT (empno) DO NOTHING;

INSERT INTO public.jobhistory (empno, jobcode, effdate, salary, deptcode)
VALUES
    -- Promotion: HR Assistant to HR Specialist.
    ('D9001', 'D901', '2022-01-10', 48000.00, 'D90'),
    ('D9001', 'D902', '2024-07-01', 56000.00, 'D90'),

    -- Promotion: Developer to Senior Developer.
    ('D9002', 'D904', '2023-03-15', 68000.00, 'D91'),
    ('D9002', 'D905', '2025-02-01', 78000.00, 'D91'),

    -- Promotion followed by a department transfer as Sales Lead.
    ('D9003', 'D906', '2022-09-05', 52000.00, 'D92'),
    ('D9003', 'D907', '2024-05-01', 63000.00, 'D92'),
    ('D9003', 'D907', '2025-06-01', 65000.00, 'D93'),

    -- Promotion: Recruiter to HR Specialist.
    ('D9004', 'D903', '2024-01-08', 54000.00, 'D90'),
    ('D9004', 'D902', '2025-07-01', 59000.00, 'D90'),

    -- Department transfer while retaining the Developer job.
    ('D9005', 'D904', '2023-05-22', 70000.00, 'D91'),
    ('D9005', 'D904', '2024-10-01', 72000.00, 'D93'),

    -- Separated employee; the final assignment precedes separation.
    ('D9006', 'D906', '2021-08-02', 50000.00, 'D92'),
    ('D9007', 'D901', '2020-04-20', 45000.00, 'D90'),

    -- New active employee.
    ('D9008', 'D906', '2025-01-13', 53000.00, 'D92')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM public.department
        WHERE deptcode IN ('D90', 'D91', 'D92', 'D93')) <> 4 THEN
        RAISE EXCEPTION 'HR demo seed verification failed: expected 4 demo departments.';
    END IF;

    IF (SELECT COUNT(*) FROM public.job
        WHERE jobcode IN ('D901', 'D902', 'D903', 'D904', 'D905', 'D906', 'D907', 'D908')) <> 8 THEN
        RAISE EXCEPTION 'HR demo seed verification failed: expected 8 demo jobs.';
    END IF;

    IF (SELECT COUNT(*) FROM public.employee
        WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')) <> 8 THEN
        RAISE EXCEPTION 'HR demo seed verification failed: expected 8 demo employees.';
    END IF;

    IF (SELECT COUNT(*) FROM public.employee
        WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
          AND sepdate IS NULL) <> 6
       OR (SELECT COUNT(*) FROM public.employee
           WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
             AND sepdate IS NOT NULL) <> 2 THEN
        RAISE EXCEPTION 'HR demo seed verification failed: expected 6 active and 2 separated employees.';
    END IF;

    IF (SELECT COUNT(*) FROM public.jobhistory
        WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')) <> 14 THEN
        RAISE EXCEPTION 'HR demo seed verification failed: expected 14 demo job history records.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.jobhistory AS earlier
        JOIN public.jobhistory AS later
          ON later.empno = earlier.empno
         AND later.effdate > earlier.effdate
        WHERE earlier.empno = 'D9001'
          AND earlier.jobcode = 'D901'
          AND later.jobcode = 'D902'
          AND later.salary > earlier.salary
    ) OR NOT EXISTS (
        SELECT 1
        FROM public.jobhistory
        WHERE empno = 'D9003'
          AND deptcode = 'D92'
    ) OR NOT EXISTS (
        SELECT 1
        FROM public.jobhistory
        WHERE empno = 'D9003'
          AND deptcode = 'D93'
    ) OR NOT EXISTS (
        SELECT 1
        FROM public.jobhistory
        WHERE empno = 'D9005'
          AND deptcode = 'D91'
    ) OR NOT EXISTS (
        SELECT 1
        FROM public.jobhistory
        WHERE empno = 'D9005'
          AND deptcode = 'D93'
    ) THEN
        RAISE EXCEPTION 'HR demo seed verification failed: promotion or transfer scenarios are missing.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.employee AS e
        LEFT JOIN public.jobhistory AS jh ON jh.empno = e.empno
        WHERE e.empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
        GROUP BY e.empno, e.sepdate
        HAVING COUNT(jh.empno) = 0
            OR (e.sepdate IS NOT NULL AND MAX(jh.effdate) > e.sepdate)
    ) THEN
        RAISE EXCEPTION 'HR demo seed verification failed: employee status and job history dates are inconsistent.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.jobhistory
        WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
          AND salary IS NULL
    ) THEN
        RAISE EXCEPTION 'HR demo seed verification failed: a demo salary is missing.';
    END IF;
END;
$$;

COMMIT;

SELECT
    (SELECT COUNT(*) FROM public.department
     WHERE deptcode IN ('D90', 'D91', 'D92', 'D93')) AS demo_departments,
    (SELECT COUNT(*) FROM public.job
     WHERE jobcode IN ('D901', 'D902', 'D903', 'D904', 'D905', 'D906', 'D907', 'D908')) AS demo_jobs,
    (SELECT COUNT(*) FROM public.employee
     WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')) AS demo_employees,
    (SELECT COUNT(*) FROM public.employee
     WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
       AND sepdate IS NULL) AS active_employees,
    (SELECT COUNT(*) FROM public.employee
     WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
       AND sepdate IS NOT NULL) AS separated_employees,
    (SELECT COUNT(*) FROM public.jobhistory
     WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')) AS demo_job_history,
    (SELECT COUNT(*) FROM public.jobhistory
     WHERE empno IN ('D9001', 'D9002', 'D9003', 'D9004', 'D9005', 'D9006', 'D9007', 'D9008')
       AND salary IS NOT NULL) AS demo_salary_records;
