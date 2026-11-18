ALTER TABLE public.profiles
  ADD COLUMN dodo_customer_id text,
  ADD COLUMN dodo_subscription_id text,
  ADD COLUMN subscription_status text,
  ADD COLUMN plan_updated_at timestamptz;

CREATE INDEX profiles_email_lower_idx ON public.profiles (lower(email));
CREATE INDEX profiles_dodo_customer_idx ON public.profiles (dodo_customer_id);

CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user = 'authenticated' AND (
    NEW.plan IS DISTINCT FROM OLD.plan OR NEW.email IS DISTINCT FROM OLD.email OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.dodo_customer_id IS DISTINCT FROM OLD.dodo_customer_id
    OR NEW.dodo_subscription_id IS DISTINCT FROM OLD.dodo_subscription_id
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.plan_updated_at IS DISTINCT FROM OLD.plan_updated_at
  ) THEN
    RAISE EXCEPTION 'No puedes cambiar tu plan desde aquí' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

CREATE TABLE public.payment_events (
  webhook_id text PRIMARY KEY,
  event_type text NOT NULL,
  subscription_id text,
  user_id uuid,
  received_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;