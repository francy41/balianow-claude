import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Cookie, Building2, DollarSign, ShoppingBag, Users } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

type LegalType = 'terminos' | 'privacidad' | 'cookies' | 'aviso' | 'reembolsos' | 'vendedores' | 'conducta';

const LAST_UPDATE = 'Mayo 2026';
const COMPANY_FULL = 'BailaNow SL';
const COMPANY_EMAIL = 'legal@bailanow.com';
const PRIVACY_EMAIL = 'privacidad@bailanow.com';
const DPO_EMAIL = 'dpo@bailanow.com';
const SUPPORT_EMAIL = 'hola@bailanow.com';
const COMPANY_ADDRESS = 'Madrid, España';
const DOMAIN = 'bailanow.com';
const COMMISSION_DEFAULT = '15%';
const COMMISSION_PREMIUM = '8%';

interface Section { heading: string; body: string; subsections?: { title: string; text: string }[] }
interface LegalDoc { title: string; short: string; icon: React.ReactNode; intro?: string; sections: Section[] }

const CONTENT: Record<LegalType, LegalDoc> = {

  // ─────────────────────────────────────────────────────────────
  terminos: {
    title: 'Términos y Condiciones de Uso',
    short: 'Términos',
    icon: <FileText className="w-6 h-6 text-pink-500" />,
    intro: `Estos términos regulan el uso de la plataforma BailaNow (en adelante, "la Plataforma", "BailaNow", "nosotros"). Al registrarte o usar la Plataforma aceptas estos términos en su totalidad. Si no estás de acuerdo, no uses BailaNow.`,
    sections: [
      {
        heading: '1. Identificación del Titular (LSSI-CE)',
        body: `En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y Comercio Electrónico:\n\n• Titular: ${COMPANY_FULL}\n• Domicilio: ${COMPANY_ADDRESS}\n• Email: ${COMPANY_EMAIL}\n• Dominio: ${DOMAIN}\n• Inscrita en el Registro Mercantil correspondiente.`,
      },
      {
        heading: '2. Descripción del Servicio',
        body: `BailaNow es un marketplace y red social especializada en el ecosistema del baile latino. Conectamos:\n\n• Bailarines, DJs, instructores, artistas, cantantes y bandas (Profesionales)\n• Locales, escuelas, promotores y organizadores (Negocios)\n• Usuarios finales que buscan contratar servicios o asistir a eventos (Usuarios)\n\nBailaNow ofrece, entre otros: directorio de profesionales con perfiles públicos compartibles, sistema de reservas, marketplace de servicios con escrow, ticketing de eventos, transmisiones en vivo, chat entre usuarios, herramientas de promoción y publicación cross-platform.\n\nActuamos como intermediario tecnológico. No somos parte en los contratos celebrados entre usuarios y no respondemos por la prestación efectiva de los servicios contratados.`,
      },
      {
        heading: '3. Registro y Cuentas de Usuario',
        body: `Para usar funciones avanzadas debes registrarte. Al registrarte garantizas:\n\n• Tener al menos 18 años o ser mayor de edad en tu jurisdicción.\n• Que los datos proporcionados son veraces, exactos y actuales.\n• Que mantendrás tu información actualizada.\n• Que no usarás la cuenta de otra persona ni cederás la tuya.\n• Que eres responsable de mantener la confidencialidad de tu contraseña.\n• Que notificarás inmediatamente cualquier acceso no autorizado.\n\nNos reservamos el derecho de rechazar registros, suspender o cancelar cuentas que incumplan estos términos.`,
      },
      {
        heading: '4. Roles de Usuario',
        body: `BailaNow distingue varios roles, cada uno con permisos y obligaciones específicas:\n\n• Usuario estándar: navega, contrata servicios, asiste a eventos, sigue perfiles.\n• Profesional (artista/DJ/bailarín/instructor): publica perfil profesional, ofrece servicios, recibe reservas, emite lives.\n• Negocio (venue/promotor): publica locales, crea eventos, vende entradas.\n• Vendedor: publica servicios en el marketplace.\n• Administrador/SuperAdmin: gestión interna de la plataforma.`,
      },
      {
        heading: '5. Comisiones, Pagos y Comisión Plataforma',
        body: `Política comercial:\n\n• Crear cuenta y publicar perfil: gratis.\n• Comisión plataforma: ${COMMISSION_DEFAULT} sobre cada transacción procesada.\n• Comisión Premium: ${COMMISSION_PREMIUM} para usuarios con suscripción Premium activa.\n• Pasarelas de pago: Stripe y/o PayPal. Sus comisiones son aparte y las paga el vendedor.\n• Moneda principal: Euro (EUR). Próximamente más divisas.\n\nLos pagos se procesan en USD/EUR a través de proveedores certificados PCI-DSS. No almacenamos datos de tarjeta de crédito.\n\nFacturación: si necesitas factura, ponte en contacto con ${SUPPORT_EMAIL} indicando tu CIF/NIF y dirección fiscal.`,
      },
      {
        heading: '6. Sistema de Escrow (Depósito en Garantía)',
        body: `Para transacciones del marketplace y reservas de servicios:\n\n• El pago del comprador queda RETENIDO en escrow al confirmarse el pedido.\n• El vendedor recibe los fondos cuando el comprador confirma satisfacción O 14 días después de la fecha de servicio sin reclamación.\n• En caso de disputa, BailaNow actúa como árbitro neutral siguiendo el proceso descrito en la sección "Política de Reembolsos".\n• En caso de fraude evidente, el dinero se reintegra al comprador automáticamente.`,
      },
      {
        heading: '7. Reservas, Cancelaciones y Reembolsos',
        body: `Política aplicable según el tipo:\n\n• Reservas de servicios profesionales: cancelación gratis hasta 7 días antes. Entre 7 y 48h: 50% reembolso. Menos de 48h: sin reembolso salvo causa de fuerza mayor justificada.\n• Tickets de eventos: cancelación gratuita según política específica de cada evento, fijada por el organizador. Mostrada antes de la compra.\n• Suscripciones Premium: cancelables en cualquier momento; el periodo ya pagado se mantiene activo hasta su vencimiento.\n• Lives de pago: el comprador puede solicitar reembolso si el live no se celebra o el clip preview era engañoso.\n\nVer Política de Reembolsos completa en /legal/reembolsos.`,
      },
      {
        heading: '8. Transmisiones en Vivo (Lives) y Donaciones',
        body: `BailaNow ofrece transmisiones en vivo con cuatro modalidades:\n\n• Gratis: cualquier usuario autenticado puede entrar.\n• Pago único: entrada por importe fijo.\n• Reserva: aforo limitado con pago anticipado.\n• Donación: entrada libre con propinas voluntarias.\n\nClips preview de hasta 60 segundos del host antes de pagar. El host es responsable del contenido emitido y debe contar con los derechos de la música/material usado.\n\nDonaciones son voluntarias, no reembolsables salvo error técnico. El host recibe el ${COMMISSION_DEFAULT === '15%' ? '85%' : '92%'} del importe; la plataforma retiene ${COMMISSION_DEFAULT} (${COMMISSION_PREMIUM} para Premium).`,
      },
      {
        heading: '9. Conducta del Usuario y Contenido Prohibido',
        body: `Prohibido publicar o transmitir:\n\n• Contenido ilegal, amenazante, abusivo, difamatorio, obsceno, racista o discriminatorio.\n• Material protegido por copyright sin autorización.\n• Spam, publicidad no solicitada, esquemas piramidales.\n• Información falsa o engañosa sobre servicios o personas.\n• Datos personales de terceros sin consentimiento.\n• Material que incite al odio, violencia o autolesión.\n• Pornografía o desnudez explícita.\n• Información sobre menores de edad sin permiso parental.\n\nBailaNow se reserva el derecho a eliminar contenido, suspender lives en directo y cancelar cuentas sin previo aviso ante incumplimientos graves. Las decisiones son apelables a través de ${SUPPORT_EMAIL}.`,
      },
      {
        heading: '10. Propiedad Intelectual',
        body: `• El código, diseño, logos, marca BailaNow y todos los elementos de la Plataforma son propiedad de ${COMPANY_FULL} o terceros licenciantes.\n• El contenido publicado por usuarios (textos, imágenes, vídeos, lives) sigue siendo propiedad de su autor.\n• Al publicar contenido en BailaNow, concedes a la Plataforma una licencia mundial, no exclusiva, gratuita, sublicenciable y transferible para usar, reproducir, modificar, adaptar, traducir, publicar y distribuir dicho contenido en relación con el funcionamiento, promoción y mejora del Servicio.\n• Esta licencia termina cuando elimines el contenido o cierres tu cuenta, salvo contenidos compartidos o usados en backups por motivos técnicos.\n• Si crees que tu contenido ha sido infringido, contacta con ${COMPANY_EMAIL} con asunto "DMCA Notice" incluyendo prueba de titularidad.`,
      },
      {
        heading: '11. Limitación de Responsabilidad',
        body: `EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY:\n\n• La Plataforma se proporciona "TAL CUAL" y "SEGÚN DISPONIBILIDAD" sin garantías de ningún tipo.\n• BailaNow no garantiza que el servicio sea ininterrumpido, libre de errores o seguro.\n• BailaNow NO es responsable de la calidad, legalidad o cumplimiento de los servicios ofrecidos por terceros (profesionales, venues, vendedores).\n• La responsabilidad máxima agregada de BailaNow frente a cualquier reclamación se limita al importe total de las comisiones cobradas al usuario reclamante en los 6 meses anteriores al hecho que origina la reclamación, con un mínimo de 50€ y máximo de 1.000€.\n• En ningún caso responderemos por daños indirectos, lucro cesante, pérdida de datos o pérdida de oportunidad.\n\nNada en estos términos excluye responsabilidades que la ley no permita excluir (por ejemplo, dolo o negligencia grave).`,
      },
      {
        heading: '12. Indemnización',
        body: `Aceptas indemnizar y mantener indemne a BailaNow, sus directivos, empleados y agentes frente a cualquier reclamación, daño, pérdida, responsabilidad y gastos (incluidos honorarios legales razonables) que surjan de:\n\n• Tu uso de la Plataforma.\n• Tu incumplimiento de estos términos.\n• Tu infracción de derechos de terceros (incluyendo IP, privacidad).\n• Cualquier contenido que publiques.`,
      },
      {
        heading: '13. Suspensión y Cancelación',
        body: `Podemos suspender o cancelar tu cuenta cuando:\n\n• Incumplas estos términos o nuestras políticas.\n• Tu actividad ponga en riesgo la seguridad o estabilidad de la Plataforma.\n• Recibamos requerimiento legal.\n• Detectemos fraude o intento de manipulación.\n• Tu cuenta esté inactiva más de 24 meses (con aviso previo de 30 días).\n\nEn caso de cancelación: tendrás derecho a exportar tus datos (RGPD) durante 30 días y a recibir el saldo pendiente menos comisiones. Las transacciones en escrow se procesan normalmente.`,
      },
      {
        heading: '14. Resolución de Disputas',
        body: `Proceso:\n\n• Fase 1 — Negociación directa entre partes (chat interno BailaNow).\n• Fase 2 — Mediación BailaNow: nuestro equipo legal/soporte revisa pruebas en 5 días laborables.\n• Fase 3 — Resolución vinculante: BailaNow dictamina con base en términos, evidencias y normativa.\n• Fase 4 — Reclamación externa: si no estás de acuerdo, puedes acudir a la plataforma europea de Resolución de Litigios en Línea (ODR) en https://ec.europa.eu/consumers/odr o a los juzgados según sección 16.`,
      },
      {
        heading: '15. Modificaciones',
        body: `BailaNow puede actualizar estos términos. Las modificaciones sustanciales se notificarán con al menos 30 días de antelación por email y mediante banner en la Plataforma. El uso continuado tras la entrada en vigor implica aceptación. Si no estás de acuerdo puedes cerrar tu cuenta antes de esa fecha.`,
      },
      {
        heading: '16. Ley Aplicable y Jurisdicción',
        body: `Estos términos se rigen por la legislación española y, en lo aplicable, por el Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPDGDD) y la Ley 34/2002 (LSSI-CE).\n\nPara consumidores: jurisdicción del domicilio del consumidor según artículo 90.2 del TRLGDCU.\nPara empresas: jurisdicción exclusiva de los Juzgados y Tribunales de Madrid (España).`,
      },
      {
        heading: '17. Contacto',
        body: `• Legal: ${COMPANY_EMAIL}\n• Privacidad / RGPD: ${PRIVACY_EMAIL}\n• Soporte: ${SUPPORT_EMAIL}\n• DPO: ${DPO_EMAIL}\n• Dirección postal: ${COMPANY_FULL}, ${COMPANY_ADDRESS}`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  privacidad: {
    title: 'Política de Privacidad',
    short: 'Privacidad',
    icon: <Shield className="w-6 h-6 text-pink-500" />,
    intro: `Conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). En BailaNow respetamos tu privacidad y protegemos tus datos personales.`,
    sections: [
      {
        heading: '1. Responsable del Tratamiento',
        body: `${COMPANY_FULL}, con domicilio en ${COMPANY_ADDRESS}, es el responsable del tratamiento de tus datos personales.\n\nDelegado de Protección de Datos (DPO): ${DPO_EMAIL}\nContacto general privacidad: ${PRIVACY_EMAIL}`,
      },
      {
        heading: '2. Datos que Recopilamos',
        body: `Datos que recogemos directamente:\n\n• Identificación: nombre, email, teléfono (opcional), foto de perfil.\n• Perfil profesional: biografía, ciudad, estilos, géneros, tarifas, redes sociales.\n• Pago: datos procesados directamente por Stripe/PayPal. NO almacenamos números de tarjeta.\n• Geolocalización (con tu consentimiento): coordenadas GPS para mostrar contenido cercano.\n• Contenido generado: posts, imágenes, vídeos, lives, mensajes de chat.\n• Comunicaciones: mensajes con otros usuarios, soporte, valoraciones.\n\nDatos recogidos automáticamente:\n\n• Datos técnicos: IP, navegador, sistema operativo, idioma, zona horaria.\n• Datos de uso: páginas visitadas, clicks, tiempo en página, errores (vía Sentry).\n• Cookies: ver Política de Cookies.`,
      },
      {
        heading: '3. Base Legal del Tratamiento (Art. 6 RGPD)',
        body: `Tratamos tus datos en base a:\n\n• Ejecución de contrato (Art. 6.1.b): gestionar tu cuenta, procesar pagos, prestar el servicio.\n• Consentimiento (Art. 6.1.a): newsletter, cookies no esenciales, geolocalización.\n• Interés legítimo (Art. 6.1.f): seguridad, prevención de fraude, mejora del servicio, comunicación entre usuarios.\n• Obligación legal (Art. 6.1.c): facturación, conservación fiscal, atención de requerimientos judiciales.`,
      },
      {
        heading: '4. Finalidades del Tratamiento',
        body: `Usamos tus datos para:\n\n• Crear y gestionar tu cuenta y perfil público.\n• Procesar reservas, ventas y pagos (con escrow).\n• Mostrar contenido relevante según tu ubicación e intereses.\n• Permitir comunicación entre usuarios (chat, comentarios).\n• Enviar emails transaccionales (confirmaciones, recordatorios).\n• Enviar newsletter (solo si das consentimiento explícito).\n• Mostrar publicidad relevante (solo cookies de marketing aceptadas).\n• Prevenir fraude, abuso y violaciones de términos.\n• Cumplir obligaciones legales y fiscales.\n• Defender nuestros derechos en eventuales litigios.`,
      },
      {
        heading: '5. Destinatarios y Encargados del Tratamiento',
        body: `Compartimos tus datos solo con quien sea estrictamente necesario:\n\n• Stripe Inc. (procesamiento de pagos) — irlanda/USA.\n• PayPal Holdings — Luxemburgo.\n• Supabase Inc. — USA (alojamiento BD + auth + storage).\n• Vercel Inc. — USA (hosting frontend y edge functions).\n• Sentry Inc. — USA (monitorización de errores).\n• GoHighLevel (chat, social media, newsletter) — USA.\n• Cloudinary (CDN de imágenes/videos) — USA.\n• Mapbox/OpenStreetMap (mapas) — USA/UE.\n\nNo vendemos tus datos a terceros con fines comerciales.\n\nOtros usuarios de la Plataforma verán tu perfil público y los datos que decidas hacer públicos. Tienes control granular en /perfil → Privacidad.`,
      },
      {
        heading: '6. Transferencias Internacionales',
        body: `Algunos proveedores tienen servidores fuera del EEE (principalmente USA). Garantizamos un nivel de protección adecuado mediante:\n\n• Cláusulas Contractuales Tipo (SCC) de la Comisión Europea.\n• Certificaciones de privacidad (SOC 2, ISO 27001).\n• Decisiones de adecuación cuando aplique (ej. EU-US Data Privacy Framework).\n\nPuedes solicitar copia de las garantías a ${DPO_EMAIL}.`,
      },
      {
        heading: '7. Tus Derechos (Art. 15-22 RGPD)',
        body: `Tienes derecho a:\n\n• Acceso: saber qué datos tenemos sobre ti.\n• Rectificación: corregir datos inexactos.\n• Supresión (derecho al olvido): pedir que borremos tus datos.\n• Limitación: restringir el tratamiento en ciertos supuestos.\n• Portabilidad: recibir tus datos en formato estructurado (JSON/CSV).\n• Oposición: oponerte al tratamiento, incluyendo perfilado.\n• No decisiones automatizadas: no estar sujeto a decisiones basadas únicamente en algoritmos.\n• Revocar consentimiento en cualquier momento.\n\nPara ejercer cualquier derecho: envía email a ${PRIVACY_EMAIL} con copia de DNI/pasaporte. Responderemos en máximo 30 días (prorrogable a 60 si la solicitud es compleja). Es gratuito salvo solicitudes manifiestamente infundadas o excesivas.\n\nAtajo: desde tu perfil puedes descargar tus datos y/o eliminar la cuenta directamente.`,
      },
      {
        heading: '8. Conservación de Datos',
        body: `Plazos de conservación:\n\n• Datos de cuenta activa: mientras tengas cuenta.\n• Tras eliminación voluntaria: 30 días en backups, luego eliminación total.\n• Datos fiscales / facturación: 6 años (obligación AEAT).\n• Logs de seguridad / auditoría: 12 meses.\n• Cookies analíticas: 26 meses máximo.\n• Datos para defensa legal: hasta prescripción de la acción.`,
      },
      {
        heading: '9. Seguridad',
        body: `Medidas técnicas y organizativas implementadas:\n\n• Cifrado TLS 1.3 en todas las comunicaciones.\n• Cifrado de datos en reposo (Supabase + Vercel).\n• Row Level Security (RLS) en toda la base de datos.\n• Lockout automático tras 10 intentos de login fallidos.\n• Honeypot anti-bot en formularios públicos.\n• Rate limiting en endpoints sensibles.\n• Auditoría continua de accesos (audit_logs).\n• Soft delete con periodo de gracia.\n• Backup diario con retención 7 días.\n• Reviews de seguridad trimestrales.\n\nEn caso de brecha de seguridad notificaremos a la AEPD en 72h y a los afectados sin dilación indebida si hay alto riesgo.`,
      },
      {
        heading: '10. Menores de Edad',
        body: `BailaNow no está dirigida a menores de 18 años. Si descubrimos que un usuario es menor de edad sin autorización paternal verificable, eliminaremos su cuenta y datos asociados. Padres/tutores que detecten un perfil de menor pueden reportarlo a ${PRIVACY_EMAIL}.`,
      },
      {
        heading: '11. Reclamaciones',
        body: `Si consideras que el tratamiento de tus datos no es conforme al RGPD, puedes presentar reclamación ante:\n\n• Agencia Española de Protección de Datos (AEPD): www.aepd.es\n• Dirección: C/ Jorge Juan, 6 - 28001 Madrid\n• Teléfono: 901 100 099 / 912 663 517\n\nTe agradecemos que primero nos lo comuniques a ${PRIVACY_EMAIL} para intentar resolverlo directamente.`,
      },
      {
        heading: '12. Actualizaciones de esta Política',
        body: `Esta política puede actualizarse. Te notificaremos los cambios sustanciales por email y banner. Mantén tu email actualizado para no perder notificaciones importantes.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  cookies: {
    title: 'Política de Cookies',
    short: 'Cookies',
    icon: <Cookie className="w-6 h-6 text-pink-500" />,
    intro: `Cumplimos el artículo 22.2 de la Ley 34/2002 (LSSI-CE) y la guía de cookies de la AEPD (2024).`,
    sections: [
      {
        heading: '¿Qué son las cookies?',
        body: `Las cookies son pequeños archivos de texto que un sitio web almacena en tu dispositivo (ordenador, móvil, tablet) cuando lo visitas. Sirven para recordar información sobre ti y tu visita.\n\nTambién usamos tecnologías similares (local storage, session storage, pixels) que se rigen por esta misma política.`,
      },
      {
        heading: 'Tipos de Cookies que Usamos',
        body: `Clasificación según finalidad:`,
        subsections: [
          { title: '🟢 Técnicas (siempre activas — no requieren consentimiento)', text: `Imprescindibles para el funcionamiento del sitio. Incluyen:\n\n• bn-session: mantener tu sesión iniciada.\n• bn-theme: recordar tu preferencia clara/oscura.\n• bn-cart: tu carrito de compras.\n• bn-cookie-consent: tu elección de cookies.\n\nDuración: sesión o hasta 1 año.\nProveedor: BailaNow (propias).` },
          { title: '🔵 Preferencias', text: `Personalizan tu experiencia recordando tus elecciones:\n\n• bn-language: idioma seleccionado.\n• bn-city: ciudad de búsqueda guardada.\n• bn-favorites: locales/artistas marcados como favoritos.\n\nDuración: 1 año. Proveedor: BailaNow.` },
          { title: '🟡 Análisis / Estadística', text: `Nos ayudan a entender cómo usas el sitio (anonimizado).\n\n• Vercel Analytics: páginas vistas, Web Vitals.\n• Sentry: errores y rendimiento (no almacena info personal en cookies).\n\nDuración: hasta 26 meses. Proveedores: Vercel Inc. (USA), Sentry Inc. (USA).` },
          { title: '🟠 Marketing / Publicidad', text: `Mostrar publicidad relevante en BailaNow y otros sitios.\n\n• Pixel Meta (Facebook/Instagram).\n• Pixel TikTok.\n• Google Ads conversion.\n\nDuración: hasta 24 meses.\nProveedores: Meta Platforms, ByteDance, Google LLC.\nSolo activas si las aceptas explícitamente.` },
          { title: '🔴 Terceros embebidos', text: `Cuando reproduces vídeos o usas pasarelas embebidas:\n\n• YouTube/Vimeo: cookies de medición de reproducción.\n• Stripe: prevención de fraude en pagos.\n• PayPal: prevención de fraude.\n• Jitsi (lives): conferencia en tiempo real.\n• GHL Chat Widget: chat de soporte.\n\nCada uno tiene su propia política. Solo se cargan al usar la función concreta.` },
        ],
      },
      {
        heading: '¿Cómo gestiono mis cookies?',
        body: `Tienes varias opciones:\n\n• Banner de cookies: aparece la primera vez que visitas BailaNow. Puedes Aceptar todas, Rechazar todas, o Personalizar por categoría.\n• Configuración: accede en cualquier momento desde el footer → "Gestionar cookies".\n• Navegador: puedes bloquear o eliminar cookies desde la configuración de tu navegador. Atención: si bloqueas todas, algunas funciones del sitio pueden no funcionar.\n\nEnlaces a guías de cookies:\n• Chrome: https://support.google.com/chrome/answer/95647\n• Firefox: https://support.mozilla.org/es/kb/cookies-informacion-sitios-web-almacenan-en-tu-ordenador\n• Safari: https://support.apple.com/es-es/guide/safari/sfri11471/mac\n• Edge: https://support.microsoft.com/es-es/microsoft-edge`,
      },
      {
        heading: 'Tu consentimiento',
        body: `Al pulsar "Aceptar todas" en el banner consientes el uso de TODAS las cookies. Al pulsar "Rechazar todas" sólo activamos las técnicas. Al usar "Personalizar" puedes elegir categoría por categoría.\n\nPuedes retirar tu consentimiento en cualquier momento. La retirada no afecta a la licitud del tratamiento previo.`,
      },
      {
        heading: 'Contacto',
        body: `Dudas sobre cookies: ${PRIVACY_EMAIL}`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  aviso: {
    title: 'Aviso Legal',
    short: 'Aviso Legal',
    icon: <Building2 className="w-6 h-6 text-pink-500" />,
    intro: `Información legal exigida por la Ley 34/2002 (LSSI-CE) sobre el prestador de los servicios de la sociedad de la información.`,
    sections: [
      {
        heading: 'Identificación del Titular',
        body: `• Denominación: ${COMPANY_FULL}\n• Domicilio social: ${COMPANY_ADDRESS}\n• Correo electrónico: ${COMPANY_EMAIL}\n• Dominio web: https://${DOMAIN}\n• Inscrita en el Registro Mercantil correspondiente (datos disponibles a solicitud).`,
      },
      {
        heading: 'Objeto',
        body: `El presente Aviso Legal regula el acceso y uso del sitio web ${DOMAIN} y las aplicaciones móviles asociadas a la marca BailaNow.\n\nEl acceso atribuye la condición de Usuario e implica la aceptación de los Términos y Condiciones, la Política de Privacidad y la Política de Cookies.`,
      },
      {
        heading: 'Uso del Sitio',
        body: `El Usuario se compromete a hacer un uso adecuado de los contenidos y servicios. En particular, no puede:\n\n• Realizar actividades ilícitas o contrarias a la buena fe.\n• Provocar daños en los sistemas físicos y lógicos de BailaNow.\n• Introducir o difundir virus, malware o cualquier sistema susceptible de provocar daños.\n• Intentar acceder, modificar o eliminar datos no autorizados.\n• Suplantar la identidad de otros usuarios.`,
      },
      {
        heading: 'Enlaces a Terceros',
        body: `Este sitio puede contener enlaces a sitios web de terceros. BailaNow no se responsabiliza del contenido, exactitud o disponibilidad de tales sitios externos. La inclusión de enlaces no implica recomendación o respaldo.`,
      },
      {
        heading: 'Modificaciones',
        body: `BailaNow se reserva el derecho a efectuar sin previo aviso las modificaciones que considere oportunas en su sitio web, pudiendo cambiar, suprimir o añadir tanto los contenidos como los servicios y la forma en que estos aparezcan presentados.`,
      },
      {
        heading: 'Legislación Aplicable',
        body: `El presente Aviso Legal se rige por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los Juzgados y Tribunales de Madrid.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  reembolsos: {
    title: 'Política de Reembolsos',
    short: 'Reembolsos',
    icon: <DollarSign className="w-6 h-6 text-pink-500" />,
    intro: `Política detallada de cancelaciones y reembolsos por tipo de servicio en BailaNow.`,
    sections: [
      {
        heading: 'Principios Generales',
        body: `• Toda compra en BailaNow está protegida por escrow hasta que el comprador confirma satisfacción o pasen los plazos establecidos.\n• Los reembolsos se procesan al método de pago original en máximo 14 días hábiles.\n• Las comisiones de pasarela (Stripe/PayPal) NO son reembolsables (suelen ser 2,9% + 0,25€).\n• La comisión de plataforma (${COMMISSION_DEFAULT}) SÍ se reembolsa en caso de reembolso total por causa imputable al vendedor o a BailaNow.`,
      },
      {
        heading: 'Reservas de Servicios Profesionales',
        body: `Política estándar (puede haber variaciones por servicio, indicadas antes de la compra):\n\n• Hasta 7 días antes del servicio: reembolso 100%.\n• Entre 7 días y 48 horas: reembolso 50%.\n• Menos de 48 horas: NO hay reembolso, salvo causa de fuerza mayor justificada (enfermedad con justificante, cancelación de transporte público, alerta meteorológica oficial, etc).\n\nSi el profesional cancela: reembolso 100% al comprador. El profesional asume las comisiones de pasarela.`,
      },
      {
        heading: 'Tickets de Eventos',
        body: `La política de cancelación la fija el organizador y se muestra antes de la compra:\n\n• Eventos con política "Sin reembolsos": indicado claramente. No hay devolución salvo cancelación o cambio sustancial del evento.\n• Eventos con política "Reembolso hasta X días antes": devolución completa si cancelas con la antelación indicada.\n• Cancelación del evento por el organizador: reembolso 100% automático en 7 días.\n• Cambio sustancial (fecha, ciudad, artista principal): reembolso a elección del comprador.\n\nEn caso de no asistencia (no-show) sin cancelación previa: no hay reembolso.`,
      },
      {
        heading: 'Suscripciones Premium',
        body: `• Cancelación en cualquier momento desde /perfil → Suscripción.\n• El plan permanece activo hasta el final del periodo ya pagado.\n• Mensualidades ya cobradas no se reembolsan.\n• Excepción: si cancelas en las primeras 24h del primer pago, reembolso completo.`,
      },
      {
        heading: 'Lives de Pago y Reservas',
        body: `• Si el live NO se celebra en la fecha prometida: reembolso 100% automático en 48h.\n• Si el clip preview era manifiestamente engañoso: reembolso vía mediación de BailaNow.\n• Lives gratuitos con donación: las donaciones son voluntarias y NO reembolsables salvo error técnico.`,
      },
      {
        heading: 'Marketplace (productos y servicios)',
        body: `Sigue las reglas del comercio electrónico (Ley 3/2014 de Defensa del Consumidor):\n\n• Derecho de desistimiento: 14 días naturales desde la entrega para productos físicos (con devolución a costa del comprador salvo defecto del producto).\n• Servicios digitales ya consumidos: no aplica desistimiento si el usuario aceptó el inicio expresamente y renunció al derecho.\n• Productos personalizados: no aplica desistimiento.\n• Servicios B2B: aplica lo pactado entre partes (vendedor profesional / comprador profesional).`,
      },
      {
        heading: 'Cómo Solicitar un Reembolso',
        body: `1. Desde tu cuenta → Mis Compras → "Solicitar reembolso".\n2. Indica el motivo y adjunta pruebas si aplica (fotos, mensajes, justificantes).\n3. El vendedor tiene 5 días laborables para aceptar o rechazar.\n4. Si rechaza, BailaNow media en 5 días laborables adicionales.\n5. Decisión final vinculante de BailaNow, apelable en plataforma ODR europea.\n\nUrgencias: ${SUPPORT_EMAIL} con asunto "URGENTE - Reembolso".`,
      },
      {
        heading: 'Casos de Fraude',
        body: `En casos de fraude evidente (transacción no autorizada, servicio fantasma, suplantación de identidad):\n\n• Reembolso 100% inmediato.\n• Bloqueo cautelar de la cuenta del vendedor.\n• Investigación interna.\n• Denuncia a autoridades si procede.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  vendedores: {
    title: 'Política para Vendedores y Profesionales',
    short: 'Vendedores',
    icon: <ShoppingBag className="w-6 h-6 text-pink-500" />,
    intro: `Términos específicos para profesionales, vendedores, venues y promotores que ofrecen servicios en BailaNow.`,
    sections: [
      {
        heading: 'Requisitos para Vender',
        body: `• Mayoría de edad (18+) o representar legalmente a empresa.\n• Datos fiscales completos y válidos (NIF/CIF, dirección, IBAN).\n• Cuenta bancaria a nombre del vendedor (no aceptamos terceros).\n• En caso de empresa: documentación acreditativa.\n• En caso de servicios regulados (música en directo, alcohol, etc.): licencias aplicables.`,
      },
      {
        heading: 'Obligaciones Legales del Vendedor',
        body: `Como vendedor, eres el único responsable de:\n\n• Cumplir la normativa fiscal aplicable (IVA, retenciones, IRPF si autónomo).\n• Emitir facturas legalmente válidas a los compradores que las soliciten.\n• Cumplir la legislación sobre derechos de los consumidores (Ley 3/2014).\n• Tener los derechos sobre el contenido publicado (música, imágenes, vídeos).\n• Cumplir la legislación laboral en caso de contratar personal.\n• Tener los seguros y licencias necesarios para tu actividad.`,
      },
      {
        heading: 'Comisión y Cobros',
        body: `• Comisión plataforma: ${COMMISSION_DEFAULT} (${COMMISSION_PREMIUM} para Premium).\n• Comisión pasarela: aprox. 2,9% + 0,25€ (varía según método y país).\n• Cobros se ingresan al IBAN registrado tras liberarse del escrow.\n• Frecuencia: payouts semanales (cada lunes) si el saldo es ≥50€. Saldos menores se acumulan.\n• Mínimo retiro: 50€.\n• Las comisiones se aplican antes del payout.\n\nEjemplo: venta de 100€\n→ Comisión plataforma (15%): 15€\n→ Comisión Stripe (2,9% + 0,25€): 3,15€\n→ Recibes: 81,85€`,
      },
      {
        heading: 'Calidad del Servicio',
        body: `Debes:\n\n• Cumplir con la descripción y precio publicados.\n• Responder a consultas en máximo 48h.\n• Entregar el servicio en la fecha/hora pactada.\n• Mantener un trato profesional y respetuoso.\n• Resolver incidencias proactivamente.\n\nLos compradores pueden dejarte valoraciones públicas. Las valoraciones negativas o malas estadísticas pueden afectar a tu visibilidad e incluso suspender tu cuenta.`,
      },
      {
        heading: 'Contenido del Perfil y Anuncios',
        body: `Prohibido:\n\n• Imágenes o vídeos de los que no tengas derechos.\n• Información falsa sobre experiencia, premios o trayectoria.\n• Tarifas dummy para inflar tu perfil (precios irreales).\n• Solicitar contacto fuera de la plataforma para evadir comisiones (es causa de baneo).\n• Cualquier contenido prohibido en los Términos generales.`,
      },
      {
        heading: 'Disputas y Devoluciones',
        body: `• Tienes derecho a rechazar solicitudes de devolución manifiestamente infundadas.\n• Si BailaNow media en una disputa, su decisión es vinculante.\n• Tasa de disputas >5% puede llevar a revisión de tu cuenta.\n• Acuerdos privados con compradores fuera del sistema NO son válidos ante BailaNow.`,
      },
      {
        heading: 'Suspensión y Cancelación',
        body: `Causas de suspensión inmediata:\n\n• Fraude o intento de fraude.\n• Suplantación de identidad.\n• Spam o publicidad engañosa.\n• Múltiples incumplimientos.\n• Solicitar pagos fuera de la plataforma.\n• Rating promedio inferior a 3.0 con 10+ reseñas.\n\nEn caso de suspensión, los fondos en escrow se procesan normalmente y el saldo se libera tras cierre de operaciones pendientes.`,
      },
      {
        heading: 'Suscripción Premium',
        body: `Plan Premium (49€/mes) incluye:\n\n• Comisión reducida ${COMMISSION_PREMIUM} (en lugar de ${COMMISSION_DEFAULT}).\n• Tag verificado y badge "PRO" en perfil.\n• Posicionamiento prioritario en búsquedas.\n• Estadísticas detalladas de perfil.\n• Soporte prioritario.\n• 1 destacado mensual en categorías.\n\nCancelable en cualquier momento sin penalización. El periodo en curso permanece activo.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  conducta: {
    title: 'Código de Conducta y Normas de la Comunidad',
    short: 'Conducta',
    icon: <Users className="w-6 h-6 text-pink-500" />,
    intro: `BailaNow es un espacio para celebrar la cultura latina y conectar a la comunidad del baile. Estas normas garantizan un entorno respetuoso y seguro para todas las personas.`,
    sections: [
      {
        heading: 'Principios Fundamentales',
        body: `• Respeto: tratamos a todos los miembros con cortesía y consideración.\n• Inclusión: bienvenida sin importar raza, género, orientación sexual, religión, edad, nacionalidad, capacidad o nivel económico.\n• Honestidad: comunicación clara y veraz en perfiles, ofertas y transacciones.\n• Profesionalismo: cumplir compromisos y comunicar incidencias proactivamente.\n• Seguridad: priorizamos la seguridad física, emocional y financiera de todos.`,
      },
      {
        heading: 'Conductas Prohibidas',
        body: `Tolerancia cero con:\n\n• Acoso, intimidación o amenazas a cualquier persona.\n• Discriminación o discurso de odio basado en raza, género, orientación, religión, etc.\n• Contenido sexual explícito o pornográfico.\n• Contenido violento o que glorifique la violencia.\n• Doxing (publicar información personal de terceros sin consentimiento).\n• Suplantación de identidad de otra persona o empresa.\n• Spam, scams o publicidad no autorizada.\n• Venta o promoción de drogas, armas, contenido pirata.\n• Cualquier actividad ilegal.`,
      },
      {
        heading: 'Contenido en Lives',
        body: `Las transmisiones en vivo deben:\n\n• Respetar derechos de autor sobre la música emitida.\n• Mantener un nivel apropiado (sin desnudos, violencia, lenguaje altamente ofensivo).\n• Identificar claramente al anfitrión.\n• Cumplir lo prometido en el clip preview.\n\nBailaNow puede interrumpir lives que infrinjan estas normas. Reincidencia = suspensión.`,
      },
      {
        heading: 'Reportes y Moderación',
        body: `¿Cómo reportar?\n\n• Cada perfil, post, comentario y live tiene un botón "Reportar".\n• Selecciona el motivo y añade descripción si lo deseas.\n• Recibirás confirmación; no compartiremos tu identidad con el reportado.\n• Equipo de moderación revisa en 24-72h (24h para casos graves).\n\nPara situaciones urgentes (amenazas físicas, conducta peligrosa): ${SUPPORT_EMAIL} con asunto "URGENTE - Reporte".`,
      },
      {
        heading: 'Sanciones',
        body: `Escalado de sanciones:\n\n• Advertencia formal con descripción del incumplimiento.\n• Suspensión temporal (1-30 días).\n• Suspensión permanente de la cuenta.\n• Ban de IP y prohibición de crear nuevas cuentas en casos graves.\n• Denuncia a autoridades en delitos.\n\nApelación: cualquier sanción es apelable enviando email a ${SUPPORT_EMAIL} con asunto "Apelación".`,
      },
      {
        heading: 'Apoyo y Recursos',
        body: `Si has sido víctima de acoso o discriminación:\n\n• Línea de atención BailaNow: ${SUPPORT_EMAIL}\n• Recursos externos (España):\n  - Teléfono Mujer 016 (violencia de género)\n  - 091 (emergencias policía)\n  - 112 (emergencias generales)\n  - LGTBI+: 028 (ayuda y soporte)`,
      },
      {
        heading: 'Compromiso de la Plataforma',
        body: `BailaNow se compromete a:\n\n• Revisar reportes con rigor e imparcialidad.\n• Comunicar resultados a quien reporta cuando proceda.\n• No tolerar represalias contra quien reporta de buena fe.\n• Mantener confidencialidad sobre la identidad del reportante.\n• Mejorar continuamente nuestras políticas con feedback comunitario.`,
      },
    ],
  },
};

const LegalPage: React.FC = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const legalType = (type as LegalType) in CONTENT ? (type as LegalType) : 'terminos';
  const content = CONTENT[legalType];

  usePageMeta({
    title: content.title,
    description: content.intro || `${content.title} de BailaNow — Documentación legal completa para el marketplace latino #1.`,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-14 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {content.icon}
            <h1 className="font-black text-lg text-gray-900 dark:text-white">{content.title}</h1>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(Object.entries(CONTENT) as [LegalType, LegalDoc][]).map(([key, val]) => (
            <button key={key} onClick={() => navigate(`/legal/${key}`)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                legalType === key
                  ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}>
              {val.short}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-xs text-gray-400 mb-4">
          Última actualización: {LAST_UPDATE} · {COMPANY_FULL} · {COMPANY_EMAIL}
        </p>

        {content.intro && (
          <div className="mb-8 p-4 bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-500 rounded-r-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">{content.intro}</p>
          </div>
        )}

        <div className="space-y-8">
          {content.sections.map(section => (
            <div key={section.heading}>
              <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">{section.heading}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{section.body}</p>
              {section.subsections && (
                <div className="mt-3 space-y-3 pl-4 border-l-2 border-pink-200 dark:border-pink-800">
                  {section.subsections.map(sub => (
                    <div key={sub.title}>
                      <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">{sub.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mt-1">{sub.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick links to other sections */}
        <div className="mt-12 p-5 bg-gray-100 dark:bg-gray-900 rounded-2xl">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3">📚 Otros documentos legales</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(Object.entries(CONTENT) as [LegalType, LegalDoc][])
              .filter(([key]) => key !== legalType)
              .map(([key, val]) => (
                <button key={key} onClick={() => navigate(`/legal/${key}`)}
                  className="text-left p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">
                  <span className="font-bold text-pink-500">{val.short}</span>
                  <p className="text-gray-500 dark:text-gray-400 text-[10px] line-clamp-1">{val.title}</p>
                </button>
              ))}
          </div>
        </div>

        <div className="mt-8 p-5 bg-pink-50 dark:bg-pink-900/20 rounded-2xl border border-pink-200 dark:border-pink-800 text-center">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            ¿Tienes preguntas legales, de privacidad o sobre cookies?
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <a href={`mailto:${COMPANY_EMAIL}`} className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:from-pink-600 hover:to-fuchsia-700 transition-all">
              {COMPANY_EMAIL}
            </a>
            <a href={`mailto:${PRIVACY_EMAIL}`} className="inline-flex items-center gap-2 border-2 border-pink-500 text-pink-500 text-sm font-bold px-4 py-2 rounded-xl hover:bg-pink-50 transition-all">
              {PRIVACY_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
