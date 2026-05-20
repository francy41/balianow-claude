import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Cookie } from 'lucide-react';

type LegalType = 'terminos' | 'privacidad' | 'cookies';

const CONTENT: Record<LegalType, { title: string; icon: React.ReactNode; sections: { heading: string; body: string }[] }> = {
  terminos: {
    title: 'Términos y Condiciones',
    icon: <FileText className="w-6 h-6 text-pink-500" />,
    sections: [
      { heading: '1. Aceptación de los Términos', body: 'Al acceder y usar BailaNow ("la Plataforma"), aceptas estar vinculado por estos Términos y Condiciones. Si no estás de acuerdo, por favor no uses la plataforma.' },
      { heading: '2. Descripción del Servicio', body: 'BailaNow es un marketplace de entretenimiento latino que conecta artistas, DJs, bailarines y venues con usuarios finales. Actuamos como intermediarios y no somos parte en los contratos entre usuarios.' },
      { heading: '3. Registro y Cuentas', body: 'Para usar ciertas funciones debes crear una cuenta con información veraz y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales. Debes tener al menos 18 años para registrarte.' },
      { heading: '4. Comisiones y Pagos', body: 'BailaNow cobra una comisión del 15% sobre cada transacción procesada en la plataforma. Los creadores premium pagan una comisión reducida del 8%. Los pagos se procesan mediante Stripe o PayPal con sistema de escrow para proteger ambas partes.' },
      { heading: '5. Sistema de Escrow', body: 'Los pagos quedan retenidos en escrow hasta que el comprador confirme la recepción satisfactoria del servicio. En caso de disputa, BailaNow actuará como árbitro neutral siguiendo nuestro proceso de resolución.' },
      { heading: '6. Contenido Prohibido', body: 'Está prohibido publicar contenido ilegal, engañoso, difamatorio o que viole derechos de terceros. BailaNow se reserva el derecho de eliminar contenido y suspender cuentas que violen estas normas.' },
      { heading: '7. Propiedad Intelectual', body: 'El contenido de BailaNow está protegido por derechos de autor. Los usuarios conservan los derechos de su propio contenido, pero conceden a BailaNow una licencia para mostrarlo en la plataforma.' },
      { heading: '8. Limitación de Responsabilidad', body: 'BailaNow no se hace responsable de los servicios prestados por artistas o vendedores independientes. Nuestra responsabilidad máxima se limita al importe de las comisiones cobradas en los últimos 3 meses.' },
      { heading: '9. Modificaciones', body: 'Podemos modificar estos términos en cualquier momento. Los cambios sustanciales se notificarán con 30 días de antelación. El uso continuado de la plataforma implica la aceptación de los nuevos términos.' },
      { heading: '10. Ley Aplicable', body: 'Estos términos se rigen por la ley española. Los conflictos se someterán a los juzgados de Madrid, España, salvo que la normativa aplicable establezca otra jurisdicción.' },
      { heading: '11. Contacto', body: 'Para cualquier consulta sobre estos términos, contacta con nosotros en: legal@bailanow.com · BailaNow SL · Madrid, España.' },
    ],
  },
  privacidad: {
    title: 'Política de Privacidad',
    icon: <Shield className="w-6 h-6 text-pink-500" />,
    sections: [
      { heading: '1. Responsable del Tratamiento', body: 'BailaNow SL, con domicilio en Madrid, España, es el responsable del tratamiento de tus datos personales. Contacto DPO: privacidad@bailanow.com' },
      { heading: '2. Datos que Recopilamos', body: 'Recopilamos: datos de registro (nombre, email, ciudad, rol), datos de perfil (foto, biografía, redes sociales), datos de uso y navegación, datos de pago (gestionados por Stripe/PayPal, no almacenamos datos de tarjeta), y comunicaciones dentro de la plataforma.' },
      { heading: '3. Base Legal del Tratamiento', body: 'Tratamos tus datos en base a: ejecución del contrato (prestación del servicio), consentimiento (comunicaciones de marketing), interés legítimo (seguridad y prevención de fraude), y cumplimiento de obligaciones legales.' },
      { heading: '4. Finalidad del Tratamiento', body: 'Usamos tus datos para: gestionar tu cuenta y perfil, procesar pagos y transacciones, mostrarte contenido relevante, enviar comunicaciones del servicio, mejorar la plataforma, prevenir fraudes y cumplir con la ley.' },
      { heading: '5. Compartición de Datos', body: 'Compartimos tus datos con: proveedores de pago (Stripe, PayPal) para procesar transacciones, otros usuarios según tu configuración de privacidad, proveedores de servicio que actúan como encargados de tratamiento. No vendemos tus datos a terceros.' },
      { heading: '6. Transferencias Internacionales', body: 'Algunos de nuestros proveedores están fuera del EEE. En esos casos, nos aseguramos de que existan garantías adecuadas (cláusulas contractuales tipo, decisiones de adecuación de la Comisión Europea).' },
      { heading: '7. Tus Derechos', body: 'Tienes derecho a: acceder a tus datos, rectificarlos, suprimirlos ("derecho al olvido"), limitar el tratamiento, portabilidad de datos, oponerte al tratamiento, y no ser objeto de decisiones automatizadas. Ejerce tus derechos en privacidad@bailanow.com' },
      { heading: '8. Conservación de Datos', body: 'Conservamos tus datos mientras tengas cuenta activa. Tras la eliminación, los datos se conservan durante 3 años por obligaciones legales y fiscales, después se eliminan definitivamente.' },
      { heading: '9. Seguridad', body: 'Aplicamos medidas técnicas y organizativas apropiadas: cifrado TLS, acceso restringido, auditorías de seguridad periódicas. En caso de brecha de seguridad, notificaremos a las autoridades y afectados según requiere el RGPD.' },
      { heading: '10. Cookies', body: 'Usamos cookies propias y de terceros. Consulta nuestra Política de Cookies para más información.' },
      { heading: '11. Reclamaciones', body: 'Puedes presentar reclamaciones ante la Agencia Española de Protección de Datos (AEPD) en www.aepd.es si consideras que el tratamiento de tus datos no es conforme al RGPD.' },
    ],
  },
  cookies: {
    title: 'Política de Cookies',
    icon: <Cookie className="w-6 h-6 text-pink-500" />,
    sections: [
      { heading: '¿Qué son las cookies?', body: 'Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Nos ayudan a recordar tus preferencias y mejorar tu experiencia.' },
      { heading: 'Cookies Técnicas (necesarias)', body: 'Son imprescindibles para el funcionamiento básico de la plataforma. Incluyen: sesión de usuario, preferencias de idioma y tema, estado del carrito de compras. No requieren consentimiento.' },
      { heading: 'Cookies de Análisis', body: 'Usamos cookies de análisis para entender cómo se usa la plataforma y mejorarla. Los datos son anónimos y agregados. Requieren tu consentimiento.' },
      { heading: 'Cookies de Marketing', body: 'Las cookies de marketing nos permiten mostrarte anuncios relevantes en otras plataformas. Requieren tu consentimiento explícito.' },
      { heading: 'Cookies de Terceros', body: 'Algunos servicios integrados (Stripe, PayPal, YouTube para vídeos) pueden instalar sus propias cookies. Consulta las políticas de privacidad de cada proveedor.' },
      { heading: 'Gestión de Cookies', body: 'Puedes gestionar tus preferencias de cookies en cualquier momento desde la configuración de tu cuenta o usando el panel de cookies que aparece al acceder a la plataforma. También puedes bloquear cookies desde la configuración de tu navegador, aunque esto puede afectar a la funcionalidad.' },
      { heading: 'Contacto', body: 'Para consultas sobre cookies: privacidad@bailanow.com' },
    ],
  },
};

const LegalPage: React.FC = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const legalType = (type as LegalType) || 'terminos';
  const content = CONTENT[legalType] || CONTENT.terminos;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-14 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {content.icon}
            <h1 className="font-black text-lg text-gray-900 dark:text-white">{content.title}</h1>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(Object.entries(CONTENT) as [LegalType, typeof CONTENT[LegalType]][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => navigate(`/legal/${key}`)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                legalType === key
                  ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {val.title}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-xs text-gray-400 mb-8">
          Última actualización: Mayo 2025 · BailaNow SL · legal@bailanow.com
        </p>

        <div className="space-y-8">
          {content.sections.map(section => (
            <div key={section.heading}>
              <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">{section.heading}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-5 bg-pink-50 dark:bg-pink-900/20 rounded-2xl border border-pink-200 dark:border-pink-800 text-center">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            ¿Tienes preguntas legales o de privacidad?
          </p>
          <a
            href="mailto:legal@bailanow.com"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:from-pink-600 hover:to-fuchsia-700 transition-all"
          >
            Contactar al equipo legal
          </a>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
