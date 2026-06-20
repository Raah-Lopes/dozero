// src/components/Theater/hooks/useCastData.ts
import { useState, useEffect } from 'react';
import { useWiki } from '../../../hooks/useWiki';

export interface CastMember {
  nome: string;
  pv: number;
  pv_max: number;
  mana: number;
  mana_max: number;
  nivel: number;
  xp: number;
  ataque: number;
  defesa: number;
  armadura: number;
  velocidade: number;
  status: 'jogador' | 'npc' | 'inimigo';
  avatar?: string;
  caminhoArquivo: string;
  ativo?: boolean;
}

export function useCastData() {
  const { query, isLoading, refresh } = useWiki();
  const [members, setMembers] = useState<CastMember[]>([]);

  useEffect(() => {
    if (isLoading) return;

    // Fetch characters using a robust multi-criteria filter
    const validEntries = query().get().filter(e => {
      const tipo = String(e.metadata?.tipo || '').toLowerCase();
      const status = String(e.metadata?.status || '').toLowerCase();
      const path = e.path.toLowerCase();
      
      if (path.includes('_modelo')) return false;
      
      return ['pc', 'npc', 'monstro', 'personagem', 'jogador', 'inimigo'].includes(tipo) ||
             ['jogador', 'npc', 'inimigo'].includes(status) ||
             path.includes('/fichas/') ||
             path.includes('/personagens/');
    });

    const loaded: CastMember[] = validEntries.map(e => {
      const isPC = e.metadata.tipo === 'PC' || e.metadata.tipo === 'Personagem' || e.metadata.status === 'jogador';
      const isEnemy = e.metadata.tipo === 'Monstro' || e.metadata.status === 'inimigo';
      
      return {
        nome: e.metadata.titulo || e.metadata.nome || e.slug || 'Sem nome',
        pv: Number(e.metadata.pv) || Number(e.metadata.HP) || Number(e.metadata.pv_atual) || 0,
        pv_max: Number(e.metadata.pv_max) || Number(e.metadata.HP_max) || Number(e.metadata.pv) || Number(e.metadata.HP) || 1,
        mana: Number(e.metadata.mana) || Number(e.metadata.PM) || 0,
        mana_max: Number(e.metadata.mana_max) || Number(e.metadata.PM_max) || Number(e.metadata.mana) || Number(e.metadata.PM) || 0,
        nivel: Number(e.metadata.nivel) || Number(e.metadata.Nivel) || 1,
        xp: Number(e.metadata.xp) || Number(e.metadata.XP) || 0,
        ataque: Number(e.metadata.ataque) || Number(e.metadata.Ataque) || Number(e.metadata.F) || Number(e.metadata.PdF) || 0,
        defesa: Number(e.metadata.defesa) || Number(e.metadata.Defesa) || Number(e.metadata.A) || 0,
        armadura: Number(e.metadata.armadura) || Number(e.metadata.Armadura) || Number(e.metadata.A) || 0,
        velocidade: Number(e.metadata.velocidade) || Number(e.metadata.Velocidade) || Number(e.metadata.H) || 0,
        status: isPC ? 'jogador' : (isEnemy ? 'inimigo' : 'npc'),
        avatar: e.metadata.avatar || e.metadata.imagem || undefined,
        ativo: e.metadata.ativo !== false && e.metadata.ativo !== 'false',
        caminhoArquivo: e.path
      };
    }).filter(m => m.ativo !== false);

    setMembers(loaded);
  }, [query, isLoading]);

  const load = async () => {
    refresh();
  };

  const players = members.filter(m => m.status === 'jogador');
  const npcs = members.filter(m => m.status === 'npc');
  const enemies = members.filter(m => m.status === 'inimigo');

  return { members, players, npcs, enemies, loading: isLoading, reload: load };
}
