-- Add a dedicated permission for restoring separated employees.
INSERT INTO public.rights (right_code, module_id, description)
SELECT 'employees.restore', module_id, 'Restore Employee'
FROM public.module
WHERE module_code = 'hr'
ON CONFLICT (right_code) DO NOTHING;
