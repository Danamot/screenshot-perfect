-- Fotos de producto: cualquier usuario con sesión activa puede verlas.
create policy "producto_fotos_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'producto-fotos');

-- Solo administradores suben fotos nuevas.
create policy "producto_fotos_insert_admin"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'producto-fotos' and public.has_role(auth.uid(), 'admin'));

-- Solo administradores reemplazan una foto existente.
create policy "producto_fotos_update_admin"
on storage.objects
for update
to authenticated
using (bucket_id = 'producto-fotos' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'producto-fotos' and public.has_role(auth.uid(), 'admin'));

-- Solo administradores borran fotos.
create policy "producto_fotos_delete_admin"
on storage.objects
for delete
to authenticated
using (bucket_id = 'producto-fotos' and public.has_role(auth.uid(), 'admin'));