-- Create Waiters table
CREATE TABLE IF NOT EXISTS public.waiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para meseros
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;

-- Select policy: User can view waiters of their empresa
CREATE POLICY "Users can view waiters of their empresa" ON public.waiters
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

-- Insert policy: User can insert waiters for their empresa
CREATE POLICY "Users can insert waiters for their empresa" ON public.waiters
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

-- Update policy: User can update their waiters
CREATE POLICY "Users can update their waiters" ON public.waiters
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

-- Delete policy: User can delete their waiters
CREATE POLICY "Users can delete their waiters" ON public.waiters
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

-- Modificaciones a la tabla orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.waiters(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) DEFAULT 0;
