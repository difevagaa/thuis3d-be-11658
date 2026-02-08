-- ============================================================================
-- FIX: Add missing STL MIME types to quote-files bucket
-- ============================================================================
-- Date: 2026-02-08
-- Purpose: Fix "mime type application/vnd.ms-pki.stl is not supported" error
--          when uploading STL files in quote forms
-- ============================================================================

-- Update quote-files bucket to include all STL MIME types
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    -- Image formats
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    -- Document formats
    'application/pdf',
    -- 3D file formats
    'application/sla',
    'model/stl',
    'model/x.stl-binary',
    'model/obj',
    'model/3mf',
    -- STL MIME types (including the missing one)
    'application/vnd.ms-pki.stl',
    'application/x-navistyle',
    -- Generic fallback
    'application/octet-stream'
  ],
  file_size_limit = 52428800  -- 50MB limit
WHERE id = 'quote-files';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- To verify the update:
-- SELECT id, name, allowed_mime_types FROM storage.buckets WHERE id = 'quote-files';
-- ============================================================================
