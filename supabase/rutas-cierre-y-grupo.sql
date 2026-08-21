-- Planes para bailar: fecha de fin (cierre automático), cierre manual del
-- creador, y locales verificados de la plataforma como parada. Aditivo sobre
-- rutas-schema.sql y ruta-comments.sql. Ejecutar una vez.

alter table public.rutas add column if not exists end_date date;
alter table public.rutas add column if not exists status text not null default 'open';

create index if not exists rutas_status_end_date_idx on public.rutas (status, end_date);

-- La política rutas_write (creador o admin) ya cubierta en rutas-schema.sql
-- permite UPDATE de status por el creador — no hace falta política nueva.
