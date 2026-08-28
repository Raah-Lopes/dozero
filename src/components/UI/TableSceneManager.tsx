import React, { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, Grid, Play, Plus, Trash2, Users } from 'lucide-react';
import {
  activateTableScene,
  createTableScene,
  deleteTableScene,
  duplicateTableScene,
  getPlayerTableSceneState,
  getTableSceneState,
  initializeTableScenes,
  onTableScenesChanged,
  renameTableScene,
  setTableScenePlayerAccess,
  setTableScenePlayerVisibility,
  type TableSceneState,
} from '../../store/tableScenes';
import { useIsGM } from '../../store/user';
import { useAuthStore } from '../../store/authStore';
import { getCampaignMembers, getCampaigns, getLocalCampaignsCache, type CampaignMemberRecord } from '../../services/campaignCloudService';

export const TableSceneManager: React.FC = () => {
  const isGM = useIsGM();
  const userId = useAuthStore(state => state.user?.id);
  const [sceneState, setSceneState] = useState<TableSceneState>(() => isGM ? getTableSceneState() : getPlayerTableSceneState(userId));
  const [newSceneName, setNewSceneName] = useState('');
  const [members, setMembers] = useState<CampaignMemberRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);

  useEffect(() => {
    const synchronize = () => setSceneState(isGM ? initializeTableScenes() : getPlayerTableSceneState(userId));
    synchronize();
    return onTableScenesChanged(synchronize);
  }, [isGM, userId]);

  useEffect(() => {
    if (!isGM || !userId) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    const loadMembers = async () => {
      setMembersLoading(true);
      const roomCode = new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
      const campaign = getLocalCampaignsCache().find(item => item.room_code === roomCode)
        || (await getCampaigns(userId)).find(item => item.room_code === roomCode);
      const records = campaign ? await getCampaignMembers(campaign.id) : [];
      if (!cancelled) {
        setMembers(records.filter(member => member.role !== 'gm'));
        setMembersLoading(false);
      }
    };
    void loadMembers();
    return () => { cancelled = true; };
  }, [isGM, userId]);

  const createScene = () => {
    createTableScene(newSceneName);
    setNewSceneName('');
  };

  return (
    <section style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Grid size={14} /> Cenas da mesa ({sceneState.scenes.length})
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>{isGM ? 'sincronizadas nesta sala' : 'reveladas pelo Mestre'}</span>
      </div>

      {isGM ? (
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={newSceneName}
            onChange={event => setNewSceneName(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') createScene(); }}
            placeholder="Ex: Ruínas sob a chuva"
            aria-label="Nome da nova cena"
            style={{ flex: 1, minWidth: 0, padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
          />
          <button
            type="button"
            onClick={createScene}
            style={{ padding: '8px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            <Plus size={14} /> Criar cena
          </button>
        </div>
      ) : (
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Você acompanha a cena ativa e vê as cenas que o Mestre revelou.</p>
      )}

      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.7rem', lineHeight: 1.4 }}>
        Cada cena preserva mapa, tokens, objetos, desenhos, névoa, grid e combate. A mesa atual foi mantida como primeira cena.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
        {sceneState.scenes.map(scene => {
          const active = scene.id === sceneState.activeId;
          const playerVisible = scene.playerVisible !== false;
          const selectedPlayerIds = scene.playerIds || [];
          const memberControlDisabled = membersLoading || members.length === 0;
          return (
            <div key={scene.id}>
              <div style={{ background: active ? 'var(--accent-glow)' : 'var(--bg-secondary)', border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--glass-border)'}`, borderRadius: '6px', padding: '8px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                {isGM ? (
                  <button
                    type="button"
                    onClick={() => activateTableScene(scene.id)}
                    aria-label={active ? `Cena ativa: ${scene.name}` : `Ativar ${scene.name}`}
                    aria-pressed={active}
                    title={active ? 'Cena ativa' : `Ativar ${scene.name}`}
                    style={{ padding: '5px 7px', background: active ? 'var(--accent-primary)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--glass-border)', borderRadius: '5px', cursor: active ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Play size={12} fill={active ? 'currentColor' : 'none'} />
                  </button>
                ) : <Play size={12} aria-hidden="true" color={active ? 'var(--accent-primary)' : 'var(--text-secondary)'} />}
                {isGM ? (
                  <input
                    defaultValue={scene.name}
                    aria-label={`Nome da cena ${scene.name}`}
                    onBlur={event => renameTableScene(scene.id, event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                    style={{ flex: 1, minWidth: 0, background: 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: '0.8rem', fontWeight: active ? 700 : 500, outline: 'none' }}
                  />
                ) : <span style={{ flex: 1, minWidth: 0, color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: active ? 700 : 500 }}>{scene.name}</span>}
                {isGM && <>
                  <button
                    type="button"
                    disabled={active}
                    onClick={() => setTableScenePlayerVisibility(scene.id, !playerVisible)}
                    title={active ? 'A cena ativa é sempre visível aos jogadores' : playerVisible ? `Ocultar ${scene.name} dos jogadores` : `Revelar ${scene.name} aos jogadores`}
                    aria-label={active ? `Cena ativa visível aos jogadores: ${scene.name}` : playerVisible ? `Ocultar ${scene.name} dos jogadores` : `Revelar ${scene.name} aos jogadores`}
                    aria-pressed={playerVisible}
                    style={{ padding: '5px', background: 'transparent', color: playerVisible ? 'var(--accent-primary)' : 'var(--text-secondary)', border: '1px solid transparent', borderRadius: '4px', cursor: active ? 'not-allowed' : 'pointer', display: 'flex', opacity: active ? 0.6 : 1 }}
                  >{playerVisible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                  {!active && !playerVisible && <button
                    type="button"
                    disabled={memberControlDisabled}
                    onClick={() => setExpandedSceneId(expandedSceneId === scene.id ? null : scene.id)}
                    title={membersLoading ? 'Carregando membros autenticados' : members.length ? `Liberar ${scene.name} para membros específicos` : 'Nenhum membro autenticado nesta campanha'}
                    aria-label={`Permissões individuais de ${scene.name}`}
                    aria-expanded={expandedSceneId === scene.id}
                    style={{ padding: '5px', background: 'transparent', color: selectedPlayerIds.length ? 'var(--accent-primary)' : 'var(--text-secondary)', border: '1px solid transparent', borderRadius: '4px', cursor: memberControlDisabled ? 'not-allowed' : 'pointer', display: 'flex', opacity: memberControlDisabled ? 0.45 : 1 }}
                  ><Users size={13} /></button>}
                  <button type="button" onClick={() => duplicateTableScene(scene.id)} title={`Duplicar ${scene.name}`} aria-label={`Duplicar ${scene.name}`} style={{ padding: '5px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}><Copy size={13} /></button>
                  <button
                    type="button"
                    disabled={sceneState.scenes.length <= 1}
                    onClick={() => { if (confirm(`Excluir a cena \"${scene.name}\"?`)) deleteTableScene(scene.id); }}
                    title={sceneState.scenes.length <= 1 ? 'A mesa precisa ter ao menos uma cena' : `Excluir ${scene.name}`}
                    aria-label={`Excluir ${scene.name}`}
                    style={{ padding: '5px', background: 'transparent', color: sceneState.scenes.length <= 1 ? 'var(--text-secondary)' : 'var(--danger)', border: '1px solid transparent', borderRadius: '4px', cursor: sceneState.scenes.length <= 1 ? 'not-allowed' : 'pointer', display: 'flex', opacity: sceneState.scenes.length <= 1 ? 0.45 : 1 }}
                  ><Trash2 size={13} /></button>
                </>}
              </div>
              {isGM && expandedSceneId === scene.id && !playerVisible && (
                <div style={{ margin: '4px 0 0 30px', padding: '7px 8px', border: '1px solid var(--glass-border)', borderRadius: '5px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.67rem' }}>Liberada somente para membros autenticados:</span>
                  {members.map(member => {
                    const label = member.profile?.full_name || member.profile?.username || member.character_name || 'Jogador';
                    return <label key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.72rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedPlayerIds.includes(member.user_id)} onChange={event => setTableScenePlayerAccess(scene.id, member.user_id, event.target.checked)} />
                      {label}
                    </label>;
                  })}
                </div>
              )}
              {isGM && !active && !playerVisible && memberControlDisabled && (
                <p role="status" style={{ margin: '4px 0 0 30px', color: 'var(--text-secondary)', fontSize: '0.67rem' }}>
                  {membersLoading ? 'Carregando membros autenticados…' : userId ? 'Não há membros autenticados vinculados a esta campanha.' : 'Entre em uma conta e vincule a sala a uma campanha para liberar por membro.'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
