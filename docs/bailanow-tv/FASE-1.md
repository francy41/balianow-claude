# BailaNow TV · Fase 1 — vídeo real

Convierte el módulo de TV de maqueta en plataforma: los vídeos se alojan en
Cloudflare Stream, se suben desde el estudio del creador y solo se reproducen
con una firma que caduca.

## Qué resuelve

**Antes:** las lecciones guardaban una URL de vídeo en texto plano. Cualquiera
podía abrir el inspector, copiar el enlace y repartirlo. El contenido de pago
se filtraba el primer día.

**Ahora:** la lección guarda un identificador de Cloudflare que por sí solo no
reproduce nada. Para ver el vídeo hay que pedir una firma a `tv-playback`, que
la emite únicamente tras comprobar la suscripción, y que caduca en dos horas.

## Piezas

| Pieza | Qué hace |
|---|---|
| `supabase/functions/tv-upload` | Pide a Cloudflare una URL de subida de un solo uso |
| `supabase/functions/tv-playback` | Comprueba el acceso y firma la reproducción |
| `supabase/tv-fase1-cloudflare-stream.sql` | Columnas, vista pública y RLS |
| `src/tv/TVCreatorPage.tsx` | Subida con barra de progreso |
| `src/tv/TVTitlePage.tsx` | Reproductor que pide la firma |

El vídeo va **del navegador del creador a Cloudflare directamente**, sin pasar
por el backend. Subir 500 MB a través de una Edge Function sería lento, caro y
se saldría de sus límites.

## Puesta en marcha

### 1. Activar Cloudflare Stream

Panel de Cloudflare → **Stream** → activar. Es de pago por uso: unos 5 $ por
cada 1.000 minutos almacenados y 1 $ por cada 1.000 minutos vistos.

### 2. Crear un token de API

Cloudflare → **Mi perfil** → **Tokens de API** → **Crear token** →
*Crear token personalizado*.

- Permiso: **Cuenta · Cloudflare Stream · Editar**
- Recursos: la cuenta de BailaNow

Copia el token y el **ID de cuenta** (aparece en la barra lateral del panel).

### 3. Guardar los secretos en Supabase

En *Edge Functions → Secrets*:

- `CF_ACCOUNT_ID` — el ID de cuenta
- `CF_STREAM_TOKEN` — el token recién creado

### 4. Ejecutar el SQL

`supabase/tv-fase1-cloudflare-stream.sql` en el SQL Editor.

### 5. Desplegar las dos funciones

Edge Functions → *Deploy a new function* → **Via Editor**, con el nombre
`tv-upload` y luego `tv-playback`, pegando cada `index.ts`.

## Comprobar que funciona

1. Entrar en `/tv/estudio` y crear un título.
2. Añadir una clase, ponerle nombre y subir un vídeo corto.
3. Esperar a que Cloudflare lo procese (unos minutos para un vídeo breve).
4. Abrir la clase en `/tv/:id`.

Mientras se procesa, el reproductor dice *"El vídeo se está procesando"*. No
hace falta ninguna tarea de fondo: `tv-playback` consulta el estado a Cloudflare
la primera vez que alguien pide la lección y lo corrige solo.

## Compatibilidad

Las lecciones con `video_url` externa (mp4, YouTube) siguen funcionando igual.
El campo se conserva y el estudio permite pegar una URL como alternativa. La
firma solo se aplica a los vídeos alojados en Cloudflare.

## Lo que esta fase NO incluye

- Registro de minutos vistos (`watch_events`) y regalías a creadores
- Stripe Connect para pagar a los creadores
- Descarga para ver sin conexión
- DRM, más allá de las URLs firmadas

Está en `docs/bailanow-tv/ARCHITECTURE.md` como fases 2 y 3.
