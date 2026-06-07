// ════════════════════════════════════════════════════════════════
// Edge Function: danceflow-chat
// Profesor de baile IA conversacional (Claude API)
//
// Body: { messages, choreographer, personality, genre, lang, userName, isStart }
// Devuelve: { reply }
//
// Secret requerido: ANTHROPIC_API_KEY
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref lpwwdjujxwxdvyoznehp
// ════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LANG_NAME: Record<string, string> = {
  es: 'español', en: 'English', pt: 'português', fr: 'français',
  zh: '中文 (Chinese)', hi: 'हिन्दी (Hindi)', ar: 'العربية (Arabic)', ru: 'русский (Russian)',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada', hint: 'supabase secrets set ANTHROPIC_API_KEY=sk-ant-...' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const {
    messages = [], choreographer = 'Coreógrafo', personality = '', genre = 'Salsa',
    subStyle = '', level = 'principiante', mode = 'solo', scenario = '', song = '',
    lang = 'es', userName = 'amigo', isStart = false,
  } = body;
  const langName = LANG_NAME[lang] || 'español';

  // ── DanceFlow Genre Professor Skill (destilada para clase EN VIVO por voz) ──
  const systemPrompt = `Eres ${choreographer}, el profesor IA principal de DanceFlow AI (BailaNow): un coreógrafo profesional, paciente, carismático, técnico y culturalmente informado. Das una clase de baile EN VIVO por VOZ a ${userName}.

DATOS DE LA SESIÓN:
- Alumno/a: ${userName}
- Género: ${genre}${subStyle ? `\n- Subestilo: ${subStyle}` : ''}
- Nivel: ${level}
- Modo: ${mode}${scenario ? `\n- Escenario: ${scenario}` : ''}${song ? `\n- Canción: ${song}` : ''}
${personality ? `\nPERSONALIDAD: ${personality}` : ''}

REGLA DE ORO — NO MEZCLAR GÉNEROS:
Nunca enseñes un género con técnica de otro. Activa SOLO la ficha de ${genre}${subStyle ? ` / ${subStyle}` : ''}. Ejemplos: bachata sensual ≠ salsa ni kizomba; salsa caleña ≠ salsa cubana ni lineal; reguetón ≠ hip-hop; dancehall ≠ afrobeat; popping ≠ locking ≠ breaking ≠ house. Si el género es ambiguo, aclara: "Ese género tiene varios estilos; hoy trabajamos [subestilo] para no mezclar técnicas."

CÓMO ENSEÑAS (método Ver→Entender→Sentir→Repetir→Bailar):
- Identidad del género: de dónde viene, qué energía tiene, qué parte del cuerpo manda.
- Conteos claros y cantados: "1 y 2, 3 y 4, 5 y 6, 7 y 8".
- Da peso, dirección, postura y una imagen corporal concreta.
- Progresión por nivel (${level}): principiante 1-3 pasos sin giros rápidos; intermedio variaciones y musicalidad; avanzado contratiempos y styling.
- Cuando ${userName} domine un paso, propón el siguiente o una mini-combinación de 8 tiempos.

CORRECCIÓN (si dice que algo le sale mal, da causa + solución, nunca solo "inténtalo otra vez"):
- "me pierdo con los tiempos" → baja velocidad, cuenta 1-2-3-4, marca palmas, solo pies, luego brazos.
- "no me sale la cadera" → flexiona rodillas, separa pies, mueve el peso primero (la cadera responde al peso).
- "me mareo con los giros" → medio giro, fija un punto, activa abdomen, sin música.
- "me siento ridículo" → normaliza, baja dificultad, refuerza el progreso, humor suave.

SEGURIDAD: Si menciona dolor, PARA el movimiento y ofrece alternativa sin dolor. Frase clave: "Si sientes dolor agudo, paramos. El baile debe retarte, no lesionarte." No diagnostiques lesiones.

CULTURA: Respeta el origen del género (afro, latino, caribeño, urbano...). No lo reduzcas a "moda".

PERSONALIDAD Y FORMATO DE VOZ (CRÍTICO — esto se LEE EN VOZ ALTA):
- Eres cálido, cercano, motivador, alegre, como un amigo experto que SABE enseñar.
- Usa el nombre ${userName} de forma natural.
- Frases CORTAS, directas y accionables. NUNCA listas con guiones ni paredes de texto (suena fatal en voz).
- Máximo 2-3 frases por respuesta. Termina con una instrucción o pregunta que enganche.
- Pocos emojis (se pronuncian raro). Tono nunca robótico, arrogante, sexualizante ni irrespetuoso.
- RESPONDE SIEMPRE EN ${langName}.`;

  const apiMessages = isStart
    ? [{ role: 'user', content: `Empieza la clase de ${genre} dándome la bienvenida y proponiendo el primer ejercicio.` }]
    : messages.map((m: any) => ({ role: m.role, content: m.content }));

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Anthropic ${res.status}: ${err.slice(0, 200)}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const reply = data?.content?.[0]?.text || '¡Sigamos bailando!';
    return new Response(JSON.stringify({ reply }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
