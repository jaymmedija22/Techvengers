
-- S3-DBA-01: Employee Current Job and Department
-- Purpose: Create a view showing each employee's latest job assignment.

CREATE OR REPLACE VIEW public.vw_employee_current_job_department
WITH (security_invoker = true)
AS
SELECT
    e.empno,
    e.lastname,
    e.firstname,
    jh.jobCode,
    j.jobDesc,
    jh.deptCode,
    d.deptName,
    jh.effDate
FROM public.employee e
LEFT JOIN public.jobHistory jh
    ON e.empno = jh.empNo
    AND jh.effDate = (
        SELECT MAX(jh2.effDate)
        FROM public.jobHistory jh2
        WHERE jh2.empNo = e.empno
    )
LEFT JOIN public.job j
    ON jh.jobCode = j.jobCode
LEFT JOIN public.department d
    ON jh.deptCode = d.deptCode;
