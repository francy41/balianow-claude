# Integración de redes sociales en la bandeja del partner

Con esto, los DMs de **Instagram, Facebook Messenger y WhatsApp** entran de verdad
en la bandeja del partner (`partner_inquiries`), y las respuestas del partner
salen de vuelta a esas redes.

Dos Edge Functions:

| Función | Dirección | Qué hace |
|---|---|---|
| `social-webhook` | Entrada | Recibe los mensajes de Meta y los deposita en la bandeja |
| `social-send` | Salida | Envía la respuesta del partner de vuelta a la red |

---

## Paso 0 · Base de datos

Ejecuta `supabase/MASTER-setup.sql` (incluye el bloque 5, "Enrutado de redes").
Crea la columna `account_id` en `partner_social_connections` y la tabla
**segura** `partner_social_tokens` (solo accesible por las Edge Functions).

## Paso 1 · App de Meta

1. Crea una app en <https://developers.facebook.com> (tipo *Business*).
2. Añade los productos que uses: **Messenger**, **Instagram** y/o **WhatsApp**.
3. Apunta el **App Secret** (Configuración → Básico).

## Paso 2 · Desplegar las funciones

```bash
# desde la raíz del repo, con la CLI de Supabase logueada
supabase functions deploy social-webhook --no-verify-jwt   # Meta no manda JWT
supabase functions deploy social-send                       # esta sí valida al partner
```

## Paso 3 · Secrets (variables de entorno)

```bash
supabase secrets set META_VERIFY_TOKEN="un-texto-secreto-tuyo"
supabase secrets set META_APP_SECRET="el-app-secret-de-meta"
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_ANON_KEY ya vienen inyectadas
```

## Paso 4 · Configurar el Webhook en Meta

En tu app de Meta → **Webhooks**:

- **Callback URL:** `https://<project>.supabase.co/functions/v1/social-webhook`
- **Verify Token:** el mismo valor que pusiste en `META_VERIFY_TOKEN`
- Suscríbete a los campos:
  - Messenger: `messages`
  - Instagram: `messages`
  - WhatsApp: `messages`

Meta hará un `GET` de verificación; la función responde al *challenge* automáticamente.

## Paso 5 · Conectar la cuenta de cada partner

Para saber **a qué partner** pertenece cada mensaje, y para poder responder, hay
que guardar dos cosas por partner y red:

1. **`account_id`** en `partner_social_connections` — el identificador que Meta envía
   en el webhook:
   - Facebook: el **Page ID**
   - Instagram: el **Instagram account ID** (el `recipient.id` del webhook)
   - WhatsApp: el **Phone Number ID**

2. **El token** en `partner_social_tokens` (tabla segura):

```sql
-- Ejemplo (ejecútalo en el SQL Editor con tu partner real):
update public.partner_social_connections
  set account_id = '<PAGE_O_IG_O_PHONE_NUMBER_ID>'
  where partner_id = '<uuid-del-partner>' and provider = 'instagram';

insert into public.partner_social_tokens (partner_id, provider, access_token, account_id, phone_number_id)
values ('<uuid-del-partner>', 'instagram', '<PAGE_ACCESS_TOKEN>', '<IG_ACCOUNT_ID>', null)
on conflict (partner_id, provider) do update
  set access_token = excluded.access_token,
      account_id = excluded.account_id,
      phone_number_id = excluded.phone_number_id,
      updated_at = now();
```

> Para WhatsApp, `access_token` es el token del WhatsApp Business y `phone_number_id`
> el ID del número. Para Messenger/Instagram, `access_token` es el **Page Access Token**.

## Cómo funciona el flujo

- **Entrada:** Meta → `social-webhook` → busca el partner por `account_id` →
  si ya hay una conversación abierta con ese contacto, añade el mensaje; si no,
  crea una nueva. Aparece en la pestaña **Bandeja** del partner con la etiqueta del canal.
- **Salida:** el partner responde en su panel → se guarda el mensaje y se llama a
  `social-send`, que usa el token del partner para entregarlo por la Graph API.
  Si aún no hay token configurado, la respuesta se guarda igual y el partner ve
  un aviso de que la entrega está pendiente de configurar.

## Notas de seguridad

- `partner_social_tokens` tiene RLS y **solo** es accesible por admin y por las
  Edge Functions (service_role). El navegador nunca ve los tokens.
- `social-webhook` valida la **firma** `X-Hub-Signature-256` con el App Secret.
- `social-send` exige que quien llama sea el **partner dueño** de la conversación
  (o un admin), verificando su JWT.
- Las ventanas de mensajería de Meta tienen límites (p. ej. 24h en Messenger/WhatsApp
  para mensajes de servicio); revisa las políticas de cada plataforma.
