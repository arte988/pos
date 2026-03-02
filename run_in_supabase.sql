-- Ejecuta todo este script en el editor SQL de tu panel de Supabase:

CREATE TABLE IF NOT EXISTS public.combo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    combo_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    pupusa_type_id UUID REFERENCES public.pupusa_types(id) ON DELETE CASCADE,
    masa_type_id UUID REFERENCES public.masa_types(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir a empresas ver sus combo_items" ON public.combo_items FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));
CREATE POLICY "Permitir a empresas insertar combo_items" ON public.combo_items FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));
CREATE POLICY "Permitir a empresas actualizar combo_items" ON public.combo_items FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));
CREATE POLICY "Permitir a empresas eliminar combo_items" ON public.combo_items FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));
