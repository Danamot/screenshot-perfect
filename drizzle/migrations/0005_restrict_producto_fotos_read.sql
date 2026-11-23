CREATE OR REPLACE FUNCTION public.can_view_product_photo(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _pais text;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF public.has_full_access(_uid) THEN RETURN true; END IF;
  SELECT pais INTO _pais FROM public.profiles WHERE id = _uid;
  IF _pais IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.products p WHERE p.pais = _pais AND p.imagen_url = 'producto-fotos/' || _name);
END $$;
REVOKE ALL ON FUNCTION public.can_view_product_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_product_photo(text) TO authenticated;
DROP POLICY IF EXISTS producto_fotos_select ON storage.objects;
CREATE POLICY producto_fotos_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'producto-fotos' AND public.can_view_product_photo(name));