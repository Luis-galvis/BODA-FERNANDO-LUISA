-- =========================================================================
-- TABLAS OFICIALES DE LA BODA (FERNANDO & LUISA FERNANDA)
-- Ejecuta este script en el SQL Editor de tu Supabase:
-- https://supabase.com/dashboard/project/tapusiqdotxhtnyxavta/sql/new
-- =========================================================================

-- 1. Tabla de Invitados Oficiales
CREATE TABLE IF NOT EXISTS public.wedding_guests (
  id INT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  passes INT NOT NULL DEFAULT 1,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'confirmed', 'pending', 'declined'
  sent BOOLEAN DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Confirmaciones / Mensajes Recibidos
CREATE TABLE IF NOT EXISTS public.wedding_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id INT REFERENCES public.wedding_guests(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  attendance TEXT NOT NULL DEFAULT 'si', -- 'si', 'no'
  status_text TEXT,
  message TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar Seguridad por Fila (RLS) y Políticas Públicas
ALTER TABLE public.wedding_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_rsvps ENABLE ROW LEVEL SECURITY;

-- Políticas para wedding_guests
DROP POLICY IF EXISTS "Lectura publica invitados" ON public.wedding_guests;
CREATE POLICY "Lectura publica invitados" ON public.wedding_guests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Actualizacion publica invitados" ON public.wedding_guests;
CREATE POLICY "Actualizacion publica invitados" ON public.wedding_guests FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Insercion publica invitados" ON public.wedding_guests;
CREATE POLICY "Insercion publica invitados" ON public.wedding_guests FOR INSERT WITH CHECK (true);

-- Políticas para wedding_rsvps
DROP POLICY IF EXISTS "Lectura publica rsvps" ON public.wedding_rsvps;
CREATE POLICY "Lectura publica rsvps" ON public.wedding_rsvps FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercion publica rsvps" ON public.wedding_rsvps;
CREATE POLICY "Insercion publica rsvps" ON public.wedding_rsvps FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Actualizacion publica rsvps" ON public.wedding_rsvps;
CREATE POLICY "Actualizacion publica rsvps" ON public.wedding_rsvps FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Eliminacion publica rsvps" ON public.wedding_rsvps;
CREATE POLICY "Eliminacion publica rsvps" ON public.wedding_rsvps FOR DELETE USING (true);
