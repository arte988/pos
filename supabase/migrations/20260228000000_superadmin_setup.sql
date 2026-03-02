-- Crear tabla para identificar superadmins
CREATE TABLE public.superadmins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can read superadmins" ON public.superadmins FOR SELECT USING (auth.uid() = id);

-- Actualizar política de empresas para que los superadministradores puedan verlas todas
DROP POLICY IF EXISTS "Users can read their own empresa" ON public.empresas;
CREATE POLICY "Users can read their own empresa or superadmins can read all" ON public.empresas FOR SELECT USING (
  id = public.get_user_empresa_id() OR 
  EXISTS (SELECT 1 FROM public.superadmins WHERE superadmins.id = auth.uid())
);

-- Actualizar política de licencias para que SOLO los superadministradores puedan gestionarlas
DROP POLICY IF EXISTS "SuperAdmins can do everything on licencias" ON public.licencias;
CREATE POLICY "SuperAdmins can do everything on licencias" ON public.licencias FOR ALL USING (
  EXISTS (SELECT 1 FROM public.superadmins WHERE superadmins.id = auth.uid())
);
