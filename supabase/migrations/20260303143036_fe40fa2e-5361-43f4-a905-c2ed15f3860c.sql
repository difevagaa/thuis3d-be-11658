
-- Add 10 new configuration columns to site_mascot_settings
ALTER TABLE public.site_mascot_settings 
ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS walk_speed text NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_message text NOT NULL DEFAULT '¡Hola! 👋',
ADD COLUMN IF NOT EXISTS opacity numeric NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS night_mode boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_cursor boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_emojis boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS hide_on_checkout boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS spontaneous_interval integer NOT NULL DEFAULT 30;
