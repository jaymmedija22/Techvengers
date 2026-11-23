-- Add permission to view the job catalogue.
INSERT INTO public.rights (right_code, module_id, description)
SELECT 'jobs.view', module_id, 'View Jobs'
FROM public.module
WHERE module_code = 'hr'
ON CONFLICT (right_code) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.job
        WHERE jobcode !~ '^[A-Z0-9]{1,4}$'
           OR jobdesc IS NULL
           OR BTRIM(jobdesc) = ''
    ) THEN
        RAISE EXCEPTION
            'Cannot add job validation: existing job codes or descriptions are invalid.'
            USING HINT = 'Correct job codes to 1-4 uppercase letters or digits and provide a nonblank job description of at most 20 characters.';
    END IF;
END;
$$;

ALTER TABLE public.job
    ALTER COLUMN jobdesc SET NOT NULL,
    ADD CONSTRAINT chk_job_code_format
        CHECK (jobcode ~ '^[A-Z0-9]{1,4}$'),
    ADD CONSTRAINT chk_job_description_nonblank
        CHECK (BTRIM(jobdesc) <> '');

-- Employee job assignments use jobHistory.jobCode. Keep the explicit delete
-- restriction here so this feature remains protected when deployed alone.
ALTER TABLE public.jobhistory
    DROP CONSTRAINT IF EXISTS jobhistory_jobcode_fkey,
    DROP CONSTRAINT IF EXISTS fk_jobhistory_job_delete_restrict,
    ADD CONSTRAINT fk_jobhistory_job_delete_restrict
        FOREIGN KEY (jobcode)
        REFERENCES public.job (jobcode)
        ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_jobhistory_jobcode
    ON public.jobhistory (jobcode);
