import React, { useState, useEffect } from 'react';
import { 
  Dices, Play, Sparkles, Map as MapIcon, 
  Crown, Swords, Plus, Search, Lock,
  Copy, Check, Edit3, Trash2, LogOut
} from 'lucide-react';
import './LandingPage.css';
import { useAuthStore } from '../../store/authStore';
import { AuthModal } from '../Modals/AuthModal';
import { ProfileModal } from '../Modals/ProfileModal';
import { ResetPasswordModal } from '../Modals/ResetPasswordModal';
import { 
  getCampaigns, 
  createOrUpdateCampaign, 
  deleteCampaignCloud, 
  getLobbyStats,
  CampaignCloudRecord 
} from '../../services/campaignCloudService';
import { toast } from '../UI/Toast';
import { navigateToRoom, getRoomUrl } from '../../utils/roomUrl';

// ─── inline style helpers ───────────────────────────────────────────────────
const S = {
  // layout
  row:    (gap = 0) => ({ display: 'flex', flexDirection: 'row' as const, alignItems: 'center', gap }),
  col:    (gap = 0) => ({ display: 'flex', flexDirection: 'column' as const, gap }),
  center: ()        => ({ display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  grow:   ()        => ({ flexGrow: 1 }),
  // colors
  paper:     '#e8dcc4',
  paperDark: '#d4c4a4',
  brown:     '#2c1e16',
  brownMid:  '#4a3320',
  brownLt:   '#6b4c34',
  red:       '#c6463d',
  yellow:    '#d6a32b',
  green:     '#6d8a2d',
  blue:      '#2d7c8a',
};

export function LandingPage() {
  const { user, initialize, setAuthModalOpen, setProfileModalOpen, signOut } = useAuthStore();
  
  const [campaigns, setCampaigns] = useState<CampaignCloudRecord[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'public'>('all');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampId, setEditingCampId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    system: 'D&D 5e / Fantasia Medieval',
    description: '',
    cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    pass_code: '',
    is_public: true,
    is_closed: false
  });

  const [isDiceModalOpen, setIsDiceModalOpen] = useState(false);
  const [d20Val, setD20Val] = useState<number>(20);
  const [isRolling, setIsRolling] = useState(false);
  const [rollOutcome, setRollOutcome] = useState('🔥 Sucesso Decisivo Crítico!');
  
  const [promptRoom, setPromptRoom] = useState<CampaignCloudRecord | null>(null);
  const [enteredPass, setEnteredPass] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // O index.css do VTT app tem body { overflow: hidden }. A landing precisa de scroll.
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Trava o scroll do body quando qualquer modal estiver aberto
  useEffect(() => {
    const anyOpen = isEditModalOpen || !!promptRoom || isDiceModalOpen;
    document.body.style.overflow = anyOpen ? 'hidden' : 'auto';
  }, [isEditModalOpen, promptRoom, isDiceModalOpen]);

  useEffect(() => {
    initialize();
    loadCampaignsList();
  }, [initialize, user?.id]);

  const loadCampaignsList = async () => {
    setLoadingCampaigns(true);
    try {
      const data = await getCampaigns(user?.id);
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const stats = getLobbyStats(campaigns);

  const handleRollD20 = () => {
    setIsRolling(true);
    const roll = Math.floor(Math.random() * 20) + 1;
    setTimeout(() => {
      setD20Val(roll);
      if (roll === 20) setRollOutcome('🔥 Sucesso Crítico Decisivo!');
      else if (roll >= 15) setRollOutcome('✨ Sucesso Triunfante!');
      else if (roll >= 10) setRollOutcome('⚖️ Sucesso com Complicação.');
      else if (roll === 1) setRollOutcome('💀 Falha Crítica Desastrosa!');
      else setRollOutcome('❌ Falha na Tentativa.');
      setIsRolling(false);
    }, 300);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenCreate = () => {
    if (!user) toast.info('Crie uma conta ou faça login para gerenciar suas mesas na nuvem!');
    setEditingCampId(null);
    setFormData({
      name: '', system: 'D&D 5e / Fantasia Medieval', description: '',
      cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      pass_code: '', is_public: true, is_closed: false
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (camp: CampaignCloudRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCampId(camp.id);
    setFormData({
      name: camp.name, system: camp.system, description: camp.description || '',
      cover_url: camp.cover_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      pass_code: camp.pass_code || '', is_public: camp.is_public !== false, is_closed: camp.is_closed === true
    });
    setIsEditModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Informe o nome da campanha.'); return; }
    try {
      const saved = await createOrUpdateCampaign({
        id: editingCampId || undefined,
        name: formData.name.trim(), system: formData.system.trim(),
        description: formData.description.trim(), cover_url: formData.cover_url.trim(),
        pass_code: formData.pass_code.trim(), is_public: formData.is_public,
        is_closed: formData.is_closed, active_players_count: editingCampId ? undefined : 1
      }, user?.id);
      toast.success(`Mesa "${saved.name}" salva!`);
      setIsEditModalOpen(false);
      loadCampaignsList();
    } catch { toast.error('Erro ao salvar mesa.'); }
  };

  const handleDeleteCampaign = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Excluir a mesa "${name}"?`)) {
      await deleteCampaignCloud(id, user?.id);
      toast.success('Mesa excluída.');
      loadCampaignsList();
    }
  };

  const handleJoinTable = (camp: CampaignCloudRecord) => {
    if (camp.is_closed) { toast.error('Esta mesa está fechada pelo Mestre.'); return; }
    if (camp.pass_code?.trim()) {
      if (!(user?.id && camp.owner_id === user.id)) {
        setPromptRoom(camp); setEnteredPass(''); return;
      }
    }
    navigateToRoom(camp.room_code);
  };

  const handleConfirmPasswordJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptRoom) return;
    if (enteredPass.trim() === promptRoom.pass_code?.trim()) {
      const target = promptRoom.room_code;
      setPromptRoom(null);
      navigateToRoom(target);
    } else {
      toast.error('Senha incorreta!');
    }
  };

  const handleCopyLink = (camp: CampaignCloudRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getRoomUrl(camp.room_code));
    setCopiedId(camp.id);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredCampaigns = campaigns.filter(c => {
    const q = searchQuery.toLowerCase();
    const match = c.name.toLowerCase().includes(q) || c.system.toLowerCase().includes(q) ||
                  (c.description && c.description.toLowerCase().includes(q));
    if (!match) return false;
    if (filterMode === 'mine') return !!(user?.id && c.owner_id === user.id);
    if (filterMode === 'public') return c.is_public !== false;
    return true;
  });

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="landing-page-body" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── 1. NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(44,30,22,0.96)', borderBottom: '4px solid #4a3320',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 80 }}>

            {/* Logo */}
            <div style={{ cursor: 'pointer' }} onClick={() => scrollToSection('hero')}>
              <img src="/assets/logo_mascot.png" alt="Dozero VTT"
                style={{ height: 56, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))', transition: 'transform 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            </div>

            {/* Desktop Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', fontFamily: 'Bangers, cursive', fontSize: '1.2rem', letterSpacing: '0.05em', color: '#e8dcc4' }}>
              <NavBtn onClick={() => scrollToSection('features')}>Recursos</NavBtn>
              <NavBtn onClick={() => scrollToSection('lobby')} icon={<Swords style={{ width: 18, height: 18, color: '#d6a32b' }} />}>
                Mesas &amp; Taverna
              </NavBtn>
              <NavBtn onClick={() => setIsDiceModalOpen(true)} icon={<Dices style={{ width: 18, height: 18, color: '#c6463d' }} />}>
                Rolar Dados
              </NavBtn>

              <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #4a3320', display: 'flex', alignItems: 'center', gap: 12 }}>
                {user ? (
                  <>
                    <button onClick={() => setProfileModalOpen(true)} className="btn-rpg btn-yellow"
                      style={{ fontSize: '0.85rem', padding: '0.3rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Crown style={{ width: 16, height: 16, color: '#854b17' }} />
                      {user.user_metadata?.username || user.email?.split('@')[0] || 'Meu Herói'}
                    </button>
                    <button onClick={() => signOut()} title="Sair"
                      style={{ background: 'none', border: 'none', color: '#e8dcc4', cursor: 'pointer', padding: 6, lineHeight: 0 }}>
                      <LogOut style={{ width: 20, height: 20 }} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setAuthModalOpen(true)} className="btn-rpg btn-yellow" style={{ fontSize: '0.85rem', padding: '0.3rem 1rem' }}>Entrar</button>
                    <button onClick={() => setAuthModalOpen(true)} className="btn-rpg btn-red"    style={{ fontSize: '0.85rem', padding: '0.3rem 1rem' }}>Criar Conta</button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile auth only */}
            <div style={{ display: 'flex' }} className="md:hidden">
              <button onClick={() => user ? setProfileModalOpen(true) : setAuthModalOpen(true)}
                className="btn-rpg btn-yellow" style={{ fontSize: '0.75rem', padding: '0.2rem 0.75rem' }}>
                {user ? 'Conta' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main style={{ flexGrow: 1 }}>

        {/* ── 2. HERO ── */}
        <section id="hero" style={{ padding: '3rem 0 4rem', minHeight: '75vh', display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>

              {/* Painel de texto */}
              <div className="wood-frame" style={{ background: '#e8dcc4', padding: '2.5rem', position: 'relative', textAlign: 'left' }}>
                <div style={{
                  position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%) rotate(2deg)',
                  background: '#c6463d', color: '#fff', fontFamily: 'Bangers, cursive',
                  fontSize: '0.85rem', padding: '4px 16px', border: '2px solid black',
                  boxShadow: '3px 3px 0 #000', whiteSpace: 'nowrap'
                }}>
                  A NOVA ERA DOS VTTs
                </div>

                <h1 style={{ fontFamily: 'Bangers, cursive', fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', color: '#2c1e16', marginBottom: '1rem', lineHeight: 1.1, letterSpacing: '0.03em' }}>
                  Sua Aventura<br />
                  <span style={{ color: '#c6463d' }}>Do Zero</span> ao Épico!
                </h1>

                <p style={{ color: '#4a3320', fontSize: '1rem', fontWeight: 700, lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Crie campanhas inesquecíveis, junte seus amigos e jogue RPG de mesa com as melhores ferramentas digitais.
                  Mapas com grid dinâmico, iluminação, dados 3D, copiloto com IA — em português.
                </p>

                {/* D20 Rolador */}
                <div style={{
                  marginBottom: '1.5rem', padding: '0.75rem 1rem',
                  background: '#d4c4a4', borderRadius: 8, border: '2px solid #4a3320',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleRollD20} disabled={isRolling}
                      className="shadow-rpg"
                      style={{
                        width: 48, height: 48, borderRadius: 10, background: '#c6463d', color: '#fff',
                        border: '2px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Bangers, cursive', fontSize: '1.5rem', cursor: 'pointer',
                        transition: 'transform 0.1s'
                      }}
                      title="Rolar d20!"
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                    >
                      {isRolling ? <Sparkles style={{ width: 22, height: 22, animation: 'spin 0.5s linear infinite' }} /> : d20Val}
                    </button>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#6b4c34', display: 'block' }}>Dado do Destino (D20)</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2c1e16' }}>{rollOutcome}</span>
                    </div>
                  </div>
                  <button onClick={handleRollD20}
                    style={{ fontSize: '0.7rem', fontFamily: 'Bangers, cursive', background: '#2c1e16', color: '#e8dcc4', padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Rolar
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <button onClick={() => scrollToSection('lobby')} className="btn-rpg btn-red"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', padding: '0.7rem 1.5rem' }}>
                    <Swords style={{ width: 20, height: 20 }} /> Entrar nas Mesas
                  </button>
                  <button onClick={handleOpenCreate} className="btn-rpg btn-yellow"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', padding: '0.7rem 1.5rem' }}>
                    <Plus style={{ width: 20, height: 20 }} /> Criar Minha Mesa
                  </button>
                </div>
              </div>

              {/* Mascote */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <div style={{ position: 'absolute', inset: 0, background: '#d4c4a4', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.2 }} />
                <img src="/assets/mascot_map.png" alt="Zye – mascote do Dozero VTT"
                  className="animate-float"
                  style={{ position: 'relative', zIndex: 2, maxHeight: 460, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(8px 12px 20px rgba(0,0,0,0.75))' }}
                />
                <div style={{
                  position: 'absolute', bottom: -8, zIndex: 3,
                  background: '#2c1e16', color: '#e8dcc4', border: '2px solid #d6a32b',
                  borderRadius: 999, padding: '4px 16px', fontFamily: 'Bangers, cursive', fontSize: '0.9rem',
                  boxShadow: '3px 3px 0 rgba(0,0,0,0.4)', whiteSpace: 'nowrap'
                }}>
                  ⚡ Zye: "Para onde nossa história vai hoje?"
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. LOBBY / TAVERNA ── */}
        <section id="lobby" style={{ padding: '4rem 0', background: '#2c1e16', borderTop: '8px solid #4a3320', borderBottom: '8px solid #4a3320', position: 'relative' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>

            {/* Título */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ fontFamily: 'Bangers, cursive', fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: '#e8dcc4', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                ⚔️ A Taverna &amp; Mural de Mesas
              </h2>
              <p style={{ color: '#d4c4a4', fontWeight: 600, fontSize: '1rem', maxWidth: 600, margin: '0 auto' }}>
                Encontre mesas abertas, veja os heróis ativos ou crie e gerencie as suas próprias aventuras!
              </p>
            </div>

            {/* Painel de controles */}
            <div className="paper-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>

              {/* Stats + Busca */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>

                {/* Indicadores */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <StatBadge color="#6d8a2d" label="Jogadores Online" value={`${stats.activePlayersCount} Heróis`} />
                  <StatBadge color="#c6463d" label="Mesas Ativas" value={`${stats.activeTablesCount} Aventuras`} />
                  <StatBadge color="#d6a32b" label="Mestres" value={`${stats.mastersCount} Mestres`} />
                </div>

                {/* Busca + botão */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#6b4c34' }} />
                    <input
                      type="text" placeholder="Buscar mesa ou sistema..."
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        background: '#d4c4a4', border: '2px solid #4a3320', borderRadius: 8,
                        paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                        fontSize: '0.85rem', fontWeight: 700, color: '#2c1e16', outline: 'none', width: 220
                      }}
                    />
                  </div>
                  <button onClick={handleOpenCreate} className="btn-rpg btn-red"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '1rem', padding: '0.5rem 1.2rem', whiteSpace: 'nowrap' }}>
                    <Plus style={{ width: 18, height: 18 }} /> Nova Mesa
                  </button>
                </div>
              </div>

              {/* Filtros */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {([
                  ['all',    `Todas (${campaigns.length})`],
                  ['mine',   `👑 Minhas (${campaigns.filter(c => user?.id && c.owner_id === user.id).length})`],
                  ['public', `🌍 Públicas (${campaigns.filter(c => c.is_public !== false).length})`],
                ] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => setFilterMode(mode)}
                    style={{
                      fontFamily: 'Bangers, cursive', fontSize: '1rem', padding: '4px 14px',
                      borderRadius: '6px 6px 0 0', border: '2px solid #4a3320', cursor: 'pointer',
                      background: filterMode === mode ? '#e8dcc4' : '#2c1e16',
                      color: filterMode === mode ? '#2c1e16' : '#e8dcc4',
                      borderBottom: filterMode === mode ? 'none' : '2px solid #4a3320'
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Campanhas */}
            {loadingCampaigns ? (
              <div className="paper-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <Sparkles style={{ width: 32, height: 32, color: '#c6463d', margin: '0 auto 0.5rem', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontFamily: 'Bangers, cursive', fontSize: '1.5rem', color: '#4a3320' }}>Consultando os pergaminhos da Taverna...</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="paper-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Bangers, cursive', fontSize: '2rem', color: '#2c1e16', marginBottom: '0.5rem' }}>Nenhuma mesa encontrada</p>
                <p style={{ color: '#6b4c34', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1.5rem' }}>Crie a primeira aventura ou ajuste os filtros!</p>
                <button onClick={handleOpenCreate} className="btn-rpg btn-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus style={{ width: 18, height: 18 }} /> Criar Mesa Agora
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {filteredCampaigns.map(camp => {
                  const isOwner = !!(user?.id && camp.owner_id === user.id);
                  const activePlayers = camp.active_players_count || (camp.is_closed ? 0 : 3);
                  return (
                    <div key={camp.id} className="paper-panel"
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '4px solid #4a3320', transition: 'transform 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>

                      {/* Capa */}
                      <div style={{ position: 'relative', height: 176, background: '#2c1e16', overflow: 'hidden', borderBottom: '4px solid #4a3320' }}>
                        <img src={camp.cover_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'}
                          alt={camp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9, transition: 'transform 0.3s' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 50%, rgba(0,0,0,0.3))', pointerEvents: 'none' }} />

                        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(44,30,22,0.9)', border: '1px solid #d6a32b', color: '#e8dcc4', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6d8a2d', animation: 'pulse 2s infinite' }} />
                          {activePlayers} jogando agora
                        </div>
                        <div style={{ position: 'absolute', top: 10, right: 10, background: '#c6463d', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontFamily: 'Bangers, cursive', border: '1px solid black' }}>
                          {camp.system}
                        </div>
                        {camp.pass_code && (
                          <div style={{ position: 'absolute', bottom: 10, left: 10, background: '#d6a32b', color: '#2c1e16', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock style={{ width: 10, height: 10 }} /> Requer Senha
                          </div>
                        )}
                        {isOwner && (
                          <div style={{ position: 'absolute', bottom: 10, right: 10, background: '#2d7c8a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontFamily: 'Bangers, cursive' }}>
                            👑 Você é o Mestre
                          </div>
                        )}
                      </div>

                      {/* Corpo */}
                      <div style={{ padding: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.5rem', color: '#2c1e16', marginBottom: '0.5rem', letterSpacing: '0.03em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                            {camp.name}
                          </h3>
                          <p style={{ color: '#4a3320', fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '1rem' }}>
                            {camp.description || 'Aventure-se nesta jornada emocionante pelo Dozero VTT.'}
                          </p>
                        </div>

                        <div style={{ borderTop: '2px solid #d4c4a4', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => handleJoinTable(camp)} className="btn-rpg btn-red"
                            style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.95rem', padding: '0.4rem 0.75rem' }}>
                            <Play style={{ width: 14, height: 14, fill: 'currentColor' }} /> Entrar
                          </button>
                          <IconBtn onClick={e => handleCopyLink(camp, e)} title="Copiar link">
                            {copiedId === camp.id ? <Check style={{ width: 14, height: 14, color: '#6d8a2d' }} /> : <Copy style={{ width: 14, height: 14 }} />}
                          </IconBtn>
                          {isOwner && (
                            <>
                              <IconBtn onClick={e => handleOpenEdit(camp, e)} title="Editar">
                                <Edit3 style={{ width: 14, height: 14 }} />
                              </IconBtn>
                              <IconBtn onClick={e => handleDeleteCampaign(camp.id, camp.name, e)} title="Excluir" danger>
                                <Trash2 style={{ width: 14, height: 14 }} />
                              </IconBtn>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── 4. FEATURES ── */}
        <section id="features" style={{ padding: '5rem 0 4rem', background: '#2c1e16', borderBottom: '8px solid #4a3320' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>

            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <h2 style={{ fontFamily: 'Bangers, cursive', fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#e8dcc4', letterSpacing: '0.05em', borderBottom: '4px solid #d6a32b', display: 'inline-block', paddingBottom: '0.5rem' }}>
                O Arsenal do Mestre &amp; Jogadores
              </h2>
              <p style={{ color: '#e8dcc4', marginTop: '1rem', fontSize: '1.1rem', fontWeight: 600, maxWidth: 500, margin: '1rem auto 0' }}>
                Tudo que seu grupo precisa para a máxima imersão em qualquer cenário.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', paddingTop: '3rem' }}>
              <FeatureCard
                icon={<MapIcon style={{ width: 36, height: 36 }} />}
                iconColor="#d6a32b"
                title="Construtor de Mundos & Grid"
                desc="Mapas com grid customizável, iluminação dinâmica, névoa de guerra e props com interação rápida ao clique."
                tag="🗺️ Grid Tático & Fumaça"
              />
              <FeatureCard
                icon={<Swords style={{ width: 36, height: 36 }} />}
                iconColor="#c6463d"
                title="Combate Dinâmico & 3D"
                desc="Iniciativa automática, rolagem de dados 3D integrada com física realista, macros de ataque e relógio de tensão."
                tag="🎲 Dados 3D & Clocks"
                tagColor="#c6463d"
              />
              <FeatureCard
                icon={<Sparkles style={{ width: 36, height: 36 }} />}
                iconColor="#6d8a2d"
                title="Copiloto IA & Wiki Viva"
                desc="O Mascote Zye cria NPCs, ganchos de aventura e gerencia compêndios e anotações secretas para o Mestre."
                tag="🤖 Zye Assistente"
                tagColor="#6d8a2d"
              />
            </div>

            {/* CTA Banner */}
            <div className="paper-panel" style={{ textAlign: 'center', padding: '3rem 2rem', position: 'relative', maxWidth: 700, margin: '4rem auto 0' }}>
              <div className="wax-seal"><Crown style={{ width: 20, height: 20, color: '#5a1819' }} /></div>
              <h2 style={{ fontFamily: 'Bangers, cursive', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#2c1e16', marginBottom: '1rem', letterSpacing: '0.03em' }}>
                Pronto para rolar a iniciativa?
              </h2>
              <p style={{ color: '#4a3320', fontWeight: 700, maxWidth: 450, margin: '0 auto 1.5rem' }}>
                Sem assinaturas caras ou configurações complexas. Entre em uma mesa agora ou convide seu grupo.
              </p>
              <button onClick={() => user ? scrollToSection('lobby') : setAuthModalOpen(true)}
                className="btn-rpg btn-red" style={{ fontSize: '1.4rem', padding: '0.9rem 3rem' }}>
                {user ? 'EXPLORAR MESAS AGORA' : 'CRIAR MINHA CONTA GRÁTIS'}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── 5. FOOTER ── */}
      <footer style={{ background: '#2c1e16', borderTop: '8px solid #4a3320', padding: '3rem 1.5rem 1.5rem', color: '#d4c4a4' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <img src="/assets/logo_mascot.png" alt="Logo" style={{ height: 48, width: 'auto', marginBottom: '0.75rem', background: '#e8dcc4', padding: 4, borderRadius: 6 }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 700, maxWidth: 360, color: '#e8dcc4' }}>
                Feito por jogadores, para jogadores. Nossa missão é fornecer a plataforma de mesa virtual mais acessível, imersiva e divertida para a comunidade brasileira de RPG.
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.2rem', color: '#d6a32b', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Aventure-se</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                <li><button onClick={() => scrollToSection('features')} style={footerLinkStyle}>Recursos do VTT</button></li>
                <li><button onClick={() => scrollToSection('lobby')} style={footerLinkStyle}>Taverna de Mesas</button></li>
                <li><button onClick={() => setIsDiceModalOpen(true)} style={footerLinkStyle}>Rolar Dados 3D</button></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.2rem', color: '#d6a32b', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Comunidade</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem', fontWeight: 700, color: '#9ca3af' }}>
                <li>D&amp;D 5e / Tormenta20 / PF2e</li>
                <li>Copiloto Mascote Zye</li>
                <li>Totalmente em Português</li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #4a3320', paddingTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#6b4c34' }}>
            © 2026 Dozero VTT — Não rolem 1 natural! 🎲
          </div>
        </div>
      </footer>

      {/* ── MODAL: CRIAR / EDITAR MESA ── */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div className="paper-panel" style={{ maxWidth: 520, width: '100%', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setIsEditModalOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, background: '#c6463d', color: '#fff', border: '2px solid black', borderRadius: 6, cursor: 'pointer', fontFamily: 'Bangers, cursive', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              X
            </button>
            <h2 style={{ fontFamily: 'Bangers, cursive', fontSize: '2rem', color: '#2c1e16', marginBottom: '0.25rem' }}>
              {editingCampId ? 'Editar Campanha' : 'Criar Nova Mesa'}
            </h2>
            <p style={{ color: '#6b4c34', fontWeight: 700, fontSize: '0.8rem', marginBottom: '1.5rem' }}>Configure os detalhes da sua aventura.</p>

            <form onSubmit={handleSaveCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {([
                ['Nome da Campanha *', 'text', 'name', 'Ex: A Mina Perdida de Phandelver', true],
                ['Sistema de Regras', 'text', 'system', 'D&D 5e, Tormenta20, PF2e...', false],
                ['URL da Capa', 'text', 'cover_url', 'https://...', false],
                ['Senha de Acesso (Opcional)', 'text', 'pass_code', 'Deixe em branco para mesa livre', false],
              ] as const).map(([label, type, field, placeholder, required]) => (
                <div key={field}>
                  <label style={{ display: 'block', fontFamily: 'Bangers, cursive', color: '#2c1e16', marginBottom: 4 }}>{label}</label>
                  <input type={type} required={required} placeholder={placeholder}
                    value={formData[field as keyof typeof formData] as string}
                    onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                    style={{ width: '100%', background: '#d4c4a4', border: '2px solid #4a3320', borderRadius: 6, padding: '8px 12px', fontWeight: 700, fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontFamily: 'Bangers, cursive', color: '#2c1e16', marginBottom: 4 }}>Sinopse / Descrição</label>
                <textarea rows={3} placeholder="Breve descrição da aventura..."
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', background: '#d4c4a4', border: '2px solid #4a3320', borderRadius: 6, padding: '8px 12px', fontWeight: 700, fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                {([
                  ['is_public', 'Visível no Mural Público'],
                  ['is_closed', 'Mesa Fechada / Trancada'],
                ] as const).map(([field, label]) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.85rem', color: '#4a3320', cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={formData[field as keyof typeof formData] as boolean}
                      onChange={e => setFormData({ ...formData, [field]: e.target.checked })}
                    /> {label}
                  </label>
                ))}
              </div>
              <button type="submit" className="btn-rpg btn-yellow" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}>
                {editingCampId ? 'Salvar Alterações' : 'Criar Mesa Agora'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SENHA DA SALA ── */}
      {promptRoom && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div className="paper-panel" style={{ maxWidth: 380, width: '100%', padding: '2rem', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setPromptRoom(null)}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, background: '#c6463d', color: '#fff', border: '2px solid black', borderRadius: 6, cursor: 'pointer', fontFamily: 'Bangers, cursive' }}>
              X
            </button>
            <Lock style={{ width: 40, height: 40, color: '#c6463d', margin: '0 auto 0.5rem' }} />
            <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.75rem', color: '#2c1e16', marginBottom: '0.25rem' }}>Mesa Protegida</h3>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3320', marginBottom: '1rem' }}>
              Informe o passe secreto de "{promptRoom.name}":
            </p>
            <form onSubmit={handleConfirmPasswordJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="password" required autoFocus placeholder="Senha da sala..."
                value={enteredPass} onChange={e => setEnteredPass(e.target.value)}
                style={{ width: '100%', background: '#d4c4a4', border: '2px solid #4a3320', borderRadius: 6, padding: '10px 12px', textAlign: 'center', fontWeight: 700, boxSizing: 'border-box', outline: 'none' }}
              />
              <button type="submit" className="btn-rpg btn-red" style={{ width: '100%', padding: '0.65rem' }}>Destrancar e Jogar</button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ROLADOR DE DADOS ── */}
      {isDiceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div className="paper-panel" style={{ maxWidth: 420, width: '100%', padding: '2rem', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setIsDiceModalOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, background: '#c6463d', color: '#fff', border: '2px solid black', borderRadius: 6, cursor: 'pointer', fontFamily: 'Bangers, cursive', fontSize: '1.1rem' }}>
              X
            </button>
            <Dices style={{ width: 40, height: 40, color: '#d6a32b', margin: '0 auto 0.5rem' }} />
            <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '2rem', color: '#2c1e16', marginBottom: '0.25rem' }}>Rolador da Taverna</h3>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b4c34', marginBottom: '1.5rem' }}>Escolha seu dado e teste sua sorte:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[4, 6, 8, 10, 12, 20].map(sides => (
                <button key={sides} className="btn-rpg btn-yellow"
                  style={{ padding: '0.5rem', fontSize: '1.1rem' }}
                  onClick={() => { const r = Math.floor(Math.random() * sides) + 1; setD20Val(r); toast.info(`d${sides}: Tirou ${r}!`); }}>
                  d{sides}
                </button>
              ))}
            </div>
            <div style={{ padding: '1rem', background: '#d4c4a4', borderRadius: 8, border: '2px solid #4a3320' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#6b4c34', display: 'block', marginBottom: 4 }}>Último Resultado:</span>
              <span style={{ fontFamily: 'Bangers, cursive', fontSize: '3rem', color: '#c6463d' }}>{d20Val}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAIS GLOBAIS DE AUTH ── */}
      <AuthModal />
      <ProfileModal />
      <ResetPasswordModal />

    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function NavBtn({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#e8dcc4', cursor: 'pointer', fontFamily: 'Bangers, cursive', fontSize: '1.2rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', transition: 'color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#d6a32b')}
      onMouseLeave={e => (e.currentTarget.style.color = '#e8dcc4')}>
      {icon}{children}
    </button>
  );
}

function StatBadge({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ background: '#d4c4a4', padding: '8px 14px', borderRadius: 8, border: '2px solid #4a3320', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, animation: 'pulse 2s infinite', flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4a3320', display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
        <span style={{ fontFamily: 'Bangers, cursive', fontSize: '1.3rem', color: '#2c1e16' }}>{value}</span>
      </div>
    </div>
  );
}

function FeatureCard({ icon, iconColor, title, desc, tag, tagColor = '#4a3320' }: { icon: React.ReactNode; iconColor: string; title: string; desc: string; tag: string; tagColor?: string }) {
  return (
    <div className="paper-panel" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem', position: 'relative', transition: 'transform 0.3s' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-8px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
      <div className="shadow-rpg" style={{ width: 72, height: 72, background: '#2c1e16', borderRadius: '50%', border: '4px solid #e8dcc4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, marginTop: '-3.5rem', marginBottom: '1rem', flexShrink: 0 }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.5rem', color: '#2c1e16', marginBottom: '0.75rem', letterSpacing: '0.03em' }}>{title}</h3>
      <p style={{ color: '#4a3320', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>{desc}</p>
      <div className="bg-grid" style={{ width: '100%', height: 100, background: '#d4c4a4', border: '2px solid #6b4c34', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
        <span style={{ fontFamily: 'Bangers, cursive', fontSize: '1.1rem', color: tagColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tag}</span>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; title?: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      style={{ padding: 7, background: '#d4c4a4', border: '2px solid #4a3320', borderRadius: 6, cursor: 'pointer', lineHeight: 0, color: danger ? '#c6463d' : '#2c1e16', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? '#fecaca' : '#ebdcc6')}
      onMouseLeave={e => (e.currentTarget.style.background = '#d4c4a4')}>
      {children}
    </button>
  );
}

const footerLinkStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#d4c4a4', cursor: 'pointer', padding: 0, fontWeight: 700, fontSize: '0.85rem', textAlign: 'left'
};
