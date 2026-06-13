import { state } from '../store';

/**
 * Model Context Protocol (MCP) Interface for the AI Co-Narrator.
 * This file exposes the VTT's internal mechanics as strict callable tools
 * for an LLM Agent (acting as the Supervisor/Rules Agent).
 */

export const MCPRegistry = {
  /**
   * Applies damage to a specific token ID via CRDT.
   */
  applyDamage: (tokenId: string, damageAmount: number) => {
    const tokensMap = state.tokens;
    const token = tokensMap.get(tokenId) as any;
    if (token) {
      token.hp = Math.max(0, token.hp - damageAmount);
      tokensMap.set(tokenId, token); // Push delta to Yjs
      return `Success: Applied ${damageAmount} damage to ${tokenId}. HP is now ${token.hp}`;
    }
    return `Error: Token ${tokenId} not found.`;
  },

  /**
   * Pushes a narrative message to the Theater of the Mind ticker.
   */
  narrate: (text: string) => {
    const chatArray = state.chat;
    chatArray.push([{ type: 'narration', text, timestamp: Date.now() }]);
    return "Success: Narration pushed to screen.";
  },

  /**
   * Retrieves the current scene state (for RAG context building).
   */
  getSceneContext: () => {
    return {
      tokens: Array.from(state.tokens.entries()),
      activeMode: 'combat', // mock
      recentEvents: state.chat.slice(-5)
    };
  }
};

/**
 * Example of how an incoming LLM tool call payload would be executed
 */
export const executeMCPCall = (toolName: string, args: any[]) => {
  if (toolName in MCPRegistry) {
    const method = (MCPRegistry as any)[toolName];
    try {
      return method(...args);
    } catch (e: any) {
      return `MCP Tool Execution Failed: ${e.message}`;
    }
  }
  return `Error: Tool ${toolName} not found in MCP Registry.`;
};
