-- Add buyer_id to gift_cards so buyers can see their purchased cards
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES auth.users(id);

-- Add buyer_email to gift_cards for tracking  
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS buyer_email text;