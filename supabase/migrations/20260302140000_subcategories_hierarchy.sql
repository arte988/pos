-- Nueva tabla subcategories (Categorías Reales)
CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE, -- Referencia a "Alimentos"
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para subcategories
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subcategories of their empresa" ON public.subcategories
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.perfiles
            WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.superadmins
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert subcategories for their empresa" ON public.subcategories
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.perfiles
            WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.superadmins
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their subcategories" ON public.subcategories
    FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.perfiles
            WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.superadmins
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their subcategories" ON public.subcategories
    FOR DELETE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.perfiles
            WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.superadmins
            WHERE id = auth.uid()
        )
    );

-- Modificaciones a la tabla menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;
