-- Add phone_number to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone_number text;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_phone_number_idx ON public.user_profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Trusted devices table for new-device-only OTP
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices" ON public.trusted_devices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.trusted_devices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.trusted_devices
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON public.trusted_devices
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- OTP codes table (accessed only via service role in edge functions)
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  delivery_method text NOT NULL DEFAULT 'email',
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);