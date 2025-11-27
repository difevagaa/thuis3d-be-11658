-- Add content length constraints for rich text fields to prevent abuse
-- Limits accommodate existing content including base64 embedded images

-- Blog posts content (max existing: ~823K with embedded images)
ALTER TABLE blog_posts 
DROP CONSTRAINT IF EXISTS blog_posts_content_length_check;

ALTER TABLE blog_posts 
ADD CONSTRAINT blog_posts_content_length_check 
CHECK (length(content) <= 1000000);

-- Blog posts excerpt
ALTER TABLE blog_posts 
DROP CONSTRAINT IF EXISTS blog_posts_excerpt_length_check;

ALTER TABLE blog_posts 
ADD CONSTRAINT blog_posts_excerpt_length_check 
CHECK (excerpt IS NULL OR length(excerpt) <= 20000);

-- Products description
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_description_length_check;

ALTER TABLE products 
ADD CONSTRAINT products_description_length_check 
CHECK (description IS NULL OR length(description) <= 50000);

-- Pages content
ALTER TABLE pages 
DROP CONSTRAINT IF EXISTS pages_content_length_check;

ALTER TABLE pages 
ADD CONSTRAINT pages_content_length_check 
CHECK (length(content) <= 200000);

-- Legal pages content
ALTER TABLE legal_pages 
DROP CONSTRAINT IF EXISTS legal_pages_content_length_check;

ALTER TABLE legal_pages 
ADD CONSTRAINT legal_pages_content_length_check 
CHECK (length(content) <= 300000);

-- Quotes description (max existing: ~823K with embedded images)
ALTER TABLE quotes 
DROP CONSTRAINT IF EXISTS quotes_description_length_check;

ALTER TABLE quotes 
ADD CONSTRAINT quotes_description_length_check 
CHECK (description IS NULL OR length(description) <= 1000000);

-- Messages content
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_message_length_check;

ALTER TABLE messages 
ADD CONSTRAINT messages_message_length_check 
CHECK (length(message) <= 100000);

-- Homepage banners
ALTER TABLE homepage_banners 
DROP CONSTRAINT IF EXISTS homepage_banners_description_length_check;

ALTER TABLE homepage_banners 
ADD CONSTRAINT homepage_banners_description_length_check 
CHECK (description IS NULL OR length(description) <= 10000);

-- Gallery items
ALTER TABLE gallery_items 
DROP CONSTRAINT IF EXISTS gallery_items_description_length_check;

ALTER TABLE gallery_items 
ADD CONSTRAINT gallery_items_description_length_check 
CHECK (description IS NULL OR length(description) <= 10000);

-- Homepage sections
ALTER TABLE homepage_sections 
DROP CONSTRAINT IF EXISTS homepage_sections_description_length_check;

ALTER TABLE homepage_sections 
ADD CONSTRAINT homepage_sections_description_length_check 
CHECK (description IS NULL OR length(description) <= 5000);

-- Security documentation
COMMENT ON CONSTRAINT blog_posts_content_length_check ON blog_posts IS 
'Security: Prevents DoS via excessively large content. Max 1MB accommodates rich text with base64 images.';

COMMENT ON CONSTRAINT quotes_description_length_check ON quotes IS 
'Security: Prevents abuse while allowing detailed quotes with attachments. Max 1MB.';

COMMENT ON CONSTRAINT products_description_length_check ON products IS 
'Security: Limits product descriptions to prevent database bloat. Max 50KB.';

COMMENT ON CONSTRAINT pages_content_length_check ON pages IS 
'Security: Prevents excessively large pages. Max 200KB.';

COMMENT ON CONSTRAINT messages_message_length_check ON messages IS 
'Security: Prevents spam/abuse while allowing detailed communications. Max 100KB.';