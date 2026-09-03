import React from 'react';
import { Shield, Users, X, UserPlus, Trash2, Crown, Settings2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getCampaignMembers, removeCampaignMember, updateCampaignMemberRole } from '../../services/campaignCloudService';
import { getCampaignIdForRoom } from '../../services/sceneCloudService';
import { createCampaignInvite, getMyPlatformRole, listAdminAccounts, listCampaignInvites, revokeCampaignInvite, setAccountStatus, setPlatformAdmin } from '../../services/roomAccessService';

type Role = 'gm' | 'player' | 'spectator';

export function ControlCenterModal({ roomCode, onClose }: { roomCode: string; onClose: () => void }) {
  const { user } = useAuthStore();
  const [campaignId, setCampaignId] = React.useState<string | null>(null);
  const [isManager, setIsManager] = React.useState(false);
  const [members, setMembers] = React.useState<any[]>([]);
  const [invites, setInvites] = React.useState<any[]>([]);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<Role>('player');
  const [notice, setNotice] = React.useState('');
  const [platformRole, setPlatformRole] = React.useState<'admin' | null>(null);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const reload = React.useCallback(async () => {
    const id = await getCampaignIdForRoom(roomCode);
    if (!id) { setNotice('Mesa não encontrada ou sem acesso.'); return; }
    setCampaignId(id);
    const [memberRows, inviteRows, platformRole] = await Promise.all([getCampaignMembers(id), listCampaignInvites(id), getMyPlatformRole()]);
    setMembers(memberRows); setInvites(inviteRows); setPlatformRole(platformRole);
    if (platformRole === 'admin') setAccounts(await listAdminAccounts());
    const mine = memberRows.find(member => member.user_id === user?.id);
    setIsManager(platformRole === 'admin' || mine?.role === 'gm');
  }, [roomCode, user?.id]);
  React.useEffect(() => { void reload().catch(() => setNotice('Não foi possível carregar a Central.')); }, [reload]);
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); if (!campaignId) return;
    try { await createCampaignInvite(campaignId, email, role); setEmail(''); setNotice('Convite registrado. Ele ficará disponível para esta conta ao entrar.'); await reload(); }
    catch (error: any) { setNotice(error.message || 'Não foi possível criar o convite.'); }
  };
  const changeRole = async (member: any, next: Role) => { if (!campaignId) return; await updateCampaignMemberRole(campaignId, member.user_id, next); await reload(); };
  const remove = async (member: any) => { if (!campaignId || member.user_id === user?.id) return; await removeCampaignMember(campaignId, member.user_id); await reload(); };
  const updateAccount = async (account: any, change: 'status' | 'admin') => {
    try {
      if (change === 'status') await setAccountStatus(account.id, account.status === 'suspended' ? 'active' : 'suspended');
      else await setPlatformAdmin(account.id, account.role !== 'admin');
      await reload();
    } catch { setNotice('A alteração administrativa não foi aceita.'); }
  };
  return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Central de controle" onMouseDown={onClose} style={{ zIndex: 10020, padding: 16, overflow: 'auto' }}>
    <section onMouseDown={event => event.stopPropagation()} style={{ width: 'min(860px,100%)', margin: 'auto', background: '#15110d', border: '1px solid #72552a', borderRadius: 14, color: '#eadfca', boxShadow: '0 24px 80px #000c' }}>
      <header style={{ padding: '18px 22px', borderBottom: '1px solid #42321e', display: 'flex', alignItems: 'center', gap: 12 }}><Shield color="#d9a441" /><div style={{ flex: 1 }}><strong>Central de Controle</strong><div style={{ color: '#9d907d', fontSize: 12 }}>Permissões, convites e equipe da mesa</div></div><button className="btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></header>
      <div style={{ padding: 22, display: 'grid', gap: 22 }}>
        {notice && <div role="status" style={{ padding: 10, borderRadius: 7, background: '#342817', color: '#f0ca79' }}>{notice}</div>}
        {isManager && <section style={{ border: '1px solid #72552a', borderRadius: 10, padding: 14, background: '#20180f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <Settings2 size={18} color="#d9a441" />
            <div style={{ flex: 1 }}><strong>Configuração geral da mesa</strong><small style={{ display: 'block', color: '#9d907d', marginTop: 3 }}>Capa, visibilidade, bloqueio, convites e fichas desta campanha.</small></div>
            <button className="btn btn-primary" onClick={() => window.location.assign(`/vtt.html?room=${encodeURIComponent(roomCode)}&panel=manage`)}>Abrir painel completo</button>
          </div>
        </section>}
        <section><h2 style={{ fontSize: 16, margin: '0 0 12px', display: 'flex', gap: 8, alignItems: 'center' }}><Users size={17} /> Pessoas desta mesa</h2>
          <div style={{ display: 'grid', gap: 8 }}>{members.map(member => <div key={member.user_id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, border: '1px solid #3d3021', borderRadius: 8 }}><div style={{ flex: 1 }}><strong>{member.profile?.full_name || member.profile?.username || 'Usuário'}</strong><small style={{ display: 'block', color: '#9d907d' }}>{member.user_id === user?.id ? 'Você' : 'Membro'}</small></div>{isManager ? <select value={member.role} onChange={e => void changeRole(member, e.target.value as Role)}><option value="gm">Mestre auxiliar</option><option value="player">Jogador</option><option value="spectator">Espectador</option></select> : <span>{member.role}</span>}{isManager && member.user_id !== user?.id && <button className="btn" onClick={() => void remove(member)} aria-label="Remover membro"><Trash2 size={16} /></button>}</div>)}</div>
        </section>
        {isManager && <section><h2 style={{ fontSize: 16, margin: '0 0 12px', display: 'flex', gap: 8, alignItems: 'center' }}><UserPlus size={17} /> Convidar por e-mail</h2><form onSubmit={invite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="jogador@email.com" required style={{ flex: '1 1 220px', padding: 10 }} /><select value={role} onChange={e => setRole(e.target.value as Role)}><option value="player">Jogador</option><option value="gm">Mestre auxiliar</option><option value="spectator">Espectador</option></select><button className="btn btn-primary" type="submit">Convidar</button></form>
          <div style={{ display: 'grid', gap: 6, marginTop: 14 }}>{invites.map(invite => <div key={invite.id} style={{ display: 'flex', gap: 10, padding: 8, borderBottom: '1px solid #302519' }}><span style={{ flex: 1 }}>{invite.email}</span><small>{invite.accepted_at ? 'Aceito' : invite.revoked_at ? 'Revogado' : 'Pendente'} · {invite.role}</small>{!invite.accepted_at && !invite.revoked_at && <button className="btn" onClick={() => void revokeCampaignInvite(invite.id).then(reload)}><Trash2 size={14} /></button>}</div>)}</div>
        </section>}
        {!isManager && <p style={{ margin: 0, color: '#9d907d' }}><Crown size={14} style={{ verticalAlign: 'middle' }} /> Você pode acompanhar seu vínculo; alterações de acesso ficam com o mestre.</p>}
        {platformRole === 'admin' && <section><h2 style={{ fontSize: 16, margin: '0 0 12px', display: 'flex', gap: 8, alignItems: 'center' }}><Shield size={17} /> Administração da plataforma</h2>
          <div style={{ display: 'grid', gap: 7 }}>{accounts.map(account => <div key={account.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 9, border: '1px solid #3d3021', borderRadius: 8 }}><span style={{ flex: 1 }}>{account.full_name || account.username || 'Usuário'}</span><small>{account.role === 'admin' ? 'Administrador' : 'Jogador'} · {account.status === 'suspended' ? 'Suspenso' : 'Ativo'}</small><button className="btn" onClick={() => void updateAccount(account, 'admin')}>{account.role === 'admin' ? 'Remover admin' : 'Tornar admin'}</button><button className="btn" onClick={() => void updateAccount(account, 'status')}>{account.status === 'suspended' ? 'Reativar' : 'Suspender'}</button></div>)}</div>
        </section>}
      </div>
    </section>
  </div>;
}
