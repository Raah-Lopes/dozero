// src/services/ai.ts — wrapper mínimo para OpenRouter (OpenAI-compat)
const API_KEY = import.meta.env.VITE_OPENROUTER_KEY as string | undefined;
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

export async function askAI(prompt: string): Promise<string> {
  if (!API_KEY) throw new Error('VITE_OPENROUTER_KEY não configurada — reinicie o Vite');

  const resp = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'DoZero Theater',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`OpenRouter ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}
