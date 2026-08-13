-- BailaNow · Comprar servicios v2: imágenes de muestra (admin), solicitud del
-- comprador (descripción, enlace y fotos de referencia) y servicio "Reserva
-- una llamada". Aditivo sobre platform-services.sql. Ejecutar una vez.

alter table public.platform_services add column if not exists sample_images jsonb not null default '[]'::jsonb;

alter table public.service_orders add column if not exists request_description text;
alter table public.service_orders add column if not exists reference_link text;
alter table public.service_orders add column if not exists reference_images jsonb not null default '[]'::jsonb;

-- Permite a cualquier usuario autenticado subir SOLO dentro de
-- media/service-requests/ (sus fotos de referencia al pedir un servicio).
-- El resto del bucket 'media' sigue siendo solo-admin.
drop policy if exists media_authenticated_write_requests on storage.objects;
create policy media_authenticated_write_requests on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated' and (storage.foldername(name))[1] = 'service-requests');

insert into public.platform_services (name, description, price, icon, category, sort) values
  ('Reserva una llamada para más información', 'Agenda una llamada gratuita con nuestro equipo para resolver tus dudas.', 0, '📞', 'contacto', 6)
on conflict (name) do nothing;
