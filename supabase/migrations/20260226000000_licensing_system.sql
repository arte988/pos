-- 1. Añadir fecha de expiración a empresas (Para nuevas empresas será 0 días, o puedes darle unos días de prueba si cambias el default)
ALTER TABLE public.empresas ADD COLUMN licencia_expira_el TIMESTAMP WITH TIME ZONE NULL;

-- 2. Crear tabla de Licencias (Solo admins creados por ti deberían poder generarlas, pero como es MVP las protegeremos a nivel RLS simple y desde el panel admin verificaremos el "rol" si es necesario)
CREATE TABLE public.licencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  dias_duracion INTEGER NOT NULL DEFAULT 30,
  activa BOOLEAN NOT NULL DEFAULT true,
  usada_el TIMESTAMP WITH TIME ZONE NULL,
  usada_por_empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para Licencias
ALTER TABLE public.licencias ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para Licencias
-- Solo tú (Super Admin) en el panel de admin debería poder CREAR y LEER la lista completa.
-- Como no tenemos rol superadmin aún explícito, temporalmente nadie desde la app principal puede hacerle select a todas las licencias
-- Excepto mediante la función Segura RPC (que evade RLS por tener SECURITY DEFINER).
CREATE POLICY "SuperAdmins can do everything on licencias" ON public.licencias FOR ALL USING (
  -- Si agregas un rol "superadmin" en la tabla auth.users o creas un campo especial, lo validarías aquí.
  -- Para MVP del admin panel, permitiremos acceso a usuarios autenticados pero la app admin la tendrás solo tú.
  -- *Recomendación:* Más adelante crea una tabla `superadmins` con tu UUID.
  auth.uid() IS NOT NULL
);

-- 4. Función Segura RPC para canjear un código
CREATE OR REPLACE FUNCTION public.activar_licencia(p_codigo TEXT)
RETURNS jsonb AS $$
DECLARE
  v_licencia record;
  v_empresa_id uuid;
  v_nueva_fecha timestamp with time zone;
  v_fecha_actual timestamp with time zone;
BEGIN
  -- 1. Obtener la ID de la empresa del usuario actual
  SELECT empresa_id INTO v_empresa_id FROM public.perfiles WHERE id = auth.uid();
  
  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no pertenece a ninguna empresa.');
  END IF;

  -- 2. Buscar la licencia solicitada (Locking the row to prevent race conditions)
  SELECT * INTO v_licencia FROM public.licencias WHERE codigo = p_codigo AND activa = true FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'El código de licencia no existe o ya ha sido utilizado.');
  END IF;

  -- 3. Calcular la nueva fecha de expiración
  -- Obtenemos la fecha de expiración actual de la empresa
  SELECT licencia_expira_el INTO v_fecha_actual FROM public.empresas WHERE id = v_empresa_id FOR UPDATE;
  
  -- Si ya está expirada o es null, empezamos desde la fecha actual (now())
  IF v_fecha_actual IS NULL OR v_fecha_actual < now() THEN
    v_nueva_fecha := now() + (v_licencia.dias_duracion || ' days')::interval;
  ELSE
    -- Si aún tiene tiempo, le sumamos los días a la fecha que ya tiene
    v_nueva_fecha := v_fecha_actual + (v_licencia.dias_duracion || ' days')::interval;
  END IF;

  -- 4. Actualizar la Empresa asignando la nueva fecha
  UPDATE public.empresas 
  SET licencia_expira_el = v_nueva_fecha, 
      updated_at = now() /* Si creaste la columna updated_at para empresas, si no puedes ignorarlo o asumimos fallback */
  WHERE id = v_empresa_id;

  -- 5. Marcar la licencia como usada
  UPDATE public.licencias
  SET activa = false,
      usada_el = now(),
      usada_por_empresa_id = v_empresa_id
  WHERE id = v_licencia.id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Licencia activada con éxito',
    'expira_el', v_nueva_fecha
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
