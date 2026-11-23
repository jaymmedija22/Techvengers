-- Link an application account to an employee when the account belongs to one.
-- Keep this nullable so existing accounts and non-employee service accounts
-- remain valid.
ALTER TABLE public.app_user
    ADD COLUMN IF NOT EXISTS empno VARCHAR(5);

-- Validate any existing values before creating the foreign key. This also
-- catches invalid values if the column was populated outside this migration.
DO $$
DECLARE
    invalid_reference_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO invalid_reference_count
    FROM public.app_user AS app
    LEFT JOIN public.employee AS employee
        ON employee.empno = app.empno
    WHERE app.empno IS NOT NULL
      AND employee.empno IS NULL;

    IF invalid_reference_count > 0 THEN
        RAISE EXCEPTION
            'Cannot add app_user employee relationship: % invalid empno reference(s) found.',
            invalid_reference_count
            USING HINT = 'Correct each app_user.empno to a valid public.employee.empno, or set it to NULL for accounts without an employee.';
    END IF;
END;
$$;

ALTER TABLE public.app_user
    ADD CONSTRAINT fk_app_user_employee
    FOREIGN KEY (empno)
    REFERENCES public.employee (empno)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
