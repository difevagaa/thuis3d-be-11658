-- Allow admins to manage blog_post_roles (insert/update/delete)
ALTER TABLE public.blog_post_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blog_post_roles' AND policyname = 'Admins can insert blog post roles'
  ) THEN
    CREATE POLICY "Admins can insert blog post roles"
    ON public.blog_post_roles
    FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blog_post_roles' AND policyname = 'Admins can update blog post roles'
  ) THEN
    CREATE POLICY "Admins can update blog post roles"
    ON public.blog_post_roles
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blog_post_roles' AND policyname = 'Admins can delete blog post roles'
  ) THEN
    CREATE POLICY "Admins can delete blog post roles"
    ON public.blog_post_roles
    FOR DELETE
    USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;