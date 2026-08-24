import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Play, 
  Trash2, 
  Copy, 
  Check, 
  Globe, 
  Shield, 
  Sparkles, 
  BookOpen, 
  Calendar, 
  Image as ImageIcon,
  Key,
  ExternalLink,
  Users,
  Search,
  Folder,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Upload,
  ArrowLeft,
  Crown,
  UserMinus,
  UserPlus
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  getCampaigns, 
  createOrUpdateCampaign, 
  deleteCampaignCloud, 
  getCampaignMembers, 
  updateCampaignMemberRole, 
  removeCampaignMember, 
  joinCampaign, 
  CampaignCloudRecord, 
  CampaignMemberRecord 
} from '../../services/campaignCloudService';
import { updateWikiConfig } from '../../store/wiki';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { toast } from '../UI/Toast';
import { navigateToRoom, getVercelRoomUrl, getRoomUrl } from '../../utils/roomUrl';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenVault?: () => void;
}

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80'
];

export const CampaignLobbyModal: React.FC<Props> = ({ isOpen, onClose, onOpenVault }) => {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState<CampaignCloudRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Criar / Editar Mesa
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [system, setSystem] = useState('D&D 5e / Fantasia Medieval');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(DEFAULT_COVERS[0]);
  const [passCode, setPassCode] = useState('');
  const [wikiPath, setWikiPath] = useState('D:/DOZERO/wikidozero');
  const [isPublic, setIsPublic] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Gestão de Participantes / Membros
  const [selectedCampaignForMembers, setSelectedCampaignForMembers] = useState<CampaignCloudRecord | null>(null);
  const [members, setMembers] = useState<CampaignMemberRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen, user?.id]);

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await getCampaigns(user?.id);
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMembers = async (camp: CampaignCloudRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCampaignForMembers(camp);
    setIsCreating(false);
    setMembersLoading(true);
    try {
      const list = await getCampaignMembers(camp.id);
      setMembers(list);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar participantes da mesa.');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleChangeMemberRole = async (userId: string, role: 'gm' | 'player' | 'spectator') => {
    if (!selectedCampaignForMembers) return;
    const ok = await updateCampaignMemberRole(selectedCampaignForMembers.id, userId, role);
    if (ok) {
      toast.success('Papel do participante atualizado!');
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
    } else {
      toast.error('Não foi possível alterar o papel do membro.');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!selectedCampaignForMembers) return;
    if (confirm(`Remover "${memberName}" da campanha?`)) {
      const ok = await removeCampaignMember(selectedCampaignForMembers.id, userId);
      if (ok) {
        toast.info(`"${memberName}" foi removido da mesa.`);
        setMembers(prev => prev.filter(m => m.user_id !== userId));
      } else {
        toast.error('Erro ao remover membro da campanha.');
      }
    }
  };

  const handleJoinCampaignDirect = async (camp: CampaignCloudRecord) => {
    if (!user?.id) {
      toast.error('Faça login para entrar na campanha.');
      return;
    }
    const ok = await joinCampaign(camp.id, user.id, 'player');
    if (ok) {
      toast.success('Você entrou na campanha como Jogador!');
      handleOpenMembers(camp);
      loadList();
    } else {
      toast.error('Erro ao ingressar na mesa.');
    }
  };

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingId(null);
    setSelectedCampaignForMembers(null);
    setName('');
    setSystem('D&D 5e / Fantasia Medieval');
    setDescription('');
    setCoverUrl(DEFAULT_COVERS[0]);
    setPassCode('');
    setWikiPath('D:/DOZERO/wikidozero');
    setIsPublic(true);
    setIsClosed(false);
    setIsCreating(true);
  };

  const handleOpenEdit = (camp: CampaignCloudRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(camp.id);
    setName(camp.name);
    setSystem(camp.system);
    setDescription(camp.description || '');
    setCoverUrl(camp.cover_url || DEFAULT_COVERS[0]);
    setPassCode(camp.pass_code || '');
    setWikiPath(localStorage.getItem(`dozero_wiki_path_${camp.room_code}`) || 'D:/DOZERO/wikidozero');
    setIsPublic(camp.is_public !== false);
    setIsClosed(camp.is_closed === true);
    setIsCreating(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverUrl(String(event.target.result));
        toast.success("Imagem de capa local carregada!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newCamp = await createOrUpdateCampaign({
        id: editingId || undefined,
        name: name.trim(),
        system: system.trim(),
        description: description.trim(),
        cover_url: coverUrl.trim(),
        pass_code: passCode.trim(),
        is_public: isPublic,
        is_closed: isClosed
      }, user?.id);

      // Salva o caminho local da wiki isolado no navegador do mestre local
      if (wikiPath.trim()) {
        localStorage.setItem(`dozero_wiki_path_${newCamp.room_code}`, wikiPath.trim());
      }

      toast.success(`Campanha "${newCamp.name}" salva com sucesso!`);
      setIsCreating(false);
      loadList();
    } catch (err) {
      toast.error('Erro ao salvar campanha.');
    }
  };

  const handleDelete = async (id: string, campName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir a campanha "${campName}"?`)) {
      await deleteCampaignCloud(id, user?.id);
      toast.info(`Campanha "${campName}" removida.`);
      loadList();
    }
  };

  const handleCopyInvite = (camp: CampaignCloudRecord, e: React.MouseEvent, type: 'vercel' | 'local' = 'vercel') => {
    e.stopPropagation();
    const url = type === 'vercel' ? getVercelRoomUrl(camp.room_code, camp.pass_code || undefined) : getRoomUrl(camp.room_code, camp.pass_code || undefined);
    navigator.clipboard.writeText(url);
    setCopiedId(`${camp.id}_${type}`);
    toast.success(type === 'vercel' ? 'Link Vercel da mesa copiado (Para jogadores na Web)!' : 'Link Local copiado!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleEnterRoom = (camp: CampaignCloudRecord) => {
    if (camp.is_closed) {
      toast.error("Esta sala foi trancada/fechada pelo Mestre.");
      return;
    }

    // Configura o repositório/pasta da Wiki apontado para a mesa (lendo do localStorage da sala)
    const localRoomWiki = localStorage.getItem(`dozero_wiki_path_${camp.room_code}`) || 'D:/DOZERO/wikidozero';
    updateWikiConfig({ repoUrl: localRoomWiki });
    WikiIndexer.clearCache();

    navigateToRoom(camp.room_code, camp.pass_code || undefined);
  };

  const filteredCampaigns = campaigns.filter(c => 
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.system.toLowerCase().includes(search.toLowerCase())) &&
    (c.is_public !== false || c.owner_id === user?.id)
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(20, 14, 10, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '850px',
        maxHeight: '92vh',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '24px',
        boxShadow: 'var(--glass-shadow)',
        padding: '24px',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/mascot/zye-head-smile.png" 
              alt="Zye" 
              style={{ width: '42px', height: '42px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px var(--accent-glow))' }} 
            />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Mural de Campanhas & Gerenciador de Mesas
                <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', background: user ? 'rgba(56, 102, 65, 0.3)' : 'var(--bg-tertiary)', color: user ? 'var(--success)' : 'var(--warning)', border: `1px solid ${user ? 'var(--success)' : 'var(--glass-border)'}` }}>
                  {user ? 'Nuvem Supabase' : 'Offline / Local'}
                </span>
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Gerencie nomes, capas locais, pastas de wiki e visibilidade pública de suas mesas de RPG.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Actions & Search */}
        {!isCreating && !selectedCampaignForMembers && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '16px 0 12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c6e5a' }} />
              <input
                type="text"
                placeholder="Buscar campanha por nome ou sistema..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '12px',
                  background: '#1a110b',
                  border: '1px solid #4a3528',
                  color: '#fdfaf5',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {onOpenVault && (
              <button
                onClick={() => { onClose(); onOpenVault(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px',
                  background: 'rgba(164,104,48,0.12)',
                  border: '1px solid #c49a6c',
                  borderRadius: '12px',
                  color: '#c49a6c',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                <Shield size={15} /> Vault
              </button>
            )}

            <button
              onClick={handleOpenCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                background: 'linear-gradient(135deg, #a46830 0%, #8b5220 100%)',
                border: '1px solid #c49a6c',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(164, 104, 48, 0.4)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} /> Nova Campanha
            </button>
          </div>
        )}

        {selectedCampaignForMembers ? (
          /* Gerenciador de Membros da Campanha */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', overflowY: 'auto' }}>
            {/* Top Bar com Voltar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid #4a3528' }}>
              <button
                onClick={() => setSelectedCampaignForMembers(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: 'none', color: '#c49a6c',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} /> Voltar para Todas as Mesas
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => handleCopyInvite(selectedCampaignForMembers, e, 'vercel')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', background: 'rgba(164,104,48,0.2)',
                    border: '1px solid #c49a6c', borderRadius: '8px',
                    color: '#fde047', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <Globe size={13} /> Convidar com Link Vercel
                </button>
              </div>
            </div>

            {/* Header da Campanha Selecionada */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', background: '#18100b', borderRadius: '12px', border: '1px solid #5a4234' }}>
              <img
                src={selectedCampaignForMembers.cover_url || DEFAULT_COVERS[0]}
                alt={selectedCampaignForMembers.name}
                style={{ width: '80px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fdfaf5' }}>
                    {selectedCampaignForMembers.name}
                  </h3>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(253,224,71,0.15)', border: '1px solid #a46830', borderRadius: '4px', color: '#fde047', fontWeight: 700 }}>
                    {selectedCampaignForMembers.system}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#a1a1aa' }}>
                  Código da Sala: <code style={{ color: '#c49a6c', background: '#120b07', padding: '2px 6px', borderRadius: '4px' }}>{selectedCampaignForMembers.room_code}</code>
                </p>
              </div>

              {user && !members.some(m => m.user_id === user.id) && (
                <button
                  onClick={() => handleJoinCampaignDirect(selectedCampaignForMembers)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                    border: '1px solid #22c55e', borderRadius: '8px',
                    color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <UserPlus size={14} /> Entrar nesta Mesa
                </button>
              )}
            </div>

            {/* Lista de Membros */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d7c9b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} color="#c49a6c" /> Participantes Registrados ({members.length})
                </span>
              </div>

              {membersLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#a1a1aa', fontSize: '0.8rem' }}>
                  Carregando lista de participantes...
                </div>
              ) : members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed #4a3528', borderRadius: '12px' }}>
                  <Users size={32} style={{ color: '#8c6e5a', marginBottom: '6px' }} />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#d7c9b8' }}>Nenhum participante registrado ainda nesta mesa.</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#a1a1aa' }}>Compartilhe o link da sala para que os jogadores possam ingressar.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map(member => {
                    const isOwner = selectedCampaignForMembers.owner_id === member.user_id;
                    const isCurrentUserGM = selectedCampaignForMembers.owner_id === user?.id || members.some(m => m.user_id === user?.id && m.role === 'gm');
                    const displayName = member.profile?.full_name || member.profile?.username || member.character_name || 'Jogador';
                    const avatar = member.profile?.avatar_url;

                    return (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid #4a3528',
                          borderRadius: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {avatar ? (
                            <img src={avatar} alt={displayName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #c49a6c' }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3b281d', border: '1px solid #5a4234', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fde047', fontWeight: 700, fontSize: '0.85rem' }}>
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fdfaf5' }}>
                                {displayName}
                              </span>
                              {isOwner && (
                                <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(234,179,8,0.2)', border: '1px solid #eab308', color: '#fde047', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Crown size={10} /> Criador
                                </span>
                              )}
                              {member.user_id === user?.id && (
                                <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', color: '#93c5fd' }}>
                                  Você
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>
                              Entrou em: {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Recentemente'}
                            </span>
                          </div>
                        </div>

                        {/* Cargo & Ações */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isCurrentUserGM && !isOwner && member.user_id !== user?.id ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeMemberRole(member.user_id, e.target.value as any)}
                              style={{
                                padding: '4px 8px',
                                background: '#120b07',
                                border: '1px solid #5a4234',
                                borderRadius: '6px',
                                color: member.role === 'gm' ? '#fde047' : member.role === 'player' ? '#60a5fa' : '#c084fc',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="gm">Mestre (GM)</option>
                              <option value="player">Jogador</option>
                              <option value="spectator">Espectador</option>
                            </select>
                          ) : (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: member.role === 'gm' ? 'rgba(234,179,8,0.15)' : member.role === 'player' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)',
                              border: `1px solid ${member.role === 'gm' ? '#eab308' : member.role === 'player' ? '#3b82f6' : '#a855f7'}`,
                              color: member.role === 'gm' ? '#fde047' : member.role === 'player' ? '#60a5fa' : '#c084fc',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {member.role === 'gm' ? <Crown size={11} /> : member.role === 'player' ? <Shield size={11} /> : <Eye size={11} />}
                              {member.role === 'gm' ? 'Mestre' : member.role === 'player' ? 'Jogador' : 'Espectador'}
                            </span>
                          )}

                          {isCurrentUserGM && !isOwner && member.user_id !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(member.user_id, displayName)}
                              title="Remover da mesa"
                              style={{
                                padding: '5px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '6px',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <UserMinus size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : isCreating ? (
          /* Formulário de Criação / Edição */
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#c49a6c', fontWeight: 700 }}>
              {editingId ? 'Editar Dados da Mesa' : 'Nova Campanha de RPG'}
            </h3>

            {/* Nome & Sistema */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d7c9b8', marginBottom: '4px' }}>
                  Nome da Campanha *
                </label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: A Cripta do Rei Esquecido"
                  style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d7c9b8', marginBottom: '4px' }}>
                  Sistema de Regras
                </label>
                <input
                  value={system}
                  onChange={e => setSystem(e.target.value)}
                  placeholder="Ex: D&D 5e, Tormenta20, CoC 7e, Fate"
                  style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Descrição / Sinopse */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d7c9b8', marginBottom: '4px' }}>
                Sinopse / Notas para os Jogadores
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Breve resumo da aventura, premissa inicial e avisos..."
                rows={3}
                style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Configuração Centralizada da Pasta da Wiki */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: '#fde047', marginBottom: '4px' }}>
                <Folder size={14} /> Pasta Local da Wiki (Personagens & Lore)
              </label>
              <input
                value={wikiPath}
                onChange={e => setWikiPath(e.target.value)}
                placeholder="Ex: D:/DOZERO/wikidozero ou /minha-pasta-wiki"
                style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #c49a6c', borderRadius: '8px', color: '#c49a6c', fontSize: '0.82rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '0.65rem', color: '#a1a1aa', marginTop: '2px', display: 'block' }}>
                Ao abrir esta mesa, os personagens, locais e itens serão automaticamente carregados desta pasta.
              </span>
            </div>

            {/* Imagem de Capa (URL ou Upload Local) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d7c9b8', marginBottom: '4px' }}>
                Imagem de Capa da Mesa
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  value={coverUrl}
                  onChange={e => setCoverUrl(e.target.value)}
                  placeholder="Cole a URL da imagem ou escolha um arquivo..."
                  style={{ flex: 1, padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#3b281d', border: '1px solid #5a4234', borderRadius: '8px', color: '#d7c9b8', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <Upload size={14} /> Enviar Foto Local
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>Sugestões rápidas:</span>
                {DEFAULT_COVERS.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt="Capa"
                    onClick={() => setCoverUrl(url)}
                    style={{ width: '38px', height: '24px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer', border: coverUrl === url ? '2px solid #a46830' : '1px solid rgba(255,255,255,0.2)' }}
                  />
                ))}
              </div>
            </div>

            {/* Opções de Visibilidade & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d7c9b8', marginBottom: '4px' }}>
                  Senha da Sala
                </label>
                <input
                  type="password"
                  value={passCode}
                  onChange={e => setPassCode(e.target.value)}
                  placeholder="Senha opcional"
                  style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d7c9b8', marginBottom: '4px' }}>
                  Visibilidade no Lobby
                </label>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: isPublic ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${isPublic ? '#22c55e' : '#ef4444'}`, color: isPublic ? '#4ade80' : '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
                  {isPublic ? 'Pública (Visível)' : 'Oculta (Privada)'}
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d7c9b8', marginBottom: '4px' }}>
                  Status da Mesa
                </label>
                <button
                  type="button"
                  onClick={() => setIsClosed(!isClosed)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: isClosed ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', border: `1px solid ${isClosed ? '#ef4444' : '#3b82f6'}`, color: isClosed ? '#f87171' : '#60a5fa', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {isClosed ? <Lock size={14} /> : <Unlock size={14} />}
                  {isClosed ? 'Fechada / Trancada' : 'Aberta para Jogar'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #5a4234', borderRadius: '8px', color: '#d7c9b8', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #a46830 0%, #8b5220 100%)', border: '1px solid #c49a6c', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {editingId ? 'Salvar Alterações' : 'Criar Mesa & Salvar'}
              </button>
            </div>
          </form>
        ) : (
          /* Grid de Campanhas */
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginTop: '6px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#a1a1aa', fontSize: '0.85rem' }}>
                Carregando suas campanhas...
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                border: '2px dashed #5a4234',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}>
                <img 
                  src="/mascot/zye-scholar-books.png" 
                  alt="Zye" 
                  style={{ width: '85px', height: 'auto', marginBottom: '4px', filter: 'drop-shadow(0 4px 12px rgba(164, 104, 48, 0.4))' }} 
                />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fdfaf5' }}>Nenhuma campanha encontrada</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#d7c9b8', maxWidth: '320px' }}>
                  Crie sua primeira campanha para salvar seus mapas, tokens, wikis e histórico de sessão.
                </p>
                <button
                  onClick={handleOpenCreate}
                  style={{
                    marginTop: '6px',
                    padding: '8px 16px',
                    background: '#a46830',
                    border: '1px solid #c49a6c',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  + Criar Minha Primeira Mesa
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
                {filteredCampaigns.map(camp => (
                  <div
                    key={camp.id}
                    onClick={() => handleEnterRoom(camp)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid #4a3528',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      cursor: camp.is_closed ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, border 0.2s, box-shadow 0.2s',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                      opacity: camp.is_closed ? 0.7 : 1
                    }}
                  >
                    {/* Capa */}
                    <div style={{ position: 'relative', width: '100%', height: '110px', background: '#000' }}>
                      <img 
                        src={camp.cover_url || DEFAULT_COVERS[0]} 
                        alt={camp.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: camp.is_closed ? 0.4 : 0.8 }} 
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.8) 100%)' }} />
                      <span style={{
                        position: 'absolute', top: '8px', left: '8px',
                        fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px',
                        borderRadius: '4px', background: 'rgba(0,0,0,0.7)',
                        color: '#fde047', border: '1px solid #a46830'
                      }}>
                        {camp.system}
                      </span>

                      {camp.is_closed && (
                        <span style={{
                          position: 'absolute', top: '8px', right: '8px',
                          fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px',
                          borderRadius: '4px', background: 'rgba(239,68,68,0.8)',
                          color: '#fff', display: 'flex', alignItems: 'center', gap: '3px'
                        }}>
                          <Lock size={10} /> Fechada
                        </span>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fdfaf5' }}>
                        {camp.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#d7c9b8', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {camp.description || 'Sem descrição definida.'}
                      </p>

                      {localStorage.getItem(`dozero_wiki_path_${camp.room_code}`) && (
                        <div style={{ fontSize: '0.65rem', color: '#c49a6c', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Folder size={11} /> {localStorage.getItem(`dozero_wiki_path_${camp.room_code}`)}
                        </div>
                      )}

                      {/* Botão de Membros & Participantes */}
                      <div style={{ marginTop: '4px' }}>
                        <button
                          onClick={(e) => handleOpenMembers(camp, e)}
                          title="Ver e gerenciar participantes desta campanha"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid #4a3528',
                            borderRadius: '6px',
                            color: '#d7c9b8',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Users size={12} color="#c49a6c" />
                          <span>Participantes & Membros</span>
                        </button>
                      </div>

                      {/* Rodapé do Card com Ações */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #3b281d' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={(e) => handleCopyInvite(camp, e, 'vercel')}
                            title="Copiar Link Online (Vercel) para Jogadores"
                            style={{ padding: '5px 8px', borderRadius: '6px', background: 'rgba(164,104,48,0.25)', border: '1px solid #c49a6c', color: copiedId === `${camp.id}_vercel` ? '#86efac' : '#fde047', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}
                          >
                            <Globe size={12} />
                            {copiedId === `${camp.id}_vercel` ? 'Copiado!' : 'Link'}
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(camp, e)}
                            title="Editar Dados da Mesa"
                            style={{ padding: '5px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid #5a4234', color: '#d7c9b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Folder size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(camp.id, camp.name, e)}
                            title="Excluir Campanha"
                            style={{ padding: '5px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <button
                          onClick={() => handleEnterRoom(camp)}
                          disabled={camp.is_closed}
                          style={{
                            padding: '4px 10px',
                            background: camp.is_closed ? '#5a4234' : 'linear-gradient(135deg, #a46830 0%, #8b5220 100%)',
                            border: '1px solid #c49a6c',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: camp.is_closed ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Play size={11} fill="#fff" /> {camp.is_closed ? 'Trancada' : 'Entrar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
