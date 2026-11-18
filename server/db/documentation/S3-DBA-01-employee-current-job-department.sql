
-- S3-DBA-01: Employee Current Job and Department
-- Purpose: Retrieve each employee's latest job and department
-- Database: PostgreSQL

-- 1. Create a view showing each employee's latest job and department
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


-- 2. Test the view
SELECT *
FROM public.vw_employee_current_job_department
ORDER BY empno;


-- 3. Check for employees with multiple job-history
-- records on their latest effective date
SELECT
    jh.empNo,
    MAX(jh.effDate) AS latest_effective_date,
    COUNT(*) AS latest_record_count
FROM public.jobHistory jh
WHERE jh.effDate = (
    SELECT MAX(jh2.effDate)
    FROM public.jobHistory jh2
    WHERE jh2.empNo = jh.empNo
)
GROUP BY jh.empNo
HAVING COUNT(*) > 1
ORDER BY jh.empNo;
