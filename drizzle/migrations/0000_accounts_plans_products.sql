-- ===== Roles (admin) =====
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can see their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text,
  email text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  pais text CHECK (pais IN ('UY','MX','CO','AR','CL','BR')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Users may only edit their name; plan and country change through controlled paths.
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (nombre) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.has_full_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND plan = 'pro')
      OR public.has_role(_user_id, 'admin')
$$;

-- ===== Products =====
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nombre text NOT NULL,
  pais text NOT NULL CHECK (pais IN ('UY','MX','CO','AR','CL','BR')),
  categoria text NOT NULL,
  precio_estimado numeric(12,2) NOT NULL CHECK (precio_estimado >= 0),
  moneda text NOT NULL,
  margen integer NOT NULL CHECK (margen BETWEEN 0 AND 100),
  saturacion text NOT NULL CHECK (saturacion IN ('baja','media','alta')),
  viralidad integer NOT NULL CHECK (viralidad BETWEEN 0 AND 100),
  crecimiento_7d integer NOT NULL DEFAULT 0,
  fuentes text[] NOT NULL DEFAULT '{}' CHECK (fuentes <@ ARRAY['tiktok','instagram','mercadolibre','google']::text[]),
  imagen_url text,
  analisis_ia jsonb,
  palabras_clave text[] NOT NULL DEFAULT '{}',
  anuncios_activos integer NOT NULL DEFAULT 0,
  competidores integer NOT NULL DEFAULT 0,
  interes_semanal integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro users and admins can read all products" ON public.products
  FOR SELECT TO authenticated USING (public.has_full_access(auth.uid()));
CREATE POLICY "Admins can add products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can edit products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER products_touch_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Dashboard feed: Pro/admin get everything; Free gets the top 3 of their country, without AI analysis.
CREATE OR REPLACE FUNCTION public.get_dashboard_products()
RETURNS SETOF public.products LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _pais text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión' USING ERRCODE = '42501';
  END IF;
  IF public.has_full_access(_uid) THEN
    RETURN QUERY SELECT * FROM public.products ORDER BY viralidad DESC;
    RETURN;
  END IF;
  SELECT pais INTO _pais FROM public.profiles WHERE id = _uid;
  IF _pais IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.id, p.slug, p.nombre, p.pais, p.categoria, p.precio_estimado, p.moneda, p.margen,
           p.saturacion, p.viralidad, p.crecimiento_7d, p.fuentes, p.imagen_url,
           NULL::jsonb AS analisis_ia,
           p.palabras_clave, p.anuncios_activos, p.competidores, p.interes_semanal,
           p.created_at, p.updated_at
    FROM public.products p
    WHERE p.pais = _pais
    ORDER BY p.viralidad DESC
    LIMIT 3;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_products() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_products() TO authenticated;

-- Free users pick their single country once; Pro/admin can change freely.
CREATE OR REPLACE FUNCTION public.set_my_country(_pais text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _current text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión' USING ERRCODE = '42501';
  END IF;
  IF _pais NOT IN ('UY','MX','CO','AR','CL','BR') THEN
    RAISE EXCEPTION 'País no válido';
  END IF;
  SELECT pais INTO _current FROM public.profiles WHERE id = _uid;
  IF _current IS NOT NULL AND _current <> _pais AND NOT public.has_full_access(_uid) THEN
    RAISE EXCEPTION 'El Plan Gratuito incluye un solo país. Mejora a Pro para cambiarlo.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET pais = _pais WHERE id = _uid;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_my_country(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_country(text) TO authenticated;

-- Public landing preview: top 3 overall, commercial columns only (no AI analysis).
CREATE OR REPLACE FUNCTION public.get_landing_preview()
RETURNS TABLE (
  slug text, nombre text, pais text, categoria text, precio_estimado numeric, moneda text,
  margen integer, saturacion text, viralidad integer, imagen_url text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slug, nombre, pais, categoria, precio_estimado, moneda, margen, saturacion, viralidad, imagen_url
  FROM public.products ORDER BY viralidad DESC LIMIT 3
$$;
GRANT EXECUTE ON FUNCTION public.get_landing_preview() TO anon, authenticated;

-- ===== Seed: current demo products =====
INSERT INTO public.products
  (slug, nombre, pais, categoria, precio_estimado, moneda, margen, saturacion, viralidad, crecimiento_7d,
   fuentes, imagen_url, analisis_ia, palabras_clave, anuncios_activos, competidores, interes_semanal)
VALUES
('mini-proyector', 'Mini Proyector Portátil HD 4K', 'UY', 'Electrónica', 3290, 'UYU', 65, 'media', 94, 48, ARRAY['tiktok','mercadolibre']::text[], '/products/mini-proyector.jpg', '{"resumen":"En Uruguay el formato “cine en el dormitorio” explotó en TikTok con videos de unboxing nocturno. La oferta local en Mercado Libre todavía es corta y con plazos de envío largos, lo que deja espacio para un vendedor con stock propio.","puntos":["Ticket medio alto con margen superior al 60%.","Pocos competidores con envío en 24 h en Montevideo.","Contenido UGC muy fácil de replicar: proyección en techo o pared."]}'::jsonb, ARRAY['proyector','cine en casa','netflix','android']::text[], 214, 38, ARRAY[19,13,18,24,20,19,31,40,42,55,78,94]::integer[]),
('corrector-postura', 'Corrector de Postura Inteligente con Sensor', 'MX', 'Salud', 549, 'MXN', 70, 'alta', 89, 31, ARRAY['tiktok','instagram']::text[], '/products/corrector-postura.jpg', '{"resumen":"El home office sigue fuerte en CDMX, Monterrey y Guadalajara. Los Reels de fisioterapeutas mostrando el antes/después generan alto engagement y el sensor de vibración lo diferencia de los correctores tradicionales.","puntos":["Problema doloroso y cotidiano: dolor de espalda por escritorio.","El sensor permite posicionarlo como producto ‘tech’ premium.","Funciona muy bien con creadores de salud y bienestar."]}'::jsonb, ARRAY['postura','espalda','home office','sensor']::text[], 342, 71, ARRAY[19,28,28,25,35,46,46,50,64,75,76,89]::integer[]),
('botella-termica', 'Botella Térmica con Display LED de Temperatura', 'CO', 'Hogar', 69900, 'COP', 70, 'media', 81, 18, ARRAY['instagram','mercadolibre','google']::text[], '/products/botella-termica.jpg', '{"resumen":"En Colombia la búsqueda de “termo inteligente” crece de forma sostenida en Google y aparece en el top de regalos corporativos. Es un producto de búsqueda activa, no solo de impulso.","puntos":["Demanda estable todo el año, con picos en temporada de regalos.","Ideal para personalizar con logo y vender a empresas.","Bajo índice de devoluciones."]}'::jsonb, ARRAY['termo','botella','regalo','oficina']::text[], 128, 54, ARRAY[48,44,48,58,58,54,62,70,67,66,76,81]::integer[]),
('lampara-luna', 'Lámpara Luna 3D Levitante', 'UY', 'Decoración', 2490, 'UYU', 67, 'baja', 77, 22, ARRAY['tiktok','instagram']::text[], '/products/lampara-luna.jpg', '{"resumen":"Un producto altamente visual que funciona solo en video: la luna flotando genera el efecto ‘wow’ en los primeros 2 segundos. En Uruguay casi no hay vendedores con stock, la mayoría importa a pedido.","puntos":["Excelente para campañas de regalos (Día de la Madre, Navidad).","Muy poca competencia local.","Precio percibido mucho mayor que el costo."]}'::jsonb, ARRAY['lámpara','luna','decoración','regalo']::text[], 96, 19, ARRAY[17,26,30,25,30,42,45,44,54,67,69,77]::integer[]),
('masajeador-facial', 'Masajeador Facial Gua Sha Eléctrico', 'MX', 'Belleza', 459, 'MXN', 74, 'alta', 92, 41, ARRAY['tiktok','instagram','google']::text[], '/products/masajeador-facial.jpg', '{"resumen":"El skincare es la categoría más viral de TikTok México. La versión eléctrica del gua sha combina una tendencia ya conocida con un upgrade tecnológico, ideal para rutinas ‘get ready with me’.","puntos":["Fuerte en 3 plataformas a la vez: señal de demanda real.","Margen cercano al 74%.","Público femenino 18–34 muy activo en compras online."]}'::jsonb, ARRAY['gua sha','skincare','facial','cuarzo rosa']::text[], 418, 63, ARRAY[23,17,14,21,25,21,25,40,47,52,72,92]::integer[]),
('cepillo-alisador', 'Cepillo Alisador Iónico Cerámico', 'CO', 'Belleza', 119900, 'COP', 68, 'media', 87, 27, ARRAY['tiktok','mercadolibre']::text[], '/products/cepillo-alisador.jpg', '{"resumen":"El clima húmedo de Barranquilla, Cali y Medellín hace del frizz un problema diario. Los videos de transformación en 5 minutos tienen altísima retención y el producto ya está validado en los más vendidos de Mercado Libre.","puntos":["Resultado visible en video en segundos.","Validado en ventas reales de Mercado Libre Colombia.","Ahorra tiempo frente a la plancha tradicional."]}'::jsonb, ARRAY['alisador','cabello','plancha','iónico']::text[], 265, 47, ARRAY[17,23,31,29,30,43,51,50,58,73,80,87]::integer[]),
('organizador-maquillaje', 'Organizador de Maquillaje Giratorio 360°', 'AR', 'Belleza', 38900, 'ARS', 70, 'media', 73, 12, ARRAY['instagram','mercadolibre']::text[], '/products/organizador-maquillaje.jpg', '{"resumen":"En Argentina los Reels de ‘organización estética’ del tocador tienen un público fiel. El producto gira bien en Mercado Libre con buena reputación, aunque la competencia empieza a crecer.","puntos":["Compra recurrente para regalo.","Fácil de fotografiar y mostrar lleno.","Conviene diferenciarse con packs o colores exclusivos."]}'::jsonb, ARRAY['organizador','maquillaje','tocador','acrílico']::text[], 74, 41, ARRAY[45,45,41,48,56,53,51,61,66,61,63,73]::integer[]),
('comedero-automatico', 'Comedero Automático con Cámara para Mascotas', 'CL', 'Mascotas', 89990, 'CLP', 62, 'baja', 68, 9, ARRAY['google','mercadolibre']::text[], '/products/comedero-automatico.jpg', '{"resumen":"Chile tiene una de las tasas de tenencia de mascotas más altas de la región y un consumidor dispuesto a pagar por tecnología. Es un producto de búsqueda en Google más que de impulso en redes.","puntos":["Ticket alto y cliente leal.","Ideal para campañas en Google Shopping.","Oportunidad de venta cruzada con accesorios."]}'::jsonb, ARRAY['comedero','mascotas','perro','gato','wifi']::text[], 52, 22, ARRAY[34,37,47,47,42,49,57,54,52,61,67,68]::integer[]),
('licuadora-portatil', 'Licuadora Portátil USB Recargable', 'BR', 'Cocina', 149, 'BRL', 72, 'alta', 84, 25, ARRAY['tiktok','instagram','google']::text[], '/products/licuadora-portatil.jpg', '{"resumen":"El público fitness brasileño adoptó la licuadora portátil como accesorio de gimnasio. El volumen es enorme, aunque la competencia también: hay que entrar con buen creativo y precio agresivo.","puntos":["Mercado más grande de la región.","Tendencia fitness y vida saludable en alza.","Alta competencia: diferenciar con bundles."]}'::jsonb, ARRAY['licuadora','smoothie','fitness','usb']::text[], 389, 88, ARRAY[24,27,23,27,39,42,41,51,64,67,70,84]::integer[]),
('quitapelusas', 'Rodillo Quitapelusas Reutilizable para Mascotas', 'UY', 'Mascotas', 890, 'UYU', 76, 'baja', 79, 19, ARRAY['tiktok','mercadolibre','google']::text[], '/products/quitapelusas.jpg', '{"resumen":"Los videos ‘satisfying’ de quitar pelo de perro del sillón tienen millones de vistas. En Uruguay es un producto barato, de compra impulsiva y con muy buena reputación en Mercado Libre.","puntos":["Precio bajo: conversión rápida sin mucha fricción.","Contenido satisfactorio que se comparte solo.","Margen superior al 75%."]}'::jsonb, ARRAY['pelos','mascotas','sillón','limpieza']::text[], 118, 26, ARRAY[21,18,28,33,30,35,48,52,52,62,76,79]::integer[]),
('auriculares-oseos', 'Auriculares de Conducción Ósea Deportivos', 'MX', 'Deportes', 899, 'MXN', 66, 'baja', 71, 14, ARRAY['google','mercadolibre']::text[], '/products/auriculares-oseos.jpg', '{"resumen":"Corredores y ciclistas mexicanos buscan escuchar música sin perder el sonido del tráfico. La categoría crece de forma constante en Google y Mercado Libre, con clientes que comparan antes de comprar.","puntos":["Nicho con cliente informado y fiel.","Funciona con alianzas con clubes de running.","Buena reseña = ventas sostenidas."]}'::jsonb, ARRAY['auriculares','running','ciclismo','bluetooth']::text[], 88, 34, ARRAY[39,47,43,42,51,56,51,54,64,65,60,71]::integer[]),
('tira-led', 'Tira LED RGB con App y Control por Voz', 'CO', 'Gaming', 59900, 'COP', 73, 'alta', 86, 33, ARRAY['tiktok','google']::text[], '/products/tira-led.jpg', '{"resumen":"Los ‘room tours’ y setups gamer son tendencia entre adolescentes colombianos. La tira LED es la puerta de entrada más barata para transformar una habitación y luce espectacular en video.","puntos":["Ticket accesible para público joven.","Muy compartible: transformación de habitación.","Ideal para upsell de kits y paneles hexagonales."]}'::jsonb, ARRAY['led','rgb','setup','gamer','habitación']::text[], 301, 59, ARRAY[20,13,18,24,20,19,30,38,40,50,72,86]::integer[]);