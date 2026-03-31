
-- Workout schedules table
CREATE TABLE public.workout_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_days text[] NOT NULL DEFAULT '{}',
  preferred_time time NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'UTC',
  reminders_enabled boolean NOT NULL DEFAULT true,
  early_reminder_minutes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.workout_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule" ON public.workout_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule" ON public.workout_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule" ON public.workout_schedules FOR UPDATE USING (auth.uid() = user_id);

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_workout_schedules_updated_at
  BEFORE UPDATE ON public.workout_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
