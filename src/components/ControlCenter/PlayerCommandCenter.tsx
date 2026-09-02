import React from 'react';
import { BookOpen, DoorOpen, LayoutDashboard, Menu, ScrollText, Swords, User, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { AuthModal } from '../Modals/AuthModal';
import { getCampaigns, type CampaignCloudRecord } from '../../services/campaignCloudService';
import { getCampaignCharacters, getVaultCharacters, type CharacterRecord } from '../../services/characterRepository';
import { LoadingState } from '../UI/LoadingState';
import './AdminCommandCenter.css';

type View = 'portal' | 'sheets' | 'tables' | 'profile';
const nav = [
  { id: 'portal' as const, label: 'Meu Pergaminho', icon: LayoutDashboard },
  { id: 'sheets' as const, label: 'Minhas Fichas', icon: BookOpen },
  { id: 'tables' as const, label: 'Mesas & Missões', icon: Swords },
  { id: 'profile' as const, label: 'Meu Perfil', icon: User },
];

/** Portal de conta: não pertence a nenhuma mesa e não inicia sincronização de sala. */
export function PlayerCommandCenter() {
  const { user, loading, setAuthModalOpen, signOut } = useAuthStore();
  const [view, setView] = React.useState<View>('portal');
  const [open, setOpen] = React.useState(false);
  const [campaigns, setCampaigns] = React.useState<CampaignCloudRecord[]>([]);
  const [vault, setVault] = React.useState<CharacterRecord[]>([]);
  const [tableSheets, setTableSheets] = React.useState<CharacterRecord[]>([]);
  const [notice, setNotice] = React.useState('');
  const reload = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await getCampaigns(user.id);
      const [ownSheets, sheetsByCampaign] = await Promise.all([
        getVaultCharacters(user.id),
        Promise.all(rows.map(campaign => getCampaignCharacters(campaign.id, user.id))),
      ]);
      setCampaigns(rows);
      setVault(ownSheets);
      setTableSheets(sheetsByCampaign.flat());
    } catch { setNotice('Não foi possível atualizar todos os dados agora. Suas fichas locais continuam preservadas.'); }
  }, [user?.id]);
  React.useEffect(() => { void reload(); }, [reload]);
  const openTable = (campaign: CampaignCloudRecord) => { window.location.assign(`/vtt.html?room=${encodeURIComponent(campaign.room_code)}`); };

  if (loading) return <div className="command-center"><LoadingState label="Abrindo o Portal do Aventureiro…" /></div>;
  if (!user) return <div className="command-center command-portal-gate"><section className="command-panel"><span>PORTAL DO AVENTUREIRO</span><h1>Entre para ver suas mesas e fichas.</h1><p className="command-copy">Este portal pertence à sua conta, não a uma mesa específica.</p><button className="command-live" onClick={() => setAuthModalOpen(true)}>Entrar</button></section><AuthModal /></div>;

  return <div className="command-center">
    <aside className={`command-sidebar ${open ? 'is-open' : ''}`}><div className="command-brand"><span className="command-brand-mark">D0</span><span><strong>DOZERO</strong><small>Portal do Aventureiro</small></span><button aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={18} /></button></div><nav aria-label="Navegação do Portal">{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'is-active' : ''} onClick={() => { setView(item.id); setOpen(false); }}><Icon size={17} />{item.label}</button>; })}</nav><div className="command-sidebar-bottom"><div><User size={16} /><span>{user.email || 'Aventureiro'}</span></div><button onClick={() => void signOut()}><DoorOpen size={16} />Sair</button></div></aside>
    {open ? <button aria-label="Fechar menu" className="command-backdrop" onClick={() => setOpen(false)} /> : null}
    <section className="command-content"><header className="command-topbar"><button className="command-menu" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu size={20} /></button><div><p>PORTAL DO AVENTUREIRO</p><h1>{nav.find(item => item.id === view)?.label}</h1></div><button className="command-live" onClick={() => void reload()}><ScrollText size={15} />Atualizar</button></header><main>{notice ? <div className="command-notice" role="status">{notice}</div> : null}
      {view === 'portal' ? <><section className="command-hero"><div><span>SUA CONTA · SUAS AVENTURAS</span><h2>Pronto para a próxima sessão.</h2><p>Suas mesas e fichas ficam organizadas aqui, sem depender da Mesa 0 ou de qualquer sala já aberta.</p></div><BookOpen size={54} /></section><section className="command-stats"><Stat label="Mesas liberadas" value={campaigns.length} /><Stat label="Fichas no cofre" value={vault.length} /><Stat label="Fichas em mesas" value={tableSheets.length} /></section></> : null}
      {view === 'sheets' ? <section className="command-panel"><header><div><span>SEU COFRE</span><h3>Minhas Fichas</h3></div></header><div className="command-sheet-grid">{[...tableSheets, ...vault].length === 0 ? <p className="command-copy">Nenhuma ficha disponível ainda.</p> : [...tableSheets, ...vault].map(sheet => <article className="command-sheet" key={sheet.id}><span>{sheet.campaign_id ? 'NA MESA' : 'NO COFRE'}</span><h4>{sheet.name}</h4><p>{sheet.campaign_id ? 'Ficha atribuída a uma das suas mesas.' : 'Ficha privada guardada no seu cofre.'}</p></article>)}</div></section> : null}
      {view === 'tables' ? <section className="command-panel command-table"><header><div><span>SUAS MESAS</span><h3>Mesas & Missões</h3></div></header>{campaigns.length === 0 ? <p className="command-copy">Você ainda não possui uma mesa liberada. Peça um convite ao mestre.</p> : campaigns.map(campaign => <div className="command-table-row" key={campaign.id}><div><strong>{campaign.name}</strong><small>{campaign.system}</small></div><span>{campaign.is_closed ? 'Fechada' : 'Disponível'}</span><button className="command-live" disabled={campaign.is_closed} onClick={() => openTable(campaign)}>{campaign.is_closed ? 'Fechada' : 'Entrar'}</button></div>)}</section> : null}
      {view === 'profile' ? <section className="command-panel"><header><div><span>CONTA</span><h3>Meu Perfil</h3></div></header><p className="command-copy">Conectado como {user.email}. Seus dados e fichas privadas permanecem separados das demais contas.</p></section> : null}
    </main></section>
  </div>;
}

function Stat({ label, value }: { label: string; value: number }) { return <article className="command-stat"><div><BookOpen /></div><span>{label}</span><strong>{value}</strong></article>; }
