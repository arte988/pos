ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS tip_percentage NUMERIC(5,2) DEFAULT 0;
