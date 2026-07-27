# Conectar las redes a la bandeja del partner con GoHighLevel (GHL)

La vía **más fácil**: GHL ya trae inbox unificado (Instagram, Facebook, WhatsApp,
SMS, Email). Aquí solo lo enchufamos a la bandeja del partner de BailaNow.

Dos Edge Functions:

| Función | Dirección | Qué hace |
|---|---|---|
| `ghl-inbound` | Entrada | Recibe los mensajes de GHL y los mete en la bandeja |
| `ghl-send` | Salida | Envía la respuesta del partner de vuelta por GHL |

---

## Paso 0 · Base de datos
Ejecuta `supabase/MASTER-setup.sql` (incluye el bloque de GHL: añade
`partners.ghl_location_id`).

## Paso 1 · Una "location" de GHL por partner
Lo más limpio es una **sub-cuenta (location) de GHL por partner/ciudad**, con sus
redes conectadas dentro de GHL (Settings → Integrations).
Copia el **Location ID** de cada partner.

## Paso 2 · Pega el Location ID en BailaNow
Panel superadmin → **Partners de ciudad → Partners** → en la tarjeta del partner,
campo **"GHL Location ID"** → pega y **Guarda**. (Sin SQL.)

## Paso 3 · Desplegar las funciones
```bash
supabase functions deploy ghl-inbound --no-verify-jwt   # GHL no manda JWT de Supabase
supabase functions deploy ghl-send                      # esta valida al partner
supabase secrets set GHL_WEBHOOK_SECRET="un-texto-secreto-tuyo"
```

## Paso 4 · Workflow de ENTRADA en GHL
En cada location (o en una plantilla de agencia):
1. **Automation → Workflows → Create**.
2. Trigger: **"Customer Replied"** (mensaje entrante).
3. Acción: **Webhook** →
   - Método: `POST`
   - URL: `https://<project>.supabase.co/functions/v1/ghl-inbound?key=<GHL_WEBHOOK_SECRET>`
4. Guarda y publica.

El webhook es tolerante con el formato: lee `locationId`, el texto del mensaje,
`contactId`, el canal y el nombre del contacto aunque vengan con nombres distintos.
Si quieres control total, en la acción Webhook usa **Custom Data** con estas claves:
`locationId`, `message`, `contactId`, `channel`, `full_name`.

## Paso 5 · SALIDA (responder desde el panel) — opcional
Para que la respuesta del partner salga por GHL, guarda el **token de la API de GHL**
de ese partner (una vez):
```sql
insert into public.partner_social_tokens (partner_id, provider, access_token)
values ('<uuid-del-partner>', 'ghl', '<GHL_LOCATION_API_TOKEN>')
on conflict (partner_id, provider) do update
  set access_token = excluded.access_token, updated_at = now();
```
El panel llama a `ghl-send`, que usa la **Conversations API** de GHL para entregar el
mensaje por el canal correcto (IG/FB/WhatsApp/SMS/Email). Si no hay token, la
respuesta se guarda igual y el partner ve un aviso.

---

## Flujo
- **Entrada:** cliente escribe por IG/FB/WhatsApp → GHL → Workflow → `ghl-inbound`
  → busca el partner por `ghl_location_id` → cae en su **Bandeja** con la etiqueta del canal.
- **Salida:** el partner responde en su panel → se guarda → `ghl-send` lo entrega por GHL.

## ¿Muchos partners? (coste)
GHL cobra por sub-cuenta. Si vas a tener decenas de ciudades y se te dispara,
puedes cambiar el conector de entrada/salida a **Unipile** o **Meta directo**
(`social-webhook`/`social-send`, ya en el repo) **sin tocar la bandeja ni la UI**.
