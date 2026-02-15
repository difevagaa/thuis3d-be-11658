-- =====================================================
-- ABANDONED CART TRACKING (SHOPIFY PRO FEATURE)
-- =====================================================
-- Adds tracking for abandoned carts and checkout sessions
-- Allows admin to identify and recover abandoned checkouts

-- Add status column to checkout_sessions
ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'recovered'));

-- Add cart_data column to store cart contents at time of abandonment
ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS cart_data JSONB DEFAULT '[]'::jsonb;

-- Add last_activity timestamp
ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();

-- Create index for finding abandoned carts
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status_expires 
ON checkout_sessions(status, expires_at) 
WHERE status = 'active';

-- Create function to mark carts as abandoned after 24 hours
-- Uses 25-hour window to ensure we catch all carts older than 24 hours with some buffer
CREATE OR REPLACE FUNCTION mark_abandoned_carts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  CHECKOUT_BUFFER_HOURS CONSTANT INTEGER := 25; -- 25 hours buffer to ensure 24+ hour old carts are caught
BEGIN
  -- Mark checkout sessions as abandoned if:
  -- 1. Status is still 'active'
  -- 2. expires_at has passed (more than 24 hours old)
  -- 3. No order was created from this session
  UPDATE checkout_sessions cs
  SET 
    status = 'abandoned',
    updated_at = NOW()
  WHERE 
    cs.status = 'active'
    AND cs.expires_at < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.user_id = cs.user_id
        AND o.user_id IS NOT NULL
        AND o.created_at > cs.created_at
        AND o.created_at < (cs.created_at + (CHECKOUT_BUFFER_HOURS || ' hours')::INTERVAL)
    );
    
  RAISE NOTICE 'Marked % checkout sessions as abandoned', FOUND;
END;
$$;

-- Create function to mark cart as completed when order is created
CREATE OR REPLACE FUNCTION mark_checkout_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to find and mark the corresponding checkout session as completed
  UPDATE checkout_sessions
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE 
    user_id = NEW.user_id
    AND status = 'active'
    AND created_at > (NOW() - INTERVAL '25 hours')
    AND created_at < NEW.created_at
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically mark checkout as completed when order is created
DROP TRIGGER IF EXISTS trigger_mark_checkout_completed ON orders;
CREATE TRIGGER trigger_mark_checkout_completed
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION mark_checkout_completed();

-- Create view for easy querying of abandoned carts
CREATE OR REPLACE VIEW abandoned_carts_view AS
SELECT 
  cs.id,
  cs.user_id,
  cs.shipping_info->>'full_name' as customer_name,
  cs.shipping_info->>'email' as customer_email,
  cs.shipping_info->>'phone' as customer_phone,
  cs.cart_data,
  cs.created_at,
  cs.expires_at,
  cs.last_activity,
  COALESCE(
    (SELECT SUM((item->>'price')::numeric * (item->>'quantity')::numeric)
     FROM jsonb_array_elements(cs.cart_data) AS item),
    0
  ) as cart_total,
  p.full_name as user_full_name,
  p.email as user_email
FROM checkout_sessions cs
LEFT JOIN profiles p ON p.id = cs.user_id
WHERE cs.status = 'abandoned'
ORDER BY cs.created_at DESC;

-- Grant permissions
GRANT SELECT ON abandoned_carts_view TO authenticated;
GRANT ALL ON abandoned_carts_view TO service_role;

COMMENT ON TABLE checkout_sessions IS 'Tracks checkout sessions with abandonment detection';
COMMENT ON FUNCTION mark_abandoned_carts() IS 'Marks checkout sessions as abandoned after 24 hours without completion';
COMMENT ON FUNCTION mark_checkout_completed() IS 'Marks checkout session as completed when order is created';
COMMENT ON VIEW abandoned_carts_view IS 'Easy view of abandoned carts with customer info and cart totals';
