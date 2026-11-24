-- Restrict employee salary visibility to users with an explicit permission.
INSERT INTO public.rights (right_code, module_id, description)
SELECT 'employees.salary.view', module_id, 'View Employee Salary'
FROM public.module
WHERE module_code = 'hr'
ON CONFLICT (right_code) DO NOTHING;
