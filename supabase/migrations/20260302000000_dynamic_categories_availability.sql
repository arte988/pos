-- Migration: Dynamic Categories and Product Availability
-- Description: Adds a `categories` table to replace hardcoded categories. Adds availability arrays/booleans to `menu_items` and `pupusa_types`.

-- 1. Create categories table
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Note: We are not migrating old hardcoded categories directly via SQL to avoid complex tenant logic.
-- The user will recreate 'Bebidas', 'Postres' from the UI.

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read categories of their empresa" ON public.categories 
    FOR SELECT 
    USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can manage categories of their empresa" ON public.categories 
    FOR ALL 
    USING (empresa_id = public.get_user_empresa_id());

-- Let SuperAdmins see/manage all categories
CREATE POLICY "SuperAdmins can see all categories" ON public.categories 
    FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));

CREATE POLICY "SuperAdmins can manage all categories" ON public.categories 
    FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));


-- 2. Extend menu_items table
-- Drop the strict constraint on category first if it exists (from old migration)
-- Supabase UI/Dashboard doesn't easily let us DROP CONSTRAINT IF EXISTS without knowing its name, 
-- but looking at standard naming, it's usually menu_items_category_check.
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_category_check'
  ) THEN
    ALTER TABLE public.menu_items DROP CONSTRAINT menu_items_category_check;
  END IF;
END $$;

ALTER TABLE public.menu_items
    ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN available_branches UUID[] DEFAULT '{}',
    ADD COLUMN available_mesa BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN available_llevar BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN available_domicilio BOOLEAN NOT NULL DEFAULT true;

-- 3. Extend pupusa_types table
ALTER TABLE public.pupusa_types
    ADD COLUMN available_branches UUID[] DEFAULT '{}',
    ADD COLUMN available_mesa BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN available_llevar BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN available_domicilio BOOLEAN NOT NULL DEFAULT true;

-- Note: Old existing items will have available_branches = '{}' (empty array).
-- The app logic will treat an empty array as "available everywhere" for backwards compatibility,
-- or we can enforce the UI to update them. In our UI, we will treat empty array as "available in all branches".
