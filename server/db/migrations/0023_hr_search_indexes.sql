-- Accelerate the substring searches used by the Employee Management listing.
-- Existing employee/job/department primary keys and job-history indexes
-- already cover equality joins and employee timeline date ordering.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_employee_empno_trgm
    ON public.employee USING GIN (empno gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_employee_firstname_trgm
    ON public.employee USING GIN ((COALESCE(firstname, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_employee_lastname_trgm
    ON public.employee USING GIN ((COALESCE(lastname, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_employee_fullname_trgm
    ON public.employee USING GIN (
        (BTRIM(COALESCE(firstname, '') || ' ' || COALESCE(lastname, ''))) gin_trgm_ops
    );

CREATE INDEX IF NOT EXISTS idx_job_jobcode_trgm
    ON public.job USING GIN (jobcode gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_job_jobdesc_trgm
    ON public.job USING GIN ((COALESCE(jobdesc, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_department_deptcode_trgm
    ON public.department USING GIN (deptcode gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_department_deptname_trgm
    ON public.department USING GIN ((COALESCE(deptname, '')) gin_trgm_ops);

ANALYZE public.employee;
ANALYZE public.job;
ANALYZE public.department;
ANALYZE public.jobhistory;
