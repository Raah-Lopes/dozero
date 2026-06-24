// src/services/ai/AIProvider.ts
// Abstração unificada para múltiplos provedores de IA.
// Suporta: Gemini, Groq, OpenRouter, Pollinations (sem chave), Ollama (local).

export type AIProviderType = 'gemini' | 'groq' | 'openrouter' | 'pollinations' | 'ollama';

export interface AIModel {
  id: string;
  label: string;
  provider: AIProviderType;
  requiresKey: boolean;
  free: boolean;
  contextWindow?: number;
}

export interface AIGenerateOptions {
  provider: AIProviderType;
  model: string;
  apiKey?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  ollamaUrl?: string;
}

export interface AIGenerateResult {
  text: string;
  model: string;
  provider: AIProviderType;
  tokensUsed?: number;
}

// Catálogo de modelos disponíveis por provedor
export const AI_MODELS: AIModel[] = [
  // Groq — ultrarrápido, gratuito com conta
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)', provider: 'groq', requiresKey: true, free: true, contextWindow: 128000 },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Groq)', provider: 'groq', requiresKey: true, free: true, contextWindow: 128000 },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B (Groq)', provider: 'groq', requiresKey: true, free: true, contextWindow: 8192 },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Groq)', provider: 'groq', requiresKey: true, free: true, contextWindow: 32768 },

  // Gemini — alta qualidade, gratuito com conta
  { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Exp)', provider: 'gemini', requiresKey: true, free: true, contextWindow: 1000000 },
  { id: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash', provider: 'gemini', requiresKey: true, free: true, contextWindow: 1000000 },
  { id: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro', provider: 'gemini', requiresKey: true, free: false, contextWindow: 2000000 },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', provider: 'gemini', requiresKey: true, free: true, contextWindow: 1000000 },

  // OpenRouter — modelos gratuitos via agregador
  { id: 'openrouter/auto', label: 'Auto (OpenRouter)', provider: 'openrouter', requiresKey: true, free: true },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (OpenRouter Free)', provider: 'openrouter', requiresKey: true, free: true },
  { id: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3 235B (OpenRouter Free)', provider: 'openrouter', requiresKey: true, free: true },
  { id: 'meta-llama/llama-4-maverick:free', label: 'Llama 4 Maverick (OpenRouter Free)', provider: 'openrouter', requiresKey: true, free: true },

  // Pollinations — sem chave, sem conta (instável)
  { id: 'mistral', label: 'Mistral (Pollinations, sem chave)', provider: 'pollinations', requiresKey: false, free: true },
  { id: 'openai', label: 'OpenAI Compat (Pollinations, sem chave)', provider: 'pollinations', requiresKey: false, free: true },

  // Ollama — local, 100% offline
  { id: 'llama3.2', label: 'Llama 3.2 (Ollama Local)', provider: 'ollama', requiresKey: false, free: true },
  { id: 'mistral', label: 'Mistral (Ollama Local)', provider: 'ollama', requiresKey: false, free: true },
  { id: 'phi3', label: 'Phi-3 (Ollama Local)', provider: 'ollama', requiresKey: false, free: true },
];

// ── Gemini ─────────────────────────────────────────────────────────────────
async function callGemini(opts: AIGenerateOptions): Promise<string> {
  if (!opts.apiKey) throw new Error('Chave API Gemini não configurada.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: `${opts.systemPrompt}\n\n${opts.userPrompt}` }] }],
    generationConfig: { temperature: opts.temperature ?? 0.8, maxOutputTokens: opts.maxTokens ?? 4096 },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || `Gemini: ${res.statusText}`); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Groq ────────────────────────────────────────────────────────────────────
async function callGroq(opts: AIGenerateOptions): Promise<string> {
  if (!opts.apiKey) throw new Error('Chave API Groq não configurada.');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey.trim()}` },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || `Groq: ${res.statusText}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── OpenRouter ───────────────────────────────────────────────────────────────
async function callOpenRouter(opts: AIGenerateOptions): Promise<string> {
  if (!opts.apiKey) throw new Error('Chave API OpenRouter não configurada.');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey.trim()}`,
      'HTTP-Referer': 'https://dozero.vtt',
      'X-Title': 'DOZERO VTT - Estudio IA do Mestre',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || `OpenRouter: ${res.statusText}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Pollinations (sem chave) ─────────────────────────────────────────────────
async function callPollinations(opts: AIGenerateOptions): Promise<string> {
  const payload = {
    model: opts.model === 'mistral' ? 'mistral' : 'openai',
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
    temperature: opts.temperature ?? 0.8,
  };
  const res = await fetch('/api/pollinations/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Pollinations: ${res.statusText}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Ollama (local) ───────────────────────────────────────────────────────────
async function callOllama(opts: AIGenerateOptions): Promise<string> {
  const baseUrl = opts.ollamaUrl || 'http://localhost:11434';
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      stream: false,
      options: { temperature: opts.temperature ?? 0.8 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama (${baseUrl}): ${res.statusText}. Verifique se o Ollama está rodando.`);
  const data = await res.json();
  return data.message?.content || '';
}

// ── Função principal ─────────────────────────────────────────────────────────
export async function generateAI(opts: AIGenerateOptions): Promise<AIGenerateResult> {
  let text = '';
  switch (opts.provider) {
    case 'gemini':      text = await callGemini(opts); break;
    case 'groq':        text = await callGroq(opts); break;
    case 'openrouter':  text = await callOpenRouter(opts); break;
    case 'pollinations': text = await callPollinations(opts); break;
    case 'ollama':      text = await callOllama(opts); break;
    default: throw new Error(`Provedor desconhecido: ${opts.provider}`);
  }
  return { text: text.trim(), model: opts.model, provider: opts.provider };
}
