-- 1. Create Empresas table
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 2. Create Perfiles table mapping users to empresas
CREATE TABLE public.perfiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin', 'cajero', 'cocina')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- 3. Add empresa_id to all operational tables
ALTER TABLE public.masa_types ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.pupusa_types ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.pupusas ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.menu_items ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.cash_closings ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- We don't make empresa_id NOT NULL yet, because there might be existing data.
-- Since this is an MVP likely with no data, we could make it not null, but let's keep it safe.

-- 4. Create securely defined helper function to get current user's empresa_id
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 5. Drop old overly permissive policies (from previous migration or if they exist)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END
$$;

-- 6. Create trigger to auto-assign empresa_id on INSERT for operational tables
CREATE OR REPLACE FUNCTION public.set_empresa_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_user_empresa_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger to all tables
CREATE TRIGGER set_empresa_id_masa_types BEFORE INSERT ON public.masa_types FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_pupusa_types BEFORE INSERT ON public.pupusa_types FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_pupusas BEFORE INSERT ON public.pupusas FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_menu_items BEFORE INSERT ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_orders BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_order_items BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_cash_closings BEFORE INSERT ON public.cash_closings FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();

-- 7. New Multi-tenant RLS Policies

-- perfiles
CREATE POLICY "Users can read their own profile" ON public.perfiles FOR SELECT USING (auth.uid() = id);

-- empresas
CREATE POLICY "Users can read their own empresa" ON public.empresas FOR SELECT USING (id = public.get_user_empresa_id());
CREATE POLICY "Users can update their own empresa" ON public.empresas FOR UPDATE USING (id = public.get_user_empresa_id());

-- The rest of operations tables: only where empresa_id matches the user's
CREATE POLICY "Tenant isolation for masa_types" ON public.masa_types USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Tenant isolation for pupusa_types" ON public.pupusa_types USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Tenant isolation for pupusas" ON public.pupusas USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Tenant isolation for menu_items" ON public.menu_items USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Tenant isolation for orders" ON public.orders USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Tenant isolation for order_items" ON public.order_items USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Tenant isolation for cash_closings" ON public.cash_closings USING (empresa_id = public.get_user_empresa_id());

-- Allow anyone with auth to create an empresa (during signup)
CREATE POLICY "Anyone can create an empresa" ON public.empresas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Edge Function / DB Function to handle registration.
-- Since edge functions require setup, let's create a database function to handle signups securely.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup(
  p_user_id UUID,
  p_nombre_empresa TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- 1. Insert nueva empresa
  INSERT INTO public.empresas (nombre) VALUES (p_nombre_empresa) RETURNING id INTO v_empresa_id;
  
  -- 2. Insert perfil linked to auth.users and the new empresa
  INSERT INTO public.perfiles (id, empresa_id, rol) VALUES (p_user_id, v_empresa_id, 'admin');

  RETURN jsonb_build_object('success', true, 'empresa_id', v_empresa_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
