import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Copy, Plus, Shield, Trash2, UserRound, Users, X } from 'lucide-react';
import ArcanumSheet from './Arcanum/ArcanumSheetApp';
import { DEFAULT_CHARACTER, type Character, type RollResult } from './Arcanum/lib';
import { usePersonagens } from '../../hooks/usePersonagens';
import {
  deleteCharacter,
  getCampaignCharacters,
  getVaultCharacters,
  saveCharacter,
  type CharacterRecord,
} from '../../services/characterRepository';
import { state } from '../../services/yjs';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../UI/Toast';
import { WorkspaceChrome } from '../Navigation/WorkspaceChrome';
import { ARCANUM_SHEET_KIND, characterFromRecord, recordData } from './arcanumSheetAdapter';
import './arcanumWorkspace.css';

interface Props {
  campaignId: string;
  initialCharacterId?: string | null;
  initialScope?: 'campaign' | 'vault';
  onClose: () => void;
}

export function ArcanumSheetsWorkspace({ campaignId, initialCharacterId, initialScope = 'campaign', onClose }: Props) {
  const { user } = useAuthStore();
  const { personagens } = usePersonagens();
  const [records, setRecords] = useState<CharacterRecord[]>([]);
  const [active, setActive] = useState<CharacterRecord | null>(null);
  const [scope, setScope] = useState<'campaign' | 'vault'>(initialScope);
  const [loading, setLoading] = useState(true);

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
    const refreshFromRoom = () => void load();
    state.sheets.observe(refreshFromRoom);
    return () => state.sheets.unobserve(refreshFromRoom);
  }, [load]);

  useEffect(() => setScope(initialScope), [initialScope]);

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
    setRecords((current) => [copy, ...current]);
    toast.success('Cópia salva no Vault.');
  };

  const removeActive = async () => {
    if (!active || !window.confirm(`Excluir a ficha "${active.name}"?`)) return;
    await deleteCharacter(active.id, user?.id);
    state.sheets.delete(active.id);
    setRecords((current) => current.filter((record) => record.id !== active.id));
    setActive(null);
    toast.info('Ficha removida.');
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
        <WorkspaceChrome
          className="arcanum-ecosystem-bar no-print"
          title="Ficha Arcanum"
          subtitle={active.campaign_id ? 'Ficha da mesa' : 'Ficha do vault'}
          icon={<Shield size={22} />}
          navigation={(
            <>
              <button className="workspace-chrome-button" onClick={() => setActive(null)}><X size={15} /> Lista</button>
              <label>
                <BookOpen size={14} />
                <select value={wikiPath} onChange={(event) => void updateWikiLink(event.target.value)} aria-label="Vincular ficha a uma nota do Códice">
                  <option value="">Sem vínculo no Códice</option>
                  {personagens.map((personagem) => <option key={personagem.caminhoArquivo} value={personagem.caminhoArquivo}>{personagem.nome}</option>)}
                </select>
              </label>
            </>
          )}
          actions={(
            <>
              {wikiPath && <button className="workspace-chrome-button" onClick={() => window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: wikiPath } }))}><BookOpen size={14} /> Abrir Códice</button>}
              <button className="workspace-chrome-button" onClick={spawnToken}><Shield size={14} /> Criar token</button>
              {active.campaign_id && <button className="workspace-chrome-button" onClick={() => void duplicateToVault()}><Copy size={14} /> Salvar no Vault</button>}
              <button className="workspace-chrome-button workspace-chrome-button--danger" onClick={() => void removeActive()}><Trash2 size={14} /> Excluir</button>
            </>
          )}
        />
        <div className="arcanum-editor-scroll">
          <ArcanumSheet
            key={active.id}
            initialCharacter={characterFromRecord(active)}
            onSave={persistCharacter}
            onClose={() => setActive(null)}
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
        subtitle="Ecossistema DOZERO · modelos de personagens"
        icon={<Shield size={22} />}
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
