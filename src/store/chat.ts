import { state } from '../services/yjs';

function sanitizeHtml(html: string): string {
  // Strip <script> and <iframe> tags entirely
  let clean = html.replace(/<(script|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Strip inline event handlers (onXXXX=...)
  clean = clean.replace(/\s+on[a-z]+=(['"])(.*?)\1/gi, '');
  clean = clean.replace(/\s+on[a-z]+=[^\s>]+/gi, '');
  // Strip javascript: urls
  clean = clean.replace(/href=(['"])javascript:[^\1]*\1/gi, 'href="#"');
  return clean;
}

export function pushChatMessage(message: string, isCritical: boolean = false, isFailure: boolean = false) {
  state.chat.push([{ text: sanitizeHtml(message), isCritical, isFailure, timestamp: Date.now() }]);
}
