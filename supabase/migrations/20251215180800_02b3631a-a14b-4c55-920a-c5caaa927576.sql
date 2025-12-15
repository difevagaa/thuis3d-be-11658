-- Habilitar Realtime para stock_reservations y stock_waitlist
ALTER TABLE public.stock_reservations REPLICA IDENTITY FULL;
ALTER TABLE public.stock_waitlist REPLICA IDENTITY FULL;

-- Añadir tablas a la publicación de realtime (si no existen ya)
DO $$
BEGIN
  -- Check if tables are already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'stock_reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_reservations;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'stock_waitlist'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_waitlist;
  END IF;
  
  -- También añadir products para actualizaciones de stock_quantity
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;