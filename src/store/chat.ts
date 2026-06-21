import { state } from '../services/yjs';

export function pushChatMessage(message: string, isCritical: boolean = false, isFailure: boolean = false) {
  state.chat.push([{ text: message, isCritical, isFailure, timestamp: Date.now() }]);
}
