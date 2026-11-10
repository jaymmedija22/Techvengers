-- S1-DBA-06: Record the logged-in ERP user in audit_log
-- when user permissions are granted or revoked.

CREATE OR REPLACE FUNCTION public.audit_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor_text TEXT;
    v_actor_user_id INTEGER;
BEGIN
    -- Read the actor ID set by the backend transaction.
    v_actor_text := current_setting('app.current_user_id', TRUE);

    -- Do not allow permission changes without an identified actor.
    IF v_actor_text IS NULL OR v_actor_text !~ '^[0-9]+$' THEN
        RAISE EXCEPTION
            'Cannot audit permission change: app.current_user_id is missing or invalid';
    END IF;

    v_actor_user_id := v_actor_text::INTEGER;

    -- Record a newly granted permission.
    IF TG_OP = 'INSERT' AND NEW.is_deleted = FALSE THEN
        INSERT INTO public.audit_log (
            actor_user_id,
            target_user_id,
            right_code,
            action
        )
        VALUES (
            v_actor_user_id,
            NEW.user_id,
            NEW.right_code,
            'GRANTED'
        );

    -- Record a permission that has been revoked.
    ELSIF TG_OP = 'UPDATE'
        AND OLD.is_deleted = FALSE
        AND NEW.is_deleted = TRUE THEN

        INSERT INTO public.audit_log (
            actor_user_id,
            target_user_id,
            right_code,
            action
        )
        VALUES (
            v_actor_user_id,
            NEW.user_id,
            NEW.right_code,
            'REVOKED'
        );

    -- Also record a permission reactivated after being revoked.
    ELSIF TG_OP = 'UPDATE'
        AND OLD.is_deleted = TRUE
        AND NEW.is_deleted = FALSE THEN

        INSERT INTO public.audit_log (
            actor_user_id,
            target_user_id,
            right_code,
            action
        )
        VALUES (
            v_actor_user_id,
            NEW.user_id,
            NEW.right_code,
            'GRANTED'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_permission
ON public.user_permission;

CREATE TRIGGER trg_audit_user_permission
AFTER INSERT OR UPDATE OF is_deleted
ON public.user_permission
FOR EACH ROW
EXECUTE FUNCTION public.audit_user();