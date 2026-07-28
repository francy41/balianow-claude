-- BailaNow · CRÍTICO para el lanzamiento: permitir el rol 'partner'.
-- El rol de profiles es un enum `user_role`. Sin esto, aprobar un partner falla
-- (el UPDATE profiles SET role='partner' viola el enum) y nadie puede ser partner.
--
-- ⚠️ Ejecutar ESTE archivo SOLO/aparte (no dentro de MASTER-setup.sql):
--    'ALTER TYPE ... ADD VALUE' no puede ejecutarse dentro de una transacción
--    junto a otras sentencias. Pégalo solo en el SQL Editor y pulsa Run.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'partner';

-- Si tu columna profiles.role fuese TEXT con CHECK (y no un enum), usa en su lugar:
--   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
--   ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
--     CHECK (role IN ('user','artist','dj','dancer','venue','instructor','business','promoter','partner','admin','superadmin'));
