-- Allow admins to read all user profiles for the admin panel
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all workout logs
CREATE POLICY "Admins can view all workout logs"
ON public.workout_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));