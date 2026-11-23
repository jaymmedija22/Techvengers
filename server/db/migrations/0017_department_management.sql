-- Add department-list access and enforce the existing department field rules.
INSERT INTO public.rights (right_code, module_id, description)
SELECT 'departments.view', module_id, 'View Departments'
FROM public.module
WHERE module_code = 'hr'
ON CONFLICT (right_code) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.department
        WHERE deptcode !~ '^[A-Z0-9]{1,3}$'
           OR deptname IS NULL
           OR BTRIM(deptname) = ''
    ) THEN
        RAISE EXCEPTION
            'Cannot add department validation: existing department codes or names are invalid.'
            USING HINT = 'Correct department codes to 1-3 uppercase letters or digits and provide a nonblank department name of at most 20 characters.';
    END IF;
END;
$$;

ALTER TABLE public.department
    ALTER COLUMN deptname SET NOT NULL,
    ADD CONSTRAINT chk_department_code_format
        CHECK (deptcode ~ '^[A-Z0-9]{1,3}$'),
    ADD CONSTRAINT chk_department_name_nonblank
        CHECK (BTRIM(deptname) <> '');

CREATE INDEX IF NOT EXISTS idx_jobhistory_deptcode
    ON public.jobhistory (deptcode);
