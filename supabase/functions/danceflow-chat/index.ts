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

  const { messages = [], choreographer = 'Coreógrafo', personality = '', genre = 'Salsa', lang = 'es', userName = 'amigo', isStart = false } = body;
  const langName = LANG_NAME[lang] || 'español';

  const systemPrompt = `Eres ${choreographer}, coreógrafo/a experto/a en ${genre}.
Estás dando una clase de baile EN VIVO a ${userName} en BailaNow.

PERSONALIDAD: ${personality}

REGLAS:
- Eres como el mejor amigo de ${userName} de hace 20 años que también es su profe de baile.
- SIEMPRE usas su nombre (${userName}) de forma natural y motivadora.
- Cálido, cercano, divertido pero técnico cuando toca.
- Enseñas ${genre}: pasos, musicalidad, técnica, con metáforas físicas concretas.
- Celebras cada progreso con energía genuina.
- RESPONDE SIEMPRE EN ${langName}.
- Respuestas cortas y conversacionales (máximo 3-4 líneas). NUNCA listas con bullets.
- Termina con una pregunta o instrucción que enganche.
- Emojis con moderación.`;

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
