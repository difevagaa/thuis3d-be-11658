-- Fix error when saving products due to translation queue function referencing non-existent column
-- Ensure translation_queue has updated_at and created_at timestamps and proper trigger

-- Create helper function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add missing timestamp columns if not present
ALTER TABLE IF EXISTS public.translation_queue
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Recreate trigger to keep updated_at in sync
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_translation_queue_updated_at'
  ) THEN
    -- Drop existing to avoid duplicate
    DROP TRIGGER trg_translation_queue_updated_at ON public.translation_queue;
  END IF;
  CREATE TRIGGER trg_translation_queue_updated_at
  BEFORE UPDATE ON public.translation_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END $$;

-- Optional: ensure the unique constraint used by queue_translation() exists
-- This avoids duplicates for the same entity field being queued repeatedly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'translation_queue' AND c.conname = 'uq_translation_queue_entity_field'
  ) THEN
    -- Add a unique index/constraint on (entity_type, entity_id, field_name)
    ALTER TABLE public.translation_queue
      ADD CONSTRAINT uq_translation_queue_entity_field UNIQUE (entity_type, entity_id, field_name);
  END IF;
END $$;