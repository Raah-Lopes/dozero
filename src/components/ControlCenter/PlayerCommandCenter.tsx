import React from 'react';
import { BookOpen, DoorOpen, LayoutDashboard, Menu, ScrollText, Swords, User, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getCampaigns, type CampaignCloudRecord } from '../../services/campaignCloudService';
import { getCampaignCharacters, getVaultCharacters, type CharacterRecord } from '../../services/characterRepository';
import './AdminCommandCenter.css';

type View = 'portal' | 'sheets' | 'tables' | 'profile';
const nav = [
  { id: 'portal' as const, label: 'Meu Pergaminho', icon: LayoutDashboard },
  { id: 'sheets' as const, label: 'Minhas Fichas', icon: BookOpen },
  { id: 'tables' as const, label: 'Mesas & Missões', icon: Swords },
  { id: 'profile' as const, label: 'Meu Perfil', icon: User },
];

export function PlayerCommandCenter({ roomCode }: { roomCode: string }) {
  const { user, signOut } = useAuthStore();
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
      setCampaigns(rows);
      const current = rows.find(item => item.room_code === roomCode);
      const [ownSheets, currentSheets] = await Promise.all([getVaultCharacters(user.id), current ? getCampaignCharacters(current.id, user.id) : Promise.resolve([])]);
      setVault(ownSheets); setTableSheets(currentSheets);
    } catch { setNotice('Não foi possível atualizar todos os dados agora. Suas fichas locais continuam preservadas.'); }
  }, [roomCode, user?.id]);
  React.useEffect(() => { void reload(); }, [reload]);
  const current = campaigns.find(item => item.room_code === roomCode);
  const openTable = (campaign: CampaignCloudRecord) => { window.location.assign(`/vtt.html?room=${encodeURIComponent(campaign.room_code)}`); };
  return <div className="command-center">
    <aside className={`command-sidebar ${open ? 'is-open' : ''}`}><div className="command-brand"><span className="command-brand-mark">D0</span><span><strong>DOZERO</strong><small>Portal do Aventureiro</small></span><button aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={18} /></button></div><nav aria-label="Navegação do Portal">{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'is-active' : ''} onClick={() => { setView(item.id); setOpen(false); }}><Icon size={17} />{item.label}</button>; })}</nav><div className="command-sidebar-bottom"><div><User size={16} /><span>{user?.email || 'Aventureiro'}</span></div><button onClick={() => void signOut()}><DoorOpen size={16} />Sair</button></div></aside>
    {open && <button aria-label="Fechar menu" className="command-backdrop" onClick={() => setOpen(false)} />}
    <section className="command-content"><header className="command-topbar"><button className="command-menu" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu size={20} /></button><div><p>PORTAL DO AVENTUREIRO</p><h1>{nav.find(item => item.id === view)?.label}</h1></div><button className="command-live" onClick={() => void reload()}><ScrollText size={15} />Atualizar</button></header><main>{notice && <div className="command-notice" role="status">{notice}</div>}
      {view === 'portal' && <><section className="command-hero"><div><span>SEU CAMINHO</span><h2>Pronto para a próxima sessão.</h2><p>Suas mesas e fichas ficam organizadas aqui. Somente campanhas das quais você faz parte aparecem neste portal.</p></div><BookOpen size={54} /></section><section className="command-stats"><Stat label="Mesas liberadas" value={campaigns.length} /><Stat label="Fichas no cofre" value={vault.length} /><Stat label="Fichas nesta mesa" value={tableSheets.length} /></section></>}
      {view === 'sheets' && <section className="command-panel"><header><div><span>SEU COFRE</span><h3>Minhas Fichas</h3></div></header><div className="command-sheet-grid">{[...tableSheets, ...vault].length === 0 ? <p className="command-copy">Nenhuma ficha disponível ainda.</p> : [...tableSheets, ...vault].map(sheet => <article className="command-sheet" key={sheet.id}><span>{sheet.campaign_id ? 'NA MESA' : 'NO COFRE'}</span><h4>{sheet.name}</h4><p>{sheet.campaign_id ? 'Ficha da campanha atual.' : 'Ficha privada guardada no seu cofre.'}</p></article>)}</div></section>}
      {view === 'tables' && <section className="command-panel command-table"><header><div><span>SEUS CONVITES ACEITOS</span><h3>Mesas & Missões</h3></div></header>{campaigns.length === 0 ? <p className="command-copy">Você ainda não possui uma mesa liberada. Peça um convite ao mestre.</p> : campaigns.map(campaign => <div className="command-table-row" key={campaign.id}><div><strong>{campaign.name}</strong><small>{campaign.system}</small></div><span>{campaign.is_closed ? 'Fechada' : 'Disponível'}</span><button className="command-live" onClick={() => openTable(campaign)}>Entrar</button></div>)}</section>}
      {view === 'profile' && <section className="command-panel"><header><div><span>CONTA</span><h3>Meu Perfil</h3></div></header><p className="command-copy">Conectado como {user?.email}. Seus dados e fichas privadas permanecem separados das demais contas.</p></section>}
    </main></section>
  </div>;
}
function Stat({ label, value }: { label: string; value: number }) { return <article className="command-stat"><div><BookOpen /></div><span>{label}</span><strong>{value}</strong></article>; }
