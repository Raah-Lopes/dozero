import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Copy, Plus, Shield, Trash2, UserRound, Users, X, LayoutGrid, ScrollText } from 'lucide-react';
import ArcanumSheet from './Arcanum/ArcanumSheetApp';
import { DEFAULT_CHARACTER, type Character, type RollResult } from './Arcanum/lib';
import { usePersonagens } from '../../hooks/usePersonagens';
import {
  deleteCharacter,
  getCampaignCharacters,
  getLocalCharacters,
  getVaultCharacters,
  saveCharacter,
  type CharacterRecord,
} from '../../services/characterRepository';
import { state } from '../../services/yjs';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../UI/Toast';
import { WorkspaceChrome } from '../Navigation/WorkspaceChrome';
import { LoreWorkspaceSwitcher } from '../Navigation/LoreWorkspaceSwitcher';
import { ARCANUM_SHEET_KIND, characterFromRecord, recordData } from './arcanumSheetAdapter';
import { createCharacterFromWiki, findCharacterByWikiPath, integrateCharacter, removeCharacterIntegration } from '../../services/characterIntegration';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import './arcanumWorkspace.css';

interface Props {
  campaignId: string;
  initialCharacterId?: string | null;
  initialScope?: 'campaign' | 'vault';
  onClose: () => void;
}

export function ArcanumSheetsWorkspace({ campaignId, initialCharacterId, initialScope = 'campaign', onClose }: Props) {
  const { user } = useAuthStore();
  const { personagens } = usePersonagens(false);
  const [records, setRecords] = useState<CharacterRecord[]>(getLocalCharacters);
  const [active, setActive] = useState<CharacterRecord | null>(null);
  const [scope, setScope] = useState<'campaign' | 'vault'>(initialScope);
  const [loading, setLoading] = useState(() => getLocalCharacters().length === 0);
  const importingWikiPaths = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true);
    const [campaign, vault] = await Promise.all([
      getCampaignCharacters(campaignId, user?.id),
      getVaultCharacters(user?.id),
    ]);
    const sharedCampaign = Array.from(state.sheets.values()).filter((record: unknown) => {
      const value = record as Partial<CharacterRecord>;
      return value.campaign_id === campaignId;
    }) as CharacterRecord[];
    const all = [...sharedCampaign, ...campaign, ...vault].filter((record, index, list) => list.findIndex((item) => item.id === record.id) === index);
    setRecords(all);
    setActive((current) => all.find((record) => record.id === (initialCharacterId || current?.id)) || null);
    setLoading(false);
  }, [campaignId, initialCharacterId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refreshFromRoom = () => {
      const sharedCampaign = Array.from(state.sheets.values()).filter((record: unknown) => {
        const value = record as Partial<CharacterRecord>;
        return value.campaign_id === campaignId;
      }) as CharacterRecord[];
      setRecords((current) => {
        const map = new Map<string, CharacterRecord>();
        current.forEach((r) => map.set(r.id, r));
        sharedCampaign.forEach((r) => map.set(r.id, r));
        return Array.from(map.values());
      });
    };
    state.sheets.observe(refreshFromRoom);
    return () => state.sheets.unobserve(refreshFromRoom);
  }, [campaignId]);

  useEffect(() => setScope(initialScope), [initialScope]);

  useEffect(() => {
    if (loading || personagens.length === 0) return;
    const missing = personagens.filter(personagem =>
      !findCharacterByWikiPath(records.filter(record => record.campaign_id === null), personagem.caminhoArquivo)
      && !importingWikiPaths.current.has(personagem.caminhoArquivo)
    );
    if (missing.length === 0) return;

    missing.forEach(personagem => importingWikiPaths.current.add(personagem.caminhoArquivo));
    void Promise.all(missing.map(async personagem => {
      const metadata = {
        ...personagem,
        nome: personagem.nome,
        tipo: personagem.status === 'jogador' ? 'pc' : personagem.status === 'inimigo' ? 'monstro' : 'npc',
        imagem: personagem.avatar,
      };
      const rawContent = WikiIndexer.getRawContent(personagem.caminhoArquivo);
      const saved = await saveCharacter(
        createCharacterFromWiki(metadata, personagem.caminhoArquivo, null, user?.id, rawContent),
        user?.id,
      );
      integrateCharacter(saved);
      return saved;
    })).then(imported => {
      setRecords(current => [...imported, ...current].filter((record, index, list) =>
        list.findIndex(item => item.id === record.id) === index
      ));
      toast.success(`${imported.length} ficha(s) da Wiki integrada(s) ao seu Vault.`);
    }).finally(() => {
      missing.forEach(personagem => importingWikiPaths.current.delete(personagem.caminhoArquivo));
    });
  }, [campaignId, loading, personagens, records, user?.id]);

  const createSheet = async () => {
    const character = { ...structuredClone(DEFAULT_CHARACTER), name: 'Nova personagem', gallery: [], affiliations: [] };
    const saved = await saveCharacter({
      name: character.name,
      type: 'pc',
      campaign_id: scope === 'campaign' ? campaignId : null,
      avatar_url: character.avatar,
      notes_markdown: character.notes,
      data: { sheetKind: ARCANUM_SHEET_KIND, sheetVersion: 1, wikiPath: '', character },
    }, user?.id);
    if (saved.campaign_id) state.sheets.set(saved.id, saved);
    integrateCharacter(saved);
    setRecords((current) => [saved, ...current]);
    setActive(saved);
    toast.success('Nova ficha Arcanum criada.');
  };

  const persistCharacter = useCallback(async (character: Character) => {
    if (!active) return;
    const saved = await saveCharacter({
      ...active,
      name: character.name || 'Sem nome',
      avatar_url: character.avatar,
      notes_markdown: character.notes,
      data: recordData(active, character),
    }, user?.id);
    if (saved.campaign_id) state.sheets.set(saved.id, saved);
    integrateCharacter(saved);
    Array.from(state.tokens.entries()).forEach(([tokenId, rawToken]) => {
      const token = rawToken as Record<string, unknown>;
      if (token.characterId !== saved.id) return;
      state.tokens.set(tokenId, {
        ...token,
        name: saved.name,
        imageUrl: character.avatar,
        hp: character.vitals[0]?.value || 0,
        maxHp: character.vitals[0]?.max || 0,
        mana: character.vitals[1]?.value || 0,
        maxMana: character.vitals[1]?.max || 0,
        wikiPath: String(saved.data?.wikiPath || ''),
      });
    });
    setActive(saved);
    setRecords((current) => current.map((record) => record.id === saved.id ? saved : record));
  }, [active, user?.id]);

  const updateWikiLink = async (wikiPath: string) => {
    if (!active) return;
    const character = characterFromRecord(active);
    const saved = await saveCharacter({ ...active, data: recordData(active, character, wikiPath) }, user?.id);
    if (saved.campaign_id) state.sheets.set(saved.id, saved);
    integrateCharacter(saved);
    Array.from(state.tokens.entries()).forEach(([tokenId, rawToken]) => {
      const token = rawToken as Record<string, unknown>;
      if (token.characterId === saved.id) state.tokens.set(tokenId, { ...token, wikiPath });
    });
    setActive(saved);
    setRecords((current) => current.map((record) => record.id === saved.id ? saved : record));
    toast.success(wikiPath ? 'Ficha vinculada ao Códice.' : 'Vínculo com o Códice removido.');
  };

  const duplicateToVault = async () => {
    if (!active) return;
    const copy = await saveCharacter({ ...active, id: undefined, campaign_id: null, name: `${active.name} (Vault)` }, user?.id);
    integrateCharacter(copy);
    setRecords((current) => [copy, ...current]);
    toast.success('Cópia salva no Vault.');
  };

  const removeActive = async () => {
    if (!active || !window.confirm(`Excluir a ficha "${active.name}"?`)) return;
    removeCharacterIntegration(active);
    await deleteCharacter(active.id, user?.id);
    state.sheets.delete(active.id);
    setRecords((current) => current.filter((record) => record.id !== active.id));
    setActive(null);
    toast.info('Ficha removida.');
  };

  const integrateActiveEverywhere = () => {
    if (!active) return;
    integrateCharacter(active, { lineage: true, timeline: true });
    toast.success(`"${active.name}" integrado ao Códice, Linhagem e Chronos.`);
  };

  const spawnToken = () => {
    if (!active) return;
    const character = characterFromRecord(active);
    const hp = character.vitals[0];
    const mana = character.vitals[1];
    const id = `token_sheet_${Date.now()}`;
    state.tokens.set(id, {
      id,
      x: 500,
      y: 500,
      name: character.name,
      type: 'player',
      characterId: active.id,
      wikiPath: String(active.data?.wikiPath || ''),
      imageUrl: character.avatar,
      hp: hp?.value || 0,
      maxHp: hp?.max || 0,
      mana: mana?.value || 0,
      maxMana: mana?.max || 0,
      showName: true,
      hpBarMode: 'always',
      ownerId: user?.id,
    });
    toast.success(`Token de "${character.name}" criado na mesa.`);
  };

  const sendRollToChat = (roll: RollResult) => {
    const name = active?.name || 'Personagem';
    state.chat.push([{
      text: `🎲 <b>${name}</b> rolou <b>${roll.label}</b>: ${roll.formula} = <b>${roll.total}</b>`,
      timestamp: Date.now(),
      isCritical: roll.kind === 'crit',
      isFailure: roll.kind === 'fumble',
    }]);
  };

  const visibleRecords = records.filter((record) => scope === 'vault' ? record.campaign_id === null : record.campaign_id === campaignId);

  if (active) {
    const wikiPath = String(active.data?.wikiPath || '');
    return (
      <div className="arcanum-host">
        <div className="arcanum-editor-scroll">
          <ArcanumSheet
            key={active.id}
            initialCharacter={characterFromRecord(active)}
            wikiPath={wikiPath}
            personagens={personagens}
            onUpdateWikiLink={updateWikiLink}
            onSpawnToken={spawnToken}
            onDuplicateToVault={active.campaign_id ? duplicateToVault : undefined}
            onIntegrateEverywhere={integrateActiveEverywhere}
            onDelete={removeActive}
            onSave={persistCharacter}
            onClose={() => setActive(null)}
            onExitToCanvas={onClose}
            onNew={() => void createSheet()}
            onRoll={sendRollToChat}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="arcanum-library">
      <WorkspaceChrome
        className="arcanum-library-chrome"
        title="Forja de Fichas"
        subtitle="Ecossistema DOZERO · Modelos de personagens"
        icon={<ScrollText size={22} />}
        navigation={(
          <>
            <button className="workspace-chrome-button" onClick={onClose} title="Voltar ao Mapa / Mesa">
              <LayoutGrid size={15} /> Mesa
            </button>
            <LoreWorkspaceSwitcher current="sheets" />
          </>
        )}
        actions={<button className="arcanum-close workspace-chrome-icon-button" onClick={onClose} aria-label="Voltar para a mesa"><X size={20} /></button>}
      />
      <div className="arcanum-library-actions">
        <div className="arcanum-scope-tabs">
          <button className={scope === 'campaign' ? 'active' : ''} onClick={() => setScope('campaign')}><Users size={15} /> Mesa atual</button>
          <button className={scope === 'vault' ? 'active' : ''} onClick={() => setScope('vault')}><UserRound size={15} /> Meu Vault</button>
        </div>
        <button className="arcanum-create" onClick={() => void createSheet()}><Plus size={16} /> Criar ficha Arcanum</button>
      </div>
      <main className="arcanum-card-grid">
        {loading && <p className="arcanum-empty">Carregando fichas...</p>}
        {!loading && visibleRecords.length === 0 && <p className="arcanum-empty">Nenhuma ficha neste espaço. A Forja está pronta para a primeira.</p>}
        {visibleRecords.map((record) => {
          const character = characterFromRecord(record);
          return (
            <button key={record.id} className="arcanum-sheet-card" onClick={() => setActive(record)}>
              <img src={character.avatar} alt="" />
              <span className="arcanum-card-kind">ARCANUM</span>
              <strong>{character.name}</strong>
              <small>{character.system} · Nível {character.level}</small>
            </button>
          );
        })}
      </main>
    </div>
  );
}
