import { state, pushChatMessage } from '../store';
import { getCombatEncounters } from './encounterCloudService';
import { toast } from '../components/UI/Toast';

export interface SessionChronicleStats {
  totalMessages: number;
  totalRolls: number;
  criticalSuccesses: number;
  criticalFailures: number;
  encountersCount: number;
  victoriesCount: number;
  tokensActive: number;
}

/**
 * Gera a Crônica em formato Markdown estruturado para a sessão atual
 */
export async function generateSessionChronicle(roomCode: string, campaignName?: string): Promise<{ markdown: string; stats: SessionChronicleStats }> {
  const chatMessages = state.chat.toArray() as Array<{ text?: string; content?: string; isCritical?: boolean; isFailure?: boolean; timestamp?: number }>;
  const tokens = Array.from(state.tokens.values());
  const encounters = await getCombatEncounters(roomCode);

  let totalRolls = 0;
  let criticalSuccesses = 0;
  let criticalFailures = 0;
  const highlights: string[] = [];

  chatMessages.forEach(msg => {
    const raw = msg.text || msg.content || '';
    const clean = raw.replace(/<[^>]*>?/gm, '').trim();

    if (/rolou|resultado|dado|1d20|🎲/i.test(clean)) {
      totalRolls++;
    }

    if (msg.isCritical || /crítico|acerto crítico|20 natural/i.test(clean)) {
      criticalSuccesses++;
      if (clean && !highlights.includes(clean)) {
        highlights.push(`✨ **Sucesso Épico:** ${clean}`);
      }
    }

    if (msg.isFailure || /falha crítica|1 natural/i.test(clean)) {
      criticalFailures++;
      if (clean && !highlights.includes(clean)) {
        highlights.push(`💀 **Revés Crítico:** ${clean}`);
      }
    }
  });

  const victories = encounters.filter(e => e.outcome === 'victory').length;
  const heroes = tokens.filter(t => t.status === 'player' || t.status === 'hero');
  const enemies = tokens.filter(t => t.status === 'npc' || t.status === 'enemy');

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const md = [
    `# 📜 Crônica da Sessão — ${campaignName || 'Mesa Dozero'}`,
    `*Registrada em ${dateStr} às ${timeStr} | Sala: \`${roomCode}\`*`,
    '',
    '---',
    '',
    '## 📊 Estatísticas da Sessão',
    `- 🎲 **Rolagens de Dados:** ${totalRolls}`,
    `- 🌟 **Acertos Críticos / Sucessos Épicos:** ${criticalSuccesses}`,
    `- ⚠️ **Falhas Críticas / Reveses:** ${criticalFailures}`,
    `- ⚔️ **Encontros de Batalha Registrados:** ${encounters.length} (${victories} vitórias)`,
    `- 👥 **Heróis Presentes na Mesa:** ${heroes.length}`,
    `- 🐉 **Criaturas / Inimigos no Tabuleiro:** ${enemies.length}`,
    '',
    '---',
    '',
    '## 🛡️ Heróis da Mesa',
    heroes.length > 0
      ? heroes.map(h => `- **${h.name}** (PV: ${h.hp}/${h.maxHp || h.hp} | CA: ${h.defesa || 10})`).join('\n')
      : '- *Nenhum personagem de jogador posicionado no tabuleiro no momento.*',
    '',
    '---',
    '',
    '## ⚔️ Desfechos de Batalha',
    encounters.length > 0
      ? encounters.map(e => `- **${e.name}**: ${e.outcome === 'victory' ? '🏆 Vitória' : e.outcome === 'defeat' ? '💀 Derrota' : e.outcome === 'escaped' ? '🏃 Fuga' : '⚔️ Em Andamento'} (${e.round_count || 1} rodadas)`).join('\n')
      : '- *Nenhum combate registrado formalmente nesta sessão.*',
    '',
    '---',
    '',
    '## 🌟 Momentos Marcantes & Destaques de Dados',
    highlights.length > 0
      ? highlights.slice(0, 10).map(h => `- ${h}`).join('\n')
      : '- *Sessão transcorreu sem acertos ou falhas críticas extremas.*',
    '',
    '---',
    `*Gerado automaticamente pelo ecossistema DOZERO VTT.*`
  ].join('\n');

  const stats: SessionChronicleStats = {
    totalMessages: chatMessages.length,
    totalRolls,
    criticalSuccesses,
    criticalFailures,
    encountersCount: encounters.length,
    victoriesCount: victories,
    tokensActive: tokens.length
  };

  return { markdown: md, stats };
}

/**
 * Publica um resumo da Crônica diretamente no chat da mesa
 */
export function publishChronicleToChat(markdown: string) {
  pushChatMessage(
    `📜 <b>CRÔNICA DA SESSÃO:</b><br/><pre style="font-size:0.75rem; white-space:pre-wrap; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; margin-top:4px;">${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
    true,
    false
  );
  toast.success('Crônica da sessão compartilhada no chat da mesa!');
}

/**
 * Faz o download do arquivo de crônica .md
 */
export function downloadChronicleMarkdown(markdown: string, filename?: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Cronica_Sessao_${new Date().toISOString().slice(0,10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Arquivo Markdown da crônica baixado!');
}
