import React from 'react';
import { Activity, BookOpen, Crown, DoorOpen, Download, Eye, FileJson, Image, LayoutDashboard, Lock, Menu, Pencil, Plus, Printer, ScrollText, Shield, Swords, Upload, Unlock, UserCog, UserPlus, Users, WandSparkles, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { createOrUpdateCampaign, getCampaigns, getCampaignMembers, removeCampaignMember, updateCampaignMemberRole } from '../../services/campaignCloudService';
import type { CampaignCloudRecord } from '../../services/campaignCloudService';
import { assignCampaignCharacter, createCampaignInvite, getMyPlatformRole, listCampaignCharacterAssignments, listCampaignInvites, listAdminAccounts, removeCampaignCharacterAssignment, revokeCampaignInvite, setAccountStatus, setPlatformAdmin, type CampaignCharacterAssignment } from '../../services/roomAccessService';
import { getCampaignCharacters, getVaultCharacters, importCharacterFromJson, importCharacterToCampaign, saveCharacter, type CharacterRecord } from '../../services/characterRepository';
import { exportCharactersJson, printCharacters } from '../../services/characterIntegration';
import './AdminCommandCenter.css';

type View = 'overview' | 'tables' | 'members' | 'accounts' | 'sheets' | 'system';
type TableDraft = Pick<CampaignCloudRecord, 'name' | 'system' | 'description' | 'cover_url' | 'is_public' | 'is_closed'>;

const nav = [
  { id: 'overview' as const, label: 'Visão geral', icon: LayoutDashboard },
  { id: 'tables' as const, label: 'Mesas do Reino', icon: Swords },
  { id: 'members' as const, label: 'Convites & Mestres', icon: UserCog },
  { id: 'accounts' as const, label: 'Contas da Instância', icon: Users },
  { id: 'sheets' as const, label: 'Fichas & Vínculos', icon: BookOpen },
  { id: 'system' as const, label: 'Sistema & Registro', icon: ScrollText },
];

const newTableDraft = (): TableDraft => ({
  name: '', system: 'Sistema agnóstico', description: '', cover_url: '/assets/vtt_layout_hero.jpg', is_public: false, is_closed: false,
});

async function imageFileToWebpDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  if (file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.');
  const sourceUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagem inválida.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Não foi possível converter esta imagem.'));
    element.src = sourceUrl;
  });
  const maxWidth = 1920;
  const maxHeight = 1080;
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL('image/webp', 0.86);
  if (!webp.startsWith('data:image/webp')) throw new Error('Seu navegador não conseguiu gerar WebP.');
  return webp;
}

export function AdminCommandCenter({ roomCode, scope = 'platform' }: { roomCode: string; scope?: 'platform' | 'campaign' }) {
  const { user, signOut } = useAuthStore();
  const [view, setView] = React.useState<View>('overview');
  const [open, setOpen] = React.useState(false);
  const [campaigns, setCampaigns] = React.useState<CampaignCloudRecord[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(null);
  const [members, setMembers] = React.useState<any[]>([]);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [notice, setNotice] = React.useState('');
  const [vault, setVault] = React.useState<CharacterRecord[]>([]);
  const [campaignSheets, setCampaignSheets] = React.useState<CharacterRecord[]>([]);
  const [assignments, setAssignments] = React.useState<CampaignCharacterAssignment[]>([]);
  const [invites, setInvites] = React.useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'gm' | 'player' | 'spectator'>('player');
  const [platformAllowed, setPlatformAllowed] = React.useState<boolean | null>(scope === 'campaign' ? true : null);
  const isLocalFounder = !!user?.email && ['raphaell.lops@gmail.com', 'rmirraine@gmail.com'].includes(user.email.toLowerCase()) && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const visibleNav = scope === 'platform' ? nav : nav.filter(item => item.id !== 'accounts');
  const selectedCampaign = campaigns.find(item => item.id === selectedCampaignId) || campaigns.find(item => item.room_code === roomCode) || campaigns[0];

  const reload = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const campaignsResult = await getCampaigns(user.id);
      const safeCampaigns = campaignsResult.length ? campaignsResult : [{ id: roomCode, room_code: roomCode, name: 'Mesa 0 — Ecossistema DOZERO', system: 'Sistema agnóstico', is_public: false, is_closed: false }];
      setCampaigns(safeCampaigns);
      const selected = safeCampaigns.find(campaign => campaign.id === selectedCampaignId)
        || safeCampaigns.find(campaign => campaign.room_code === roomCode)
        || safeCampaigns[0];
      if (selectedCampaignId !== selected.id) setSelectedCampaignId(selected.id);
      const [memberRows, accountRows, role, vaultRows, sheetRows, inviteRows, assignmentRows] = await Promise.all([
        getCampaignMembers(selected.id),
        scope === 'platform' ? listAdminAccounts() : Promise.resolve([]),
        getMyPlatformRole(),
        getVaultCharacters(user.id),
        getCampaignCharacters(selected.id, user.id),
        listCampaignInvites(selected.id),
        listCampaignCharacterAssignments(selected.id),
      ]);
      setMembers(memberRows); setAccounts(accountRows); setVault(vaultRows); setCampaignSheets(sheetRows); setInvites(inviteRows); setAssignments(assignmentRows);
      const allowed = role === 'admin' || isLocalFounder;
      setPlatformAllowed(scope === 'campaign' || allowed);
      if (scope === 'platform' && !allowed) setNotice('Esta área é exclusiva para administradores da plataforma.');
    } catch {
      if (scope === 'platform') setPlatformAllowed(null);
      setNotice('A central abriu, mas os dados remotos não responderam agora. Tente atualizar em alguns instantes.');
    }
  }, [isLocalFounder, roomCode, scope, selectedCampaignId, user?.id]);

  React.useEffect(() => { void reload(); }, [reload]);
  const activeCount = campaigns.filter(campaign => !campaign.is_closed).length;

  const selectCampaign = (campaignId: string, targetView?: View) => {
    setSelectedCampaignId(campaignId);
    if (targetView) setView(targetView);
  };
  const changeAccount = async (account: any, kind: 'status' | 'admin') => {
    try {
      if (kind === 'status') await setAccountStatus(account.id, account.status === 'suspended' ? 'active' : 'suspended');
      else await setPlatformAdmin(account.id, account.role !== 'admin');
      await reload();
    } catch { setNotice('A alteração não pôde ser salva agora.'); }
  };
  const saveTable = async (draft: TableDraft, current?: CampaignCloudRecord) => {
    if (!user?.id) return;
    try {
      const saved = await createOrUpdateCampaign({
        ...draft, id: current?.id, room_code: current?.room_code, owner_id: current?.owner_id,
        active_players_count: current?.active_players_count || 1,
      }, user.id);
      setSelectedCampaignId(saved.id);
      setNotice(current ? `Mesa “${saved.name}” atualizada.` : `Mesa “${saved.name}” criada.`);
      await reload();
    } catch { setNotice('Não foi possível salvar a configuração da mesa.'); }
  };
  const migrateSheet = async (sheet: CharacterRecord) => {
    if (!selectedCampaign || !user?.id) return;
    try { await importCharacterToCampaign(sheet.id, selectedCampaign.id, user.id); setNotice(`Ficha “${sheet.name}” copiada para ${selectedCampaign.name}.`); await reload(); }
    catch { setNotice('Não foi possível migrar esta ficha agora.'); }
  };
  const sendInvite = async () => {
    if (!selectedCampaign) return;
    try { await createCampaignInvite(selectedCampaign.id, inviteEmail, inviteRole); setInviteEmail(''); setNotice(`Convite salvo para ${selectedCampaign.name}.`); await reload(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível criar o convite.'); }
  };
  const changeMember = async (member: any, action: 'role' | 'remove') => {
    if (!selectedCampaign) return;
    const role = member.role === 'gm' ? 'player' : 'gm';
    const done = action === 'remove' ? await removeCampaignMember(selectedCampaign.id, member.user_id) : await updateCampaignMemberRole(selectedCampaign.id, member.user_id, role);
    setNotice(done ? action === 'remove' ? 'Participante removido da mesa.' : `Papel alterado para ${role === 'gm' ? 'mestre auxiliar' : 'jogador'}.` : 'Não foi possível atualizar o participante.');
    await reload();
  };
  const assignSheet = async (sheet: CharacterRecord, playerId: string) => {
    if (!selectedCampaign) return;
    try {
      if (playerId) await assignCampaignCharacter(selectedCampaign.id, sheet.id, playerId);
      else await removeCampaignCharacterAssignment(selectedCampaign.id, sheet.id);
      setNotice(playerId ? `Ficha “${sheet.name}” vinculada à conta selecionada.` : `Ficha “${sheet.name}” ficou sem controlador.`);
      await reload();
    } catch { setNotice('Não foi possível atualizar o vínculo da ficha agora.'); }
  };
  const importSheets = async (file: File) => {
    if (!user?.id) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const records = Array.isArray(parsed.characters) ? parsed.characters : [parsed.character || parsed];
      if (!records.length) throw new Error('Nenhuma ficha encontrada no arquivo.');
      for (const record of records) await importCharacterFromJson(JSON.stringify({ character: record }), user.id);
      setNotice(records.length + ' ficha(s) importada(s) para o Cofre pessoal. Migre-as para a mesa quando desejar.');
      await reload();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível importar este arquivo de fichas.'); }
  };
  const convertSheet = async (sheet: CharacterRecord) => {
    if (!user?.id) return;
    try {
      await saveCharacter({
        ...sheet,
        data: { ...(sheet.data || {}), sheetKind: 'dozero-core', sheetVersion: 1, convertedAt: new Date().toISOString(), source: (sheet.data as any)?.source || 'imported' },
      }, user.id);
      setNotice('Ficha “' + sheet.name + '” convertida para o formato DOZERO.');
      await reload();
    } catch { setNotice('Não foi possível converter esta ficha agora.'); }
  };

  return <div className="command-center">
    <aside className={`command-sidebar ${open ? 'is-open' : ''}`}>
      <div className="command-brand"><span className="command-brand-mark">D0</span><span><strong>DOZERO</strong><small>Central de Comando</small></span><button aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <nav aria-label="Navegação da Central">{visibleNav.map(item => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'is-active' : ''} onClick={() => { setView(item.id); setOpen(false); }}><Icon size={17} />{item.label}</button>; })}</nav>
      <div className="command-sidebar-bottom"><div><Crown size={16} /><span>{user?.email || 'Administrador'}</span></div><button onClick={() => void signOut()}><DoorOpen size={16} />Sair</button></div>
    </aside>
    {open ? <button aria-label="Fechar menu" className="command-backdrop" onClick={() => setOpen(false)} /> : null}
    <section className="command-content">
      <header className="command-topbar"><button className="command-menu" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu size={20} /></button><div><p>{scope === 'platform' ? 'INSTÂNCIA' : 'MESA'} · DOZERO</p><h1>{nav.find(item => item.id === view)?.label}</h1></div><button className="command-live" onClick={() => void reload()}><Activity size={15} />Atualizar</button></header>
      <main>
        {scope === 'platform' && platformAllowed === false ? <div className="command-notice" role="alert">Acesso reservado às contas administradoras da plataforma.</div> : scope === 'platform' && platformAllowed === null ? <div className="command-notice" role="status">Confirmando suas permissões administrativas…</div> : <>
          {notice ? <div className="command-notice" role="status">{notice}</div> : null}
          {view === 'overview' ? <Overview campaigns={campaigns} activeCount={activeCount} accounts={accounts} members={members} setView={setView} /> : null}
          {view === 'tables' ? <Tables campaigns={campaigns} selectedId={selectedCampaign?.id} onSelect={selectCampaign} onSave={saveTable} /> : null}
          {view === 'members' ? <Members selectedCampaign={selectedCampaign} campaigns={campaigns} onSelect={selectCampaign} members={members} invites={invites} inviteEmail={inviteEmail} inviteRole={inviteRole} setInviteEmail={setInviteEmail} setInviteRole={setInviteRole} sendInvite={sendInvite} changeMember={changeMember} revoke={async id => { try { await revokeCampaignInvite(id); setNotice('Convite revogado.'); await reload(); } catch { setNotice('Não foi possível revogar o convite.'); } }} /> : null}
          {view === 'accounts' ? <Accounts accounts={accounts} changeAccount={changeAccount} /> : null}
          {view === 'sheets' ? <Sheets selectedCampaign={selectedCampaign} campaigns={campaigns} onSelect={selectCampaign} vault={vault} campaignSheets={campaignSheets} members={members} assignments={assignments} migrateSheet={migrateSheet} assignSheet={assignSheet} importSheets={importSheets} convertSheet={convertSheet} /> : null}
          {view === 'system' ? <SystemStatus campaigns={campaigns} accounts={accounts} /> : null}
        </>}
      </main>
    </section>
  </div>;
}

function Overview({ campaigns, activeCount, accounts, members, setView }: { campaigns: CampaignCloudRecord[]; activeCount: number; accounts: any[]; members: any[]; setView: (view: View) => void }) {
  return <><section className="command-hero"><div><span>COMANDO DA INSTÂNCIA</span><h2>Seu reino está sob controle.</h2><p>Administre entrada, identidade visual, fichas e permissões sem sair do universo DOZERO.</p></div><Shield size={54} /></section><section className="command-stats"><Stat label="Mesas ativas" value={activeCount} icon={<Swords />} /><Stat label="Contas registradas" value={accounts.length || '—'} icon={<Users />} /><Stat label="Participantes da mesa" value={members.length || '—'} icon={<Activity />} /></section><section className="command-grid"><article className="command-panel"><header><div><span>GESTÃO</span><h3>Mesas recentes</h3></div><button onClick={() => setView('tables')}>Gerenciar mesas</button></header>{campaigns.slice(0, 5).map(campaign => <div className="command-row" key={campaign.id}><span className={campaign.is_closed ? 'dot muted' : 'dot'} /><div><strong>{campaign.name}</strong><small>{campaign.is_public ? 'No mural de jogadores' : 'Privada'} · {campaign.system}</small></div><em>{campaign.is_closed ? 'Bloqueada' : 'Aberta'}</em></div>)}</article><article className="command-panel"><header><div><span>OPERAÇÕES</span><h3>O que você controla</h3></div></header><p className="command-copy">Cada mesa pode ter nome, imagem, sistema, descrição, visibilidade pública e bloqueio de entrada. Convites e fichas são sempre configurados por mesa.</p><div className="command-security"><Shield size={20} /><span>Permissões persistidas e protegidas por RLS</span></div></article></section></>;
}
function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) { return <article className="command-stat"><div>{icon}</div><span>{label}</span><strong>{value}</strong></article>; }

function Tables({ campaigns, selectedId, onSelect, onSave }: { campaigns: CampaignCloudRecord[]; selectedId?: string; onSelect: (id: string, view?: View) => void; onSave: (draft: TableDraft, campaign?: CampaignCloudRecord) => Promise<void> }) {
  const [editingId, setEditingId] = React.useState<string | 'new' | null>(null);
  const editing = campaigns.find(item => item.id === editingId);
  const initial = editing ? { name: editing.name, system: editing.system, description: editing.description || '', cover_url: editing.cover_url || '', is_public: editing.is_public === true, is_closed: editing.is_closed === true } : newTableDraft();
  return <div className="command-table-layout"><section className="command-panel command-table"><header><div><span>GESTÃO</span><h3>Mesas do Reino</h3></div><button onClick={() => setEditingId('new')}><Plus size={15} />Nova mesa</button></header><div className="command-table-head"><span>Mesa</span><span>Visibilidade</span><span>Status</span><span>Ação</span></div>{campaigns.map(campaign => <div className={`command-table-row ${selectedId === campaign.id ? 'is-selected' : ''}`} key={campaign.id}><div><strong>{campaign.name}</strong><small>{campaign.system} · {campaign.room_code}</small></div><span>{campaign.is_public ? 'Mural público' : 'Só por convite'}</span><span className={campaign.is_closed ? 'badge muted' : 'badge'}>{campaign.is_closed ? 'Bloqueada' : 'Aberta'}</span><div className="command-row-actions"><button onClick={() => { onSelect(campaign.id); setEditingId(campaign.id); }}><Pencil size={14} />Configurar</button><a href={`/vtt.html?room=${encodeURIComponent(campaign.room_code)}`}>Abrir</a></div></div>)}</section>{editingId ? <TableEditor key={editingId} campaign={editing} initial={initial} onCancel={() => setEditingId(null)} onSave={async draft => { await onSave(draft, editing); setEditingId(null); }} /> : null}</div>;
}

function TableEditor({ campaign, initial, onCancel, onSave }: { campaign?: CampaignCloudRecord; initial: TableDraft; onCancel: () => void; onSave: (draft: TableDraft) => Promise<void> }) {
  const [draft, setDraft] = React.useState<TableDraft>(initial);
  const [saving, setSaving] = React.useState(false);
  const update = <K extends keyof TableDraft>(key: K, value: TableDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const useCoverFile = async (file?: File) => {
    if (!file) return;
    try { update('cover_url', await imageFileToWebpDataUrl(file)); }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Não foi possível usar esta imagem.'); }
  };
  return <section className="command-panel command-table-editor"><header><div><span>{campaign ? 'CONFIGURAÇÃO DA MESA' : 'NOVA MESA EM BRANCO'}</span><h3>{campaign ? campaign.name : 'Forjar uma aventura'}</h3></div><button onClick={onCancel}>Fechar</button></header><form className="command-form" onSubmit={async event => { event.preventDefault(); if (!draft.name.trim()) return; setSaving(true); try { await onSave({ ...draft, name: draft.name.trim(), system: draft.system.trim() || 'Sistema agnóstico' }); } finally { setSaving(false); } }}><label>Nome da mesa<input value={draft.name} onChange={event => update('name', event.target.value)} placeholder="Ex.: A Torre de Obsidiana" required /></label><label>Sistema<input value={draft.system} onChange={event => update('system', event.target.value)} placeholder="Sistema da campanha" /></label><label>Imagem da mesa <span className="command-label-hint"><Image size={13} /> URL, arquivo ou arrasto</span><input type="url" value={draft.cover_url} onChange={event => update('cover_url', event.target.value)} placeholder="https://..." /></label><div className="command-cover-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void useCoverFile(event.dataTransfer.files?.[0]); }}><input id="command-cover-file" type="file" accept="image/*" onChange={event => void useCoverFile(event.target.files?.[0])} /><label htmlFor="command-cover-file"><Upload size={17} />Enviar imagem do computador</label><span>ou solte uma imagem aqui · WebP automático · até 8 MB</span>{draft.cover_url ? <img src={draft.cover_url} alt="Prévia da capa da mesa" /> : null}</div><label>Descrição<textarea value={draft.description} onChange={event => update('description', event.target.value)} placeholder="Uma chamada curta para os jogadores." rows={3} /></label><div className="command-switches"><label><input type="checkbox" checked={draft.is_public} onChange={event => update('is_public', event.target.checked)} /><span><Eye size={16} />Exibir no Mural de Mesas</span><small>Jogadores autenticados poderão encontrar esta mesa na Taverna.</small></label><label><input type="checkbox" checked={draft.is_closed} onChange={event => update('is_closed', event.target.checked)} /><span>{draft.is_closed ? <Lock size={16} /> : <Unlock size={16} />}{draft.is_closed ? 'Mesa bloqueada' : 'Mesa aberta'}</span><small>Bloqueia novas entradas, sem remover participantes ou dados.</small></label></div>{!campaign ? <p className="command-empty-note">Mesa em branco: ela nasce sem fichas, personagens, nós, cenas ou conteúdo. Você decide o que migrar depois.</p> : null}<div className="command-form-actions"><button type="submit" disabled={saving}>{saving ? 'Salvando…' : campaign ? 'Salvar alterações' : 'Criar mesa vazia'}</button><button type="button" className="secondary" onClick={onCancel}>Cancelar</button></div></form></section>;
}

function TableSelector({ campaigns, selectedCampaign, onSelect }: { campaigns: CampaignCloudRecord[]; selectedCampaign?: CampaignCloudRecord; onSelect: (id: string) => void }) { return <label className="command-campaign-selector">Mesa em edição<select value={selectedCampaign?.id || ''} onChange={event => onSelect(event.target.value)}>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>; }

function Accounts({ accounts, changeAccount }: { accounts: any[]; changeAccount: (account: any, kind: 'status' | 'admin') => void }) { return <section className="command-panel command-table"><header><div><span>GESTÃO</span><h3>Contas da Instância</h3></div></header><p className="command-copy">Dê ou remova o papel administrativo das contas existentes e suspenda o acesso quando necessário. Fichas e mesas continuam preservadas ao suspender uma conta.</p>{accounts.length === 0 ? <p className="command-copy">As contas aparecerão aqui quando a conexão com o banco estiver disponível.</p> : accounts.map(account => <div className="command-account" key={account.id}><div className="command-avatar">{(account.full_name || account.username || '?').slice(0, 1).toUpperCase()}</div><div><strong>{account.full_name || account.username || 'Usuário'}</strong><small>{account.role === 'admin' ? 'Administrador' : 'Jogador'} · {account.status === 'suspended' ? 'Suspenso' : 'Ativo'}</small></div><div><button onClick={() => changeAccount(account, 'admin')}>{account.role === 'admin' ? 'Remover admin' : 'Tornar admin'}</button><button className={account.status === 'suspended' ? 'safe' : 'danger'} onClick={() => changeAccount(account, 'status')}>{account.status === 'suspended' ? 'Reativar' : 'Suspender'}</button></div></div>)}</section>; }

function Members({ selectedCampaign, campaigns, onSelect, members, invites, inviteEmail, inviteRole, setInviteEmail, setInviteRole, sendInvite, changeMember, revoke }: { selectedCampaign?: CampaignCloudRecord; campaigns: CampaignCloudRecord[]; onSelect: (id: string, view?: View) => void; members: any[]; invites: any[]; inviteEmail: string; inviteRole: 'gm' | 'player' | 'spectator'; setInviteEmail: (value: string) => void; setInviteRole: (value: 'gm' | 'player' | 'spectator') => void; sendInvite: () => void; changeMember: (member: any, action: 'role' | 'remove') => void; revoke: (id: string) => void }) {
  return <><TableSelector campaigns={campaigns} selectedCampaign={selectedCampaign} onSelect={id => onSelect(id, 'members')} /><div className="command-grid command-members-grid"><section className="command-panel"><header><div><span>PORTARIA DA MESA</span><h3>Convidar participante</h3></div><UserPlus size={20} /></header><div className="command-form"><label>E-mail<input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="jogador@exemplo.com" /></label><label>Papel<select value={inviteRole} onChange={event => setInviteRole(event.target.value as 'gm' | 'player' | 'spectator')}><option value="player">Jogador</option><option value="gm">Mestre auxiliar</option><option value="spectator">Espectador</option></select></label><button disabled={!inviteEmail.trim() || !selectedCampaign} onClick={sendInvite}>Salvar convite</button></div><p className="command-copy">O convite fica vinculado à mesa selecionada e só pode ser aceito pela conta daquele e-mail.</p></section><section className="command-panel"><header><div><span>CONVITES</span><h3>Pendentes e recentes</h3></div></header>{invites.length === 0 ? <p className="command-copy">Nenhum convite criado para esta mesa.</p> : invites.map(invite => <div className="command-row" key={invite.id}><span className={invite.revoked_at ? 'dot muted' : 'dot'} /><div><strong>{invite.email}</strong><small>{invite.role === 'gm' ? 'Mestre auxiliar' : invite.role === 'spectator' ? 'Espectador' : 'Jogador'} · {invite.accepted_at ? 'Aceito' : invite.revoked_at ? 'Revogado' : 'Aguardando'}</small></div>{!invite.accepted_at && !invite.revoked_at ? <button className="command-text-button" onClick={() => revoke(invite.id)}>Revogar</button> : null}</div>)}</section><section className="command-panel command-members-list"><header><div><span>PARTICIPANTES</span><h3>Quem pode entrar</h3></div></header>{members.length === 0 ? <p className="command-copy">Os participantes aparecerão quando a mesa responder.</p> : members.map(member => <div className="command-account" key={member.user_id}><div className="command-avatar">{(member.profile?.full_name || member.profile?.username || '?').slice(0, 1).toUpperCase()}</div><div><strong>{member.profile?.full_name || member.profile?.username || 'Participante'}</strong><small>{member.role === 'gm' ? 'Mestre auxiliar' : member.role === 'spectator' ? 'Espectador' : 'Jogador'}</small></div><div><button onClick={() => changeMember(member, 'role')}>{member.role === 'gm' ? 'Tornar jogador' : 'Tornar mestre'}</button><button className="danger" onClick={() => changeMember(member, 'remove')}>Remover</button></div></div>)}</section></div></>;
}

function Sheets({ selectedCampaign, campaigns, onSelect, vault, campaignSheets, members, assignments, migrateSheet, assignSheet, importSheets, convertSheet }: { selectedCampaign?: CampaignCloudRecord; campaigns: CampaignCloudRecord[]; onSelect: (id: string, view?: View) => void; vault: CharacterRecord[]; campaignSheets: CharacterRecord[]; members: any[]; assignments: CampaignCharacterAssignment[]; migrateSheet: (sheet: CharacterRecord) => void; assignSheet: (sheet: CharacterRecord, playerId: string) => void; importSheets: (file: File) => Promise<void>; convertSheet: (sheet: CharacterRecord) => Promise<void> }) {
  const importRef = React.useRef<HTMLInputElement>(null);
  const sheetCard = (sheet: CharacterRecord, actions: React.ReactNode) => <article key={sheet.id} className="command-sheet"><div className="command-sheet-heading">{sheet.avatar_url ? <img src={sheet.avatar_url} alt="" /> : <span>{sheet.name.slice(0, 1).toUpperCase()}</span>}<div><small>{sheet.type === 'pc' ? 'PERSONAGEM' : sheet.type.toUpperCase()}</small><h4>{sheet.name}</h4></div></div>{actions}</article>;
  return <><TableSelector campaigns={campaigns} selectedCampaign={selectedCampaign} onSelect={id => onSelect(id, 'sheets')} /><section className="command-panel command-table"><header><div><span>COFRE PESSOAL</span><h3>Fichas, importação e migração</h3></div><div className="command-header-actions"><input ref={importRef} type="file" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void importSheets(file); event.currentTarget.value = ''; }} /><button onClick={() => importRef.current?.click()}><Upload size={15} />Carregar ficha</button><button onClick={() => vault.length && exportCharactersJson(vault)} disabled={!vault.length}><Download size={15} />Exportar JSON</button><button onClick={() => vault.length && printCharacters(vault)} disabled={!vault.length}><Printer size={15} />PDF</button></div></header><p className="command-copy">Carregue fichas JSON do DOZERO, exporte uma cópia portável ou abra o PDF pelo diálogo de impressão. A migração cria uma cópia no destino, preservando a ficha fonte.</p>{vault.length === 0 ? <p className="command-copy">O cofre está vazio. Carregue uma ficha JSON ou crie-a na Forja Arcanum.</p> : <div className="command-sheet-grid">{vault.map(sheet => sheetCard(sheet, <><p>Pronta para {selectedCampaign?.name || 'a mesa selecionada'}.</p><div className="command-sheet-actions"><button onClick={() => migrateSheet(sheet)}>Migrar ficha</button><button onClick={() => exportCharactersJson([sheet])}><FileJson size={14} />JSON</button><button onClick={() => printCharacters([sheet])}><Printer size={14} />PDF</button><button onClick={() => void convertSheet(sheet)}><WandSparkles size={14} />Converter</button></div></>))}</div>}</section><section className="command-panel command-table command-sheet-management"><header><div><span>FICHAS DA CAMPANHA</span><h3>Vínculos com contas</h3></div></header>{campaignSheets.length === 0 ? <p className="command-copy">Esta mesa começa sem fichas. Migre uma ficha do cofre quando quiser incluí-la.</p> : <div className="command-sheet-grid">{campaignSheets.map(sheet => { const assignment = assignments.find(item => item.character_id === sheet.id); const owner = members.find(member => member.user_id === assignment?.player_id); return sheetCard(sheet, <><p>{assignment ? 'Controlada por ' + (owner?.profile?.full_name || owner?.profile?.username || 'conta vinculada') + '.' : 'Sem conta controladora.'}</p><label className="command-select-label">Conta controladora<select value={assignment?.player_id || ''} onChange={event => assignSheet(sheet, event.target.value)}><option value="">Sem controlador</option>{members.filter(member => member.role !== 'spectator').map(member => <option key={member.user_id} value={member.user_id}>{member.profile?.full_name || member.profile?.username || 'Jogador'}</option>)}</select></label><div className="command-sheet-actions"><button onClick={() => exportCharactersJson([sheet])}><FileJson size={14} />JSON</button><button onClick={() => printCharacters([sheet])}><Printer size={14} />PDF</button><button onClick={() => void convertSheet(sheet)}><WandSparkles size={14} />Converter</button></div></>); })}</div>}</section></>;
}

function SystemStatus({ campaigns, accounts }: { campaigns: CampaignCloudRecord[]; accounts: any[] }) { return <section className="command-grid"><article className="command-panel"><header><div><span>REGISTRO</span><h3>Estado da instância</h3></div></header><div className="command-status-list"><div><Activity /><span>Campanhas disponíveis</span><strong>{campaigns.length}</strong></div><div><Eye /><span>Mesas no Mural</span><strong>{campaigns.filter(campaign => campaign.is_public && !campaign.is_closed).length}</strong></div><div><Users /><span>Contas carregadas</span><strong>{accounts.length}</strong></div><div><Shield /><span>Proteção de acesso</span><strong>Ativa</strong></div></div></article><article className="command-panel"><header><div><span>MIGRAÇÃO SEGURA</span><h3>Dados e continuidade</h3></div></header><p className="command-copy">Use “Fichas & Vínculos” para copiar fichas do cofre para qualquer mesa e escolher qual conta as controla. Essa migração não apaga o original, mantém o histórico local-first e depende das permissões RLS da campanha.</p></article></section>; }
