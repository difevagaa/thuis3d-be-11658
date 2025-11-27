-- Add slug column to quote_statuses for language-independent status lookup
ALTER TABLE quote_statuses ADD COLUMN IF NOT EXISTS slug TEXT;

-- Update existing statuses with slugs
UPDATE quote_statuses SET slug = 'pending' WHERE name = 'Pendiente';
UPDATE quote_statuses SET slug = 'in_review' WHERE name = 'En revisión';
UPDATE quote_statuses SET slug = 'approved' WHERE name = 'Aprobada';
UPDATE quote_statuses SET slug = 'rejected' WHERE name = 'Rechazada';
UPDATE quote_statuses SET slug = 'completed' WHERE name = 'Completada';

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS quote_statuses_slug_idx ON quote_statuses(slug) WHERE deleted_at IS NULL;

-- Verify quote-files bucket exists and has correct policies
DO $$
BEGIN
  -- Ensure quote-files bucket exists (private)
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('quote-files', 'quote-files', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload quote files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own quote files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all quote files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own quote files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete quote files" ON storage.objects;

-- Policy: Authenticated users can upload files to quote-files bucket
CREATE POLICY "Authenticated users can upload quote files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-files'
);

-- Policy: Admins can view all quote files
CREATE POLICY "Admins can view all quote files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'quote-files' AND
  has_role(auth.uid(), 'admin')
);

-- Policy: Users can view their own quote files (files uploaded by them)
CREATE POLICY "Users can view their own quote files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'quote-files' AND
  auth.uid() = owner
);

-- Policy: Admins can delete quote files
CREATE POLICY "Admins can delete quote files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote-files' AND
  has_role(auth.uid(), 'admin')
);