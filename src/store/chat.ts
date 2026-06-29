import { state } from '../services/yjs';
import { dispatchWebhookEvent } from '../services/webhook';

function sanitizeHtml(html: string): string {
  // Strip <script> and <iframe> tags entirely
  let clean = html.replace(/<(script|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Strip inline event handlers (onXXXX=...)
  clean = clean.replace(/\s+on[a-z]+=(['"])(.*?)\1/gi, '');
  clean = clean.replace(/\s+on[a-z]+=[^\s>]+/gi, '');
  // Strip javascript: urls
  clean = clean.replace(/href=(['"])javascript:.*?\1/gi, 'href="#"');
  return clean;
}

export interface ChatMessageOptions {
  tipo?: 'geral' | 'in-game' | 'sistema' | 'whisper' | 'me' | 'as';
  autor?: string;
  autor_alias?: string;
  alvo?: string;
  idioma?: string;
  isCritical?: boolean;
  isFailure?: boolean;
  pinned?: boolean;
  audioTrigger?: string;
  pollId?: string;
}

export interface PollData {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>; // userId -> optionIndex
  isAnonymous: boolean;
}

export function pushChatMessage(message: string, isCritical: boolean = false, isFailure: boolean = false) {
  const cleanMsg = sanitizeHtml(message);
  state.chat.push([{ id: Math.random().toString(36).substring(2), text: cleanMsg, isCritical, isFailure, timestamp: Date.now(), tipo: 'sistema' }]);
  dispatchWebhookEvent('chat_message', { text: cleanMsg, isCritical, isFailure, tipo: 'sistema' });
}

export function pushAdvancedChatMessage(message: string, options: ChatMessageOptions) {
  const cleanMsg = sanitizeHtml(message);
  state.chat.push([{
    id: Math.random().toString(36).substring(2),
    text: cleanMsg,
    timestamp: Date.now(),
    tipo: options.tipo || 'geral',
    autor: options.autor || 'Sistema',
    autor_alias: options.autor_alias,
    alvo: options.alvo,
    idioma: options.idioma,
    isCritical: options.isCritical || false,
    isFailure: options.isFailure || false,
    pinned: options.pinned || false,
    audioTrigger: options.audioTrigger,
    pollId: options.pollId
  }]);
  
  dispatchWebhookEvent('chat_message_advanced', {
    text: cleanMsg,
    tipo: options.tipo || 'geral',
    autor: options.autor || 'Sistema',
    isCritical: options.isCritical || false,
    isFailure: options.isFailure || false
  });
}

export function createPoll(question: string, options: string[], isAnonymous: boolean, autor: string) {
  const pollId = Math.random().toString(36).substring(2);
  const pollData: PollData = {
    id: pollId,
    question,
    options,
    votes: {},
    isAnonymous
  };
  state.polls.set(pollId, pollData);
  
  pushAdvancedChatMessage(`[Enquete] ${question}`, {
    tipo: 'geral',
    autor: autor,
    pollId: pollId
  });
}

export function castVote(pollId: string, userId: string, optionIndex: number) {
  const pollData = state.polls.get(pollId) as PollData | undefined;
  if (pollData) {
    const newVotes = { ...pollData.votes };
    
    // Toggle vote off if clicking the same option
    if (newVotes[userId] === optionIndex) {
      delete newVotes[userId];
    } else {
      newVotes[userId] = optionIndex;
    }
    
    state.polls.set(pollId, { ...pollData, votes: newVotes });
  }
}
