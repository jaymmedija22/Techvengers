-- Add permission to view employee records.
INSERT INTO public.rights (right_code, module_id, description)
SELECT 'employees.view', module_id, 'View Employees'
FROM public.module
WHERE module_code = 'hr'
ON CONFLICT (right_code) DO NOTHING;
