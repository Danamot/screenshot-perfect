CREATE UNIQUE INDEX IF NOT EXISTS products_nombre_pais_unique
  ON public.products (lower(btrim(nombre)), pais);