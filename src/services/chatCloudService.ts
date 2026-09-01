import { isSupabaseConfigured, supabase } from './supabase';
import { isCloudCoolingDown, noteCloudFailure, noteCloudSuccess } from './cloudHealth';

export interface CloudChatMessage {
  id?: string;
  campaign_id: string;
  user_id?: string | null;
  sender_name?: string;
  content: string;
  message_type?: 'chat' | 'roll' | 'system' | 'whisper';
  metadata?: Record<string, any>;
  created_at?: string;
}

/**
 * Salva mensagem de chat no Supabase em segundo plano (não bloqueia UI)
 */
export async function saveChatMessageToCloud(roomCode: string, msg: any, userId?: string | null) {
  if (!isSupabaseConfigured || !roomCode || !msg?.text || isCloudCoolingDown()) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  try {
    // O chat é uma melhoria de persistência, não uma dependência da mesa. A
    // sessão já está no storage local; getUser() força uma chamada a /auth/v1/user
    // e, durante uma queda de rede, polui o console a cada evento da mesa.
    const { data: auth } = await supabase.auth.getSession();
    const activeUserId = userId || auth.session?.user?.id;
    if (!activeUserId) {
      // Usuário não autenticado: opera local-first / P2P via Yjs sem disparar 401 no Supabase REST
      return;
    }

    const typeMap: Record<string, CloudChatMessage['message_type']> = {
      sistema: 'system',
      whisper: 'whisper',
      roll: 'roll',
      geral: 'chat',
      'in-game': 'chat',
    };

    const payload: CloudChatMessage = {
      campaign_id: roomCode,
      user_id: activeUserId,
      sender_name: msg.autor || (msg.tipo === 'sistema' ? 'Sistema' : 'Jogador'),
      content: msg.text,
      message_type: typeMap[msg.tipo] || 'chat',
      metadata: {
        isCritical: !!msg.isCritical,
        isFailure: !!msg.isFailure,
        autor_alias: msg.autor_alias,
        autor_color: msg.autor_color,
        alvo: msg.alvo,
        idioma: msg.idioma,
        timestamp: msg.timestamp || Date.now(),
      },
    };

    const { error } = await supabase.from('chat_messages').insert(payload);
    if (error) {
      noteCloudFailure(error);
      return;
    }
    noteCloudSuccess();
  } catch (err) {
    noteCloudFailure(err);
    // Fail silently in background to avoid disrupting live gameplay
    console.debug('[ChatCloud] Erro ao sincronizar mensagem:', err);
  }
}

/**
 * Carrega o histórico recente de mensagens de uma campanha/sala da nuvem
 */
export async function loadCampaignChatHistory(roomCode: string, limit = 50): Promise<CloudChatMessage[]> {
  if (!isSupabaseConfigured || !roomCode || isCloudCoolingDown()) return [];
  if (typeof navigator !== 'undefined' && !navigator.onLine) return [];

  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('campaign_id', roomCode)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      noteCloudFailure(error);
      return [];
    }
    noteCloudSuccess();
    return (data || []).reverse();
  } catch (err) {
    noteCloudFailure(err);
    return [];
  }
}

/**
 * Exporta o log de chat da sessão formatado como Markdown
 */
export function formatChatAsMarkdown(messages: any[], roomName: string): string {
  let md = `# Histórico de Sessão — Sala: ${roomName}\n`;
  md += `*Gerado em ${new Date().toLocaleString()}*\n\n---\n\n`;

  messages.forEach(m => {
    const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '';
    const sender = m.autor || (m.tipo === 'sistema' ? 'SISTEMA' : 'Jogador');
    const cleanText = (m.text || '').replace(/<[^>]*>?/gm, '');
    
    if (m.tipo === 'sistema') {
      md += `> ⚙️ **[${time}] ${cleanText}**\n\n`;
    } else if (m.tipo === 'whisper') {
      md += `🔒 *[${time}] (Sussurro) ${sender} ➜ ${m.alvo || 'Alguém'}:* ${cleanText}\n\n`;
    } else {
      md += `**[${time}] ${sender}:** ${cleanText}\n\n`;
    }
  });

  return md;
}
