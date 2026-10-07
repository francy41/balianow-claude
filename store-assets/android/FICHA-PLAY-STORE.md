# Ficha de Google Play — BailaNow

Todo lo que pide Play Console, listo para copiar y pegar. Auditado contra el
código real: lo que dice el cuestionario de datos es lo que la aplicación hace.

---

## 1. Datos básicos

| Campo | Valor |
|---|---|
| Nombre de la app | `BailaNow` |
| Nombre del paquete | `com.bailanow.app` |
| Categoría | **Estilo de vida** *(alternativa: Entretenimiento)* |
| Etiquetas | Baile · Eventos · Comunidad · Música · Local |
| Correo de contacto | `hola@bailanow.com` |
| Sitio web | `https://bailanow.com` |
| Política de privacidad | `https://bailanow.com/legal/privacidad` |

---

## 2. Descripción corta

Máximo 80 caracteres. Es lo que se ve en los listados, antes de entrar.

```
Eventos, locales, clases y pareja de baile latino en tu ciudad.
```

*(62 caracteres)*

---

## 3. Descripción larga

Máximo 4.000 caracteres.

```
Todo el baile latino de tu ciudad, en un solo sitio.

BailaNow reúne lo que hasta ahora estaba repartido entre diez grupos de
WhatsApp, carteles de Instagram y el boca a boca: dónde se baila esta noche,
qué eventos vienen, quién da clases y quién busca pareja para practicar.

QUÉ ENCUENTRAS

• Locales y discotecas latinas, con horarios y lo que suena en cada uno
• Eventos, sociales, festivales y talleres, con fechas y entradas
• Clases presenciales y online, por estilo y nivel
• Artistas, DJs, músicos y bailarines para contratar
• Planes de baile: quedadas abiertas a las que apuntarte
• Pareja de baile: encuentra con quién practicar cerca de ti

CERCA DE TI
Activa la ubicación y verás lo que tienes al lado, ordenado por distancia
real. Sin ubicación también funciona: filtra por ciudad.

BAILANOW TV Y RADIO
Vídeos, entrevistas y tutoriales del mundo del baile. Y radio latina en
directo mientras usas la aplicación.

PARA QUIEN VIVE DEL BAILE
Si eres profesor, DJ, artista o tienes un local, puedes crear tu perfil,
publicar tus clases y eventos, recibir reservas y cobrar online. Si ya
existe tu perfil en BailaNow, puedes reclamarlo y pasar a gestionarlo tú.

ESTILOS
Salsa, bachata, kizomba, merengue, son, cha-cha-chá, zouk, reggaetón y más.

BailaNow es gratis. Hay funciones de pago opcionales para quien quiera
destacar su perfil o vender sus servicios.

Escríbenos a hola@bailanow.com si echas algo en falta.
```

---

## 4. Seguridad de los datos

El cuestionario largo de Google. Esto es lo que la aplicación hace de verdad,
verificado en el código. **Mentir aquí es causa de retirada**, y Google lo
contrasta con lo que ve en la revisión.

### Lo general

| Pregunta | Respuesta |
|---|---|
| ¿Se recopilan datos? | **Sí** |
| ¿Se cifran en tránsito? | **Sí** (HTTPS en todo) |
| ¿Se pueden solicitar la eliminación? | **Sí** → `hola@bailanow.com` |
| ¿Hay datos compartidos con terceros? | **Sí** (pasarelas de pago y analítica) |

### Qué se recopila

| Tipo | Se recoge | Se comparte | Obligatorio | Para qué |
|---|---|---|---|---|
| Nombre | Sí | No | Sí | Funciones de la app |
| Correo electrónico | Sí | No | Sí | Cuenta, avisos |
| Teléfono | Sí | No | No | Contacto entre usuarios |
| Foto de perfil | Sí | No | No | Funciones de la app |
| Ciudad y país | Sí | No | No | Personalización |
| Ubicación aproximada | Sí | No | No | Buscar cerca de ti |
| Fotos y vídeos | Sí | No | No | Perfiles y contenido |
| Grabaciones de audio | Sí | No | No | Directos y vídeos |
| Historial de compras | Sí | Sí | No | Pagos |
| Información de pago | **No** | — | — | *La gestionan Stripe y PayPal; la app nunca ve la tarjeta* |
| Identificadores de dispositivo | Sí | Sí | No | Analítica |
| Fallos y rendimiento | Sí | Sí | No | Diagnóstico |

### Terceros implicados

- **Supabase** — base de datos y autenticación
- **Stripe** y **PayPal** — cobros *(la tarjeta no pasa por la app)*
- **Google Analytics** — uso agregado *(solo si `VITE_GA_ID` está configurado)*
- **Sentry** — errores
- **Resend** — correos transaccionales

---

## 5. Permisos: por qué los pide

Google pregunta esto y compara con lo que ve al revisar.

| Permiso | Justificación |
|---|---|
| `INTERNET` | Cargar eventos, locales y perfiles |
| `CAMERA` | Grabar vídeos de baile y emitir en directo. **Solo al pulsar grabar** |
| `RECORD_AUDIO` | Audio de esos mismos vídeos y directos |
| `MODIFY_AUDIO_SETTINGS` | Ajustar el volumen de la radio y los directos |
| Ubicación | Mostrar lo que hay cerca. **Opcional**: sin ella se filtra por ciudad |

---

## 6. Clasificación por edades

| Pregunta | Respuesta |
|---|---|
| Violencia, sangre, terror | No |
| Contenido sexual | No |
| Lenguaje soez | No |
| Drogas, tabaco | No |
| **Alcohol** | **Sí** — se listan discotecas y bares donde se sirve |
| Juegos de azar | No |
| **Compras dentro de la app** | **Sí** |
| **Los usuarios interactúan entre sí** | **Sí** — comunidad, planes, pareja de baile |
| **Se comparte la ubicación** | **Sí** — opcional, entre usuarios de planes |
| **Contenido generado por usuarios** | **Sí** — con moderación |

Clasificación esperada: **PEGI 12** o **mayores de 13**.

Los términos ya exigen 18 años (`/legal/terminos`) y la política dice que la
app no va dirigida a menores (`/legal/privacidad`). Declara **"No dirigida a
niños"** en Público objetivo.

---

## 7. Lo que falta antes de enviar

- [ ] Capturas de pantalla — mínimo 2, mejor 5-8 *(ver `README.md`)*
- [ ] Icono 512×512 — **hecho**, `icono-512.png`
- [ ] Cabecera 1024×500 — **hecho**, `cabecera-1024x500.png`
- [ ] El `.aab` firmado — bloqueado por la contraseña del keystore
- [ ] Cuenta de Play Console aprobada
- [ ] **Decidir qué pasa con los pagos** *(ver abajo)*

---

## 8. El riesgo serio: los pagos

Google exige **su propia facturación** para todo lo que sea contenido o
funciones digitales que se consumen dentro de la app, y se queda entre el 15% y
el 30%. Solo se permite cobro externo cuando lo vendido se consume **fuera**
de la aplicación.

BailaNow mezcla los dos casos:

| Qué se vende | Dónde se consume | Veredicto |
|---|---|---|
| Suscripción premium | Dentro | **Facturación de Google** |
| Cursos y clases online | Dentro | **Facturación de Google** |
| Entradas a eventos presenciales | Fuera | Stripe o PayPal, permitido |
| Reservas en locales | Fuera | Stripe o PayPal, permitido |
| Contratar a un artista | Fuera | Stripe o PayPal, permitido |
| Donaciones a creadores | Zona gris | Depende de cómo se presente |

**Es el motivo de rechazo más común en aplicaciones como esta.** Conviene
resolverlo antes de enviar a revisión, no después.

Lo razonable: en la primera versión, dejar fuera de la app lo que obligue a
pasar por la facturación de Google, y publicar solo la parte de eventos,
locales y artistas, que es la mayor y la que no tiene conflicto.
