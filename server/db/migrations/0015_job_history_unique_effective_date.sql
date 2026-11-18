
-- S3-DBA-02: Job History Validation
-- Purpose: Prevent an employee from having multiple job-history
-- records with the same effective date.

ALTER TABLE public.jobHistory
ADD CONSTRAINT uq_jobhistory_empno_effdate
UNIQUE (empNo, effDate);
