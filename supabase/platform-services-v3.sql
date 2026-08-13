-- BailaNow · Comprar servicios v3: vídeo de muestra por servicio (subido o enlace,
-- p.ej. YouTube). Aditivo sobre platform-services-v2.sql. Ejecutar una vez.

alter table public.platform_services add column if not exists sample_video_url text;
