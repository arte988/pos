-- Ejecuta todo este script en el editor SQL de tu panel de Supabase:

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir a empresas ver sus payment_methods" ON public.payment_methods FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));
CREATE POLICY "Permitir a empresas insertar payment_methods" ON public.payment_methods FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));
CREATE POLICY "Permitir a empresas actualizar payment_methods" ON public.payment_methods FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));
CREATE POLICY "Permitir a empresas eliminar payment_methods" ON public.payment_methods FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.superadmins WHERE id = auth.uid()));

-- Añadir el foreign key a la tabla orders si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_method_id') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;
    END IF;
END $$;
