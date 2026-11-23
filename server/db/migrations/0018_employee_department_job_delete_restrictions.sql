-- Explicitly restrict deletion of employee, department, and job rows while
-- related records exist. These references already used PostgreSQL's default
-- NO ACTION behavior; RESTRICT makes the intended immediate protection clear.
ALTER TABLE public.jobhistory
    DROP CONSTRAINT IF EXISTS jobhistory_empno_fkey,
    ADD CONSTRAINT fk_jobhistory_employee_delete_restrict
        FOREIGN KEY (empno)
        REFERENCES public.employee (empno)
        ON DELETE RESTRICT;

ALTER TABLE public.sales
    DROP CONSTRAINT IF EXISTS sales_empno_fkey,
    ADD CONSTRAINT fk_sales_employee_delete_restrict
        FOREIGN KEY (empno)
        REFERENCES public.employee (empno)
        ON DELETE RESTRICT;

ALTER TABLE public.jobhistory
    DROP CONSTRAINT IF EXISTS jobhistory_deptcode_fkey,
    ADD CONSTRAINT fk_jobhistory_department_delete_restrict
        FOREIGN KEY (deptcode)
        REFERENCES public.department (deptcode)
        ON DELETE RESTRICT;

ALTER TABLE public.jobhistory
    DROP CONSTRAINT IF EXISTS jobhistory_jobcode_fkey,
    ADD CONSTRAINT fk_jobhistory_job_delete_restrict
        FOREIGN KEY (jobcode)
        REFERENCES public.job (jobcode)
        ON DELETE RESTRICT;

-- app_user.empno already has fk_app_user_employee with ON DELETE RESTRICT.
-- Index child columns used by the foreign-key checks where no suitable
-- leading index already exists.
CREATE INDEX IF NOT EXISTS idx_app_user_empno
    ON public.app_user (empno);

CREATE INDEX IF NOT EXISTS idx_sales_empno
    ON public.sales (empno);

CREATE INDEX IF NOT EXISTS idx_jobhistory_jobcode
    ON public.jobhistory (jobcode);

CREATE INDEX IF NOT EXISTS idx_jobhistory_deptcode
    ON public.jobhistory (deptcode);
