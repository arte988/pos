
-- Tipos de masa
CREATE TABLE public.masa_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tipos de pupusa (rellenos)
CREATE TABLE public.pupusa_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pupusas (combinación masa + relleno)
CREATE TABLE public.pupusas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  masa_type_id UUID NOT NULL REFERENCES public.masa_types(id) ON DELETE CASCADE,
  pupusa_type_id UUID NOT NULL REFERENCES public.pupusa_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Items del menú (bebidas, postres, otros)
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('bebida', 'postre', 'otro')),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Órdenes
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL DEFAULT 'Cliente',
  order_number SERIAL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'preparando', 'lista', 'despachada', 'cancelada')),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Items de cada orden
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('pupusa', 'bebida', 'postre', 'otro')),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cierres de caja
CREATE TABLE public.cash_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_pupusas INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.masa_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pupusa_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pupusas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

-- Public read policies for catalog tables
CREATE POLICY "Anyone can read masa types" ON public.masa_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read pupusa types" ON public.pupusa_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read pupusas" ON public.pupusas FOR SELECT USING (true);
CREATE POLICY "Anyone can read menu items" ON public.menu_items FOR SELECT USING (true);

-- Authenticated users can manage catalog
CREATE POLICY "Auth users can insert masa types" ON public.masa_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update masa types" ON public.masa_types FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete masa types" ON public.masa_types FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can insert pupusa types" ON public.pupusa_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update pupusa types" ON public.pupusa_types FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete pupusa types" ON public.pupusa_types FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can insert pupusas" ON public.pupusas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update pupusas" ON public.pupusas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete pupusas" ON public.pupusas FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can insert menu items" ON public.menu_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update menu items" ON public.menu_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete menu items" ON public.menu_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- Order policies
CREATE POLICY "Auth users can read orders" ON public.orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can insert orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update orders" ON public.orders FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can read order items" ON public.order_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can insert order items" ON public.order_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Cash closing policies
CREATE POLICY "Auth users can read cash closings" ON public.cash_closings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can insert cash closings" ON public.cash_closings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
