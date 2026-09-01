import React from 'react';
import { Activity, BookOpen, Crown, DoorOpen, LayoutDashboard, Menu, ScrollText, Shield, Swords, UserCog, UserPlus, Users, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getCampaigns, getCampaignMembers, removeCampaignMember, updateCampaignMemberRole } from '../../services/campaignCloudService';
import { assignCampaignCharacter, createCampaignInvite, getMyPlatformRole, listCampaignCharacterAssignments, listCampaignInvites, listAdminAccounts, revokeCampaignInvite, setAccountStatus, setPlatformAdmin, type CampaignCharacterAssignment } from '../../services/roomAccessService';
import type { CampaignCloudRecord } from '../../services/campaignCloudService';
import { getCampaignCharacters, getVaultCharacters, importCharacterToCampaign, type CharacterRecord } from '../../services/characterRepository';
import './AdminCommandCenter.css';

type View = 'overview' | 'tables' | 'members' | 'accounts' | 'sheets' | 'system';

const nav = [
  { id: 'overview' as const, label: 'Visão geral', icon: LayoutDashboard },
  { id: 'tables' as const, label: 'Mesas do Reino', icon: Swords },
  { id: 'members' as const, label: 'Convites & Mestres', icon: UserCog },
  { id: 'accounts' as const, label: 'Contas da Instância', icon: Users },
  { id: 'sheets' as const, label: 'Fichas & Vínculos', icon: BookOpen },
  { id: 'system' as const, label: 'Sistema & Registro', icon: ScrollText },
];

export function AdminCommandCenter({ roomCode, scope = 'platform' }: { roomCode: string; scope?: 'platform' | 'campaign' }) {
  const { user, signOut } = useAuthStore();
  const [view, setView] = React.useState<View>('overview');
  const [open, setOpen] = React.useState(false);
  const [campaigns, setCampaigns] = React.useState<CampaignCloudRecord[]>([]);
  const [members, setMembers] = React.useState<any[]>([]);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [notice, setNotice] = React.useState('');
  const [vault, setVault] = React.useState<CharacterRecord[]>([]);
  const [campaignSheets, setCampaignSheets] = React.useState<CharacterRecord[]>([]);
  const [assignments, setAssignments] = React.useState<CampaignCharacterAssignment[]>([]);
  const [invites, setInvites] = React.useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'gm' | 'player' | 'spectator'>('player');
  const [platformAllowed, setPlatformAllowed] = React.useState(scope === 'campaign');
  const isLocalFounder = !!user?.email && ['raphaell.lops@gmail.com', 'rmirraine@gmail.com'].includes(user.email.toLowerCase()) && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const visibleNav = scope === 'platform' ? nav : nav.filter(item => item.id !== 'accounts');

  const reload = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const campaignsResult = await getCampaigns(user.id);
      const safeCampaigns = campaignsResult.length ? campaignsResult : [{ id: roomCode, room_code: roomCode, name: 'Mesa 0 — Ecossistema DOZERO', system: 'Sistema agnóstico', is_closed: false }];
      setCampaigns(safeCampaigns);
      const selected = safeCampaigns.find(campaign => campaign.room_code === roomCode) || safeCampaigns[0];
      const [memberRows, accountRows, role, vaultRows, sheetRows, inviteRows, assignmentRows] = await Promise.all([
        getCampaignMembers(selected.id),
        scope === 'platform' ? listAdminAccounts() : Promise.resolve([]),
        getMyPlatformRole(),
        getVaultCharacters(user.id),
        getCampaignCharacters(selected.id, user.id),
        listCampaignInvites(selected.id),
        listCampaignCharacterAssignments(selected.id),
      ]);
      setMembers(memberRows); setVault(vaultRows); setCampaignSheets(sheetRows); setInvites(inviteRows); setAssignments(assignmentRows);
      setAccounts(accountRows);
      const allowed = role === 'admin' || isLocalFounder;
      setPlatformAllowed(scope === 'campaign' || allowed);
      if (scope === 'platform' && !allowed) setNotice('Esta área é exclusiva para administradores da plataforma.');
      else if (role !== 'admin') setNotice('Sua sessão está em modo de administração local; a confirmação remota ainda está indisponível.');
    } catch {
      setNotice('O painel está disponível, mas os dados remotos não responderam agora.');
    }
  }, [isLocalFounder, roomCode, scope, user?.id]);

  React.useEffect(() => { void reload(); }, [reload]);
  const activeCount = campaigns.filter(campaign => !campaign.is_closed).length;
  const changeAccount = async (account: any, kind: 'status' | 'admin') => {
    try {
      if (kind === 'status') await setAccountStatus(account.id, account.status === 'suspended' ? 'active' : 'suspended');
      else await setPlatformAdmin(account.id, account.role !== 'admin');
      await reload();
    } catch { setNotice('A alteração será possível assim que a conexão com o Supabase normalizar.'); }
  };
  const migrateSheet = async (sheet: CharacterRecord) => {
    const campaign = campaigns.find(item => item.room_code === roomCode) || campaigns[0];
    if (!campaign || !user?.id) return;
    try { await importCharacterToCampaign(sheet.id, campaign.id, user.id); setNotice(`Ficha “${sheet.name}” copiada para ${campaign.name}.`); await reload(); }
    catch { setNotice('Não foi possível migrar esta ficha agora.'); }
  };
  const selectedCampaign = campaigns.find(item => item.room_code === roomCode) || campaigns[0];
  const sendInvite = async () => {
    if (!selectedCampaign) return;
    try {
      await createCampaignInvite(selectedCampaign.id, inviteEmail, inviteRole);
      setInviteEmail(''); setNotice('Convite salvo. Ele aparecerá para a pessoa ao entrar com este e-mail.'); await reload();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível criar o convite.'); }
  };
  const changeMember = async (member: any, action: 'role' | 'remove') => {
    if (!selectedCampaign) return;
    const role = member.role === 'gm' ? 'player' : 'gm';
    const done = action === 'remove'
      ? await removeCampaignMember(selectedCampaign.id, member.user_id)
      : await updateCampaignMemberRole(selectedCampaign.id, member.user_id, role);
    setNotice(done ? action === 'remove' ? 'Participante removido da mesa.' : `Papel alterado para ${role === 'gm' ? 'mestre auxiliar' : 'jogador'}.` : 'Não foi possível atualizar o participante.');
    await reload();
  };
  const assignSheet = async (sheet: CharacterRecord, playerId: string) => {
    if (!selectedCampaign) return;
    try { await assignCampaignCharacter(selectedCampaign.id, sheet.id, playerId); setNotice(`Ficha “${sheet.name}” atribuída ao jogador.`); await reload(); }
    catch { setNotice('Não foi possível vincular a ficha agora.'); }
  };

  return <div className="command-center">
    <aside className={`command-sidebar ${open ? 'is-open' : ''}`}>
      <div className="command-brand"><span className="command-brand-mark">D0</span><span><strong>DOZERO</strong><small>Central de Comando</small></span><button aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <nav aria-label="Navegação da Central">{visibleNav.map(item => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'is-active' : ''} onClick={() => { setView(item.id); setOpen(false); }}><Icon size={17} />{item.label}</button>; })}</nav>
      <div className="command-sidebar-bottom"><div><Crown size={16} /><span>{user?.email || 'Administrador'}</span></div><button onClick={() => void signOut()}><DoorOpen size={16} />Sair</button></div>
    </aside>
    {open && <button aria-label="Fechar menu" className="command-backdrop" onClick={() => setOpen(false)} />}
    <section className="command-content">
      <header className="command-topbar"><button className="command-menu" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu size={20} /></button><div><p>{scope === 'platform' ? 'INSTÂNCIA' : 'MESA'} · DOZERO</p><h1>{nav.find(item => item.id === view)?.label}</h1></div><button className="command-live" onClick={() => void reload()}><Activity size={15} />Atualizar</button></header>
      <main>
        {scope === 'platform' && !platformAllowed ? <div className="command-notice" role="alert">Acesso reservado às contas administradoras da plataforma.</div> : <>
        {notice && <div className="command-notice" role="status">{notice}</div>}
        {view === 'overview' && <Overview campaigns={campaigns} activeCount={activeCount} accounts={accounts} members={members} setView={setView} />}
        {view === 'tables' && <Tables campaigns={campaigns} />}
        {view === 'members' && <Members members={members} invites={invites} inviteEmail={inviteEmail} inviteRole={inviteRole} setInviteEmail={setInviteEmail} setInviteRole={setInviteRole} sendInvite={sendInvite} changeMember={changeMember} revoke={async id => { try { await revokeCampaignInvite(id); setNotice('Convite revogado.'); await reload(); } catch { setNotice('Não foi possível revogar o convite.'); } }} />}
        {view === 'accounts' && <Accounts accounts={accounts} changeAccount={changeAccount} />}
        {view === 'sheets' && <Sheets vault={vault} campaignSheets={campaignSheets} members={members} assignments={assignments} migrateSheet={migrateSheet} assignSheet={assignSheet} />}
        {view === 'system' && <SystemStatus campaigns={campaigns} accounts={accounts} />}
        </>}
      </main>
    </section>
  </div>;
}

function Overview({ campaigns, activeCount, accounts, members, setView }: { campaigns: CampaignCloudRecord[]; activeCount: number; accounts: any[]; members: any[]; setView: (view: View) => void }) {
  return <><section className="command-hero"><div><span>COMANDO DA INSTÂNCIA</span><h2>Seu reino está sob controle.</h2><p>Acompanhe mesas, jogadores e permissões sem sair do universo DOZERO.</p></div><Shield size={54} /></section><section className="command-stats"><Stat label="Mesas ativas" value={activeCount} icon={<Swords />} /><Stat label="Contas registradas" value={accounts.length || '—'} icon={<Users />} /><Stat label="Na Mesa 0" value={members.length || '—'} icon={<Activity />} /></section><section className="command-grid"><article className="command-panel"><header><div><span>GESTÃO</span><h3>Mesas recentes</h3></div><button onClick={() => setView('tables')}>Ver mesas</button></header>{campaigns.slice(0, 5).map(campaign => <div className="command-row" key={campaign.id}><span className={campaign.is_closed ? 'dot muted' : 'dot'} /><div><strong>{campaign.name}</strong><small>{campaign.system}</small></div><em>{campaign.is_closed ? 'Fechada' : 'Ativa'}</em></div>)}</article><article className="command-panel"><header><div><span>SEGURANÇA</span><h3>Acesso da instância</h3></div><button onClick={() => setView('accounts')}>Gerenciar</button></header><p className="command-copy">As contas administradoras controlam convites, papéis e suspensão de acesso. A Mesa 0 permanece privada.</p><div className="command-security"><Shield size={20} /><span>RLS & Realtime privado configurados</span></div></article></section></>;
}
function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) { return <article className="command-stat"><div>{icon}</div><span>{label}</span><strong>{value}</strong></article>; }
function Tables({ campaigns }: { campaigns: CampaignCloudRecord[] }) { return <section className="command-panel command-table"><header><div><span>GESTÃO</span><h3>Mesas do Reino</h3></div></header><div className="command-table-head"><span>Mesa</span><span>Sistema</span><span>Status</span><span>Ação</span></div>{campaigns.map(campaign => <div className="command-table-row" key={campaign.id}><div><strong>{campaign.name}</strong><small>{campaign.room_code}</small></div><span>{campaign.system}</span><span className={campaign.is_closed ? 'badge muted' : 'badge'}>{campaign.is_closed ? 'Fechada' : 'Ativa'}</span><a href={`/vtt.html?room=${encodeURIComponent(campaign.room_code)}`}>Abrir mesa</a></div>)}</section>; }
function Accounts({ accounts, changeAccount }: { accounts: any[]; changeAccount: (account: any, kind: 'status' | 'admin') => void }) { return <section className="command-panel command-table"><header><div><span>GESTÃO</span><h3>Contas da Instância</h3></div></header>{accounts.length === 0 ? <p className="command-copy">As contas aparecerão aqui quando a conexão com o Supabase estiver disponível.</p> : accounts.map(account => <div className="command-account" key={account.id}><div className="command-avatar">{(account.full_name || account.username || '?').slice(0, 1).toUpperCase()}</div><div><strong>{account.full_name || account.username || 'Usuário'}</strong><small>{account.role === 'admin' ? 'Administrador' : 'Jogador'} · {account.status === 'suspended' ? 'Suspenso' : 'Ativo'}</small></div><div><button onClick={() => changeAccount(account, 'admin')}>{account.role === 'admin' ? 'Remover admin' : 'Tornar admin'}</button><button className={account.status === 'suspended' ? 'safe' : 'danger'} onClick={() => changeAccount(account, 'status')}>{account.status === 'suspended' ? 'Reativar' : 'Suspender'}</button></div></div>)}</section>; }
function Members({ members, invites, inviteEmail, inviteRole, setInviteEmail, setInviteRole, sendInvite, changeMember, revoke }: { members: any[]; invites: any[]; inviteEmail: string; inviteRole: 'gm' | 'player' | 'spectator'; setInviteEmail: (value: string) => void; setInviteRole: (value: 'gm' | 'player' | 'spectator') => void; sendInvite: () => void; changeMember: (member: any, action: 'role' | 'remove') => void; revoke: (id: string) => void }) {
  return <div className="command-grid command-members-grid"><section className="command-panel"><header><div><span>PORTARIA DA MESA</span><h3>Convidar participante</h3></div><UserPlus size={20} /></header><div className="command-form"><label>E-mail<input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="jogador@exemplo.com" /></label><label>Papel<select value={inviteRole} onChange={event => setInviteRole(event.target.value as 'gm' | 'player' | 'spectator')}><option value="player">Jogador</option><option value="gm">Mestre auxiliar</option><option value="spectator">Espectador</option></select></label><button disabled={!inviteEmail.trim()} onClick={sendInvite}>Salvar convite</button></div><p className="command-copy">Não há entrada pública: somente a conta do e-mail convidado pode aceitar e entrar nesta mesa.</p></section><section className="command-panel"><header><div><span>CONVITES</span><h3>Pendentes e recentes</h3></div></header>{invites.length === 0 ? <p className="command-copy">Nenhum convite criado para esta mesa.</p> : invites.map(invite => <div className="command-row" key={invite.id}><span className={invite.revoked_at ? 'dot muted' : 'dot'} /><div><strong>{invite.email}</strong><small>{invite.role === 'gm' ? 'Mestre auxiliar' : invite.role === 'spectator' ? 'Espectador' : 'Jogador'} · {invite.accepted_at ? 'Aceito' : invite.revoked_at ? 'Revogado' : 'Aguardando'}</small></div>{!invite.accepted_at && !invite.revoked_at && <button className="command-text-button" onClick={() => revoke(invite.id)}>Revogar</button>}</div>)}</section><section className="command-panel command-members-list"><header><div><span>PARTICIPANTES</span><h3>Quem pode entrar</h3></div></header>{members.length === 0 ? <p className="command-copy">Os participantes aparecerão quando a mesa responder.</p> : members.map(member => <div className="command-account" key={member.user_id}><div className="command-avatar">{(member.profile?.full_name || member.profile?.username || '?').slice(0, 1).toUpperCase()}</div><div><strong>{member.profile?.full_name || member.profile?.username || 'Participante'}</strong><small>{member.role === 'gm' ? 'Mestre auxiliar' : member.role === 'spectator' ? 'Espectador' : 'Jogador'}</small></div><div><button onClick={() => changeMember(member, 'role')}>{member.role === 'gm' ? 'Tornar jogador' : 'Tornar mestre'}</button><button className="danger" onClick={() => changeMember(member, 'remove')}>Remover</button></div></div>)}</section></div>;
}
function Sheets({ vault, campaignSheets, members, assignments, migrateSheet, assignSheet }: { vault: CharacterRecord[]; campaignSheets: CharacterRecord[]; members: any[]; assignments: CampaignCharacterAssignment[]; migrateSheet: (sheet: CharacterRecord) => void; assignSheet: (sheet: CharacterRecord, playerId: string) => void }) { return <><section className="command-panel command-table"><header><div><span>COFRE PESSOAL</span><h3>Migrar fichas para a mesa</h3></div></header><p className="command-copy">A migração cria uma cópia vinculada à campanha; a ficha original continua privada no cofre do dono.</p>{vault.length === 0 ? <p className="command-copy">Nenhuma ficha pessoal disponível neste cofre.</p> : <div className="command-sheet-grid">{vault.map(sheet => <article key={sheet.id} className="command-sheet"><span>{sheet.type === 'pc' ? 'PERSONAGEM' : sheet.type.toUpperCase()}</span><h4>{sheet.name}</h4><p>Pronta para ser copiada e atribuída à Mesa 0.</p><button onClick={() => migrateSheet(sheet)}>Migrar para mesa</button></article>)}</div>}</section><section className="command-panel command-table command-sheet-management"><header><div><span>FICHAS DA CAMPANHA</span><h3>Vínculos com jogadores</h3></div></header>{campaignSheets.length === 0 ? <p className="command-copy">Ainda não há fichas nesta mesa. Migre uma ficha do cofre acima.</p> : <div className="command-sheet-grid">{campaignSheets.map(sheet => { const assignment = assignments.find(item => item.character_id === sheet.id); return <article key={sheet.id} className="command-sheet"><span>{sheet.type === 'pc' ? 'PERSONAGEM' : sheet.type.toUpperCase()}</span><h4>{sheet.name}</h4><p>{assignment ? `Controlada por ${members.find(member => member.user_id === assignment.player_id)?.profile?.full_name || 'jogador vinculado'}.` : 'Sem jogador vinculado.'}</p><label className="command-select-label">Controlador<select value={assignment?.player_id || ''} onChange={event => event.target.value && assignSheet(sheet, event.target.value)}><option value="">Selecionar jogador</option>{members.filter(member => member.role !== 'spectator').map(member => <option key={member.user_id} value={member.user_id}>{member.profile?.full_name || member.profile?.username || 'Jogador'}</option>)}</select></label></article>; })}</div>}</section></>; }
function SystemStatus({ campaigns, accounts }: { campaigns: CampaignCloudRecord[]; accounts: any[] }) { return <section className="command-grid"><article className="command-panel"><header><div><span>REGISTRO</span><h3>Estado da instância</h3></div></header><div className="command-status-list"><div><Activity /><span>Campanhas disponíveis</span><strong>{campaigns.length}</strong></div><div><Users /><span>Contas carregadas</span><strong>{accounts.length}</strong></div><div><Shield /><span>Proteção de acesso</span><strong>Ativa</strong></div></div></article><article className="command-panel"><header><div><span>SEGURANÇA</span><h3>Próxima verificação</h3></div></header><p className="command-copy">Confira o Registro de Eventos do Supabase após aplicar a migration. A Central usa RLS para campanhas, convites, fichas e contas; o cliente não possui chave administrativa.</p></article></section>; }
