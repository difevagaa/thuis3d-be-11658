-- Remove problematic policy referencing auth.users to fix SELECT on gift_cards
DROP POLICY IF EXISTS "Users can view gift cards sent to their email" ON public.gift_cards;