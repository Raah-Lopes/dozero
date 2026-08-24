import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Key, Link as LinkIcon, QrCode, Network, Database, Trash2, Globe, Sparkles, ExternalLink, Folder, Eye, EyeOff, Lock, Unlock, Upload, Save, History, Download, FileUp, ShieldAlert } from 'lucide-react';
import { toast } from '../../UI/Toast';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { useWindowManager } from '../../../hooks/useWindowManager';
import { getWikiConfig, updateWikiConfig } from '../../../store/wiki';
import { WikiIndexer } from '../../../services/wiki/WikiIndexer';
import { createOrUpdateCampaign, getCampaigns, CampaignCloudRecord } from '../../../services/campaignCloudService';
import { useAuthStore } from '../../../store/authStore';
import { navigateToRoom, getVercelRoomUrl, getRoomUrl } from '../../../utils/roomUrl';
import { 
  createManualSnapshot, 
  restoreCloudSnapshot, 
  exportSnapshotToFile, 
  importSnapshotFromFile 
} from '../../../services/sessionSnapshotManager';

interface RoomManagerWidgetProps {
  onClose?: () => void;
}

export const RoomManagerWidget: React.FC<RoomManagerWidgetProps> = ({ onClose }) => {
  const { setActiveModal } = useWindowManager();
  const { user } = useAuthStore();
  
  const urlParams = new URLSearchParams(window.location.search);
  const currentRoom = urlParams.get('room') || 'dozero-mesa-principal-v2';
  const currentPass = urlParams.get('pass') || '';

  const [roomNameTitle, setRoomNameTitle] = useState(currentRoom);
  const [wikiPath, setWikiPath] = useState(() => getWikiConfig().repoUrl || 'D:/DOZERO/wikidozero');
  const [coverUrl, setCoverUrl] = useState('/assets/vtt_layout_hero.jpg');
  const [isPublic, setIsPublic] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  const [newRoom, setNewRoom] = useState('');
  const [newPass, setNewPass] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  const [localRooms, setLocalRooms] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Carrega dados da campanha atual para preencher os campos
    getCampaigns(user?.id).then(list => {
      const found = list.find(c => c.room_code === currentRoom);
      if (found) {
        if (found.name) setRoomNameTitle(found.name);
        if (found.cover_url) setCoverUrl(found.cover_url);
        if (found.is_public !== undefined) setIsPublic(found.is_public);
        if (found.is_closed !== undefined) setIsClosed(found.is_closed);
      }
      // wikiPath é local — lê do localStorage isolado por sala
      const localWiki = localStorage.getItem(`dozero_wiki_path_${currentRoom}`);
      if (localWiki) setWikiPath(localWiki);
    });
  }, [currentRoom, user?.id]);

  const handleSaveRoomSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Atualiza repositório da Wiki localmente
      updateWikiConfig({ repoUrl: wikiPath.trim() });
      WikiIndexer.clearCache();
      if (wikiPath.trim()) {
        localStorage.setItem(`dozero_wiki_path_${currentRoom}`, wikiPath.trim());
      }

      // 2. Atualiza registro da mesa no cache cloud/local (sem wikiPath local)
      await createOrUpdateCampaign({
        room_code: currentRoom,
        name: roomNameTitle.trim() || currentRoom,
        pass_code: currentPass,
        cover_url: coverUrl.trim(),
        is_public: isPublic,
        is_closed: isClosed
      }, user?.id);

      toast.success("Configurações da mesa e pasta da Wiki salvas com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar configurações da mesa.");
    }
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

  const scanLocalRooms = async () => {
    setIsScanning(true);
    try {
      if (window.indexedDB && window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        const roomNames = dbs.map(d => d.name).filter(Boolean) as string[];
        setLocalRooms(roomNames);
        toast.success(`${roomNames.length} sala(s) encontrada(s) no PC.`);
      } else {
        toast.info("Navegador não suporta listagem de bancos IndexedDB.");
      }
    } catch (e) {
      toast.error("Erro ao buscar bancos locais.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeleteRoom = (roomNameToDelete: string) => {
    if (roomNameToDelete === currentRoom) {
      toast.info("Você não pode deletar a sala atual em que está conectado!");
      return;
    }
    if (confirm(`Deletar permanentemente os dados da sala "${roomNameToDelete}" no PC?`)) {
      window.indexedDB.deleteDatabase(roomNameToDelete);
      setLocalRooms(prev => prev.filter(r => r !== roomNameToDelete));
      toast.success(`Sala "${roomNameToDelete}" removida do PC.`);
    }
  };

  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);

  const handleCreateSnapshot = async () => {
    setIsSavingSnapshot(true);
    await createManualSnapshot(currentRoom, user?.id);
    setIsSavingSnapshot(false);
  };

  const handleRestoreSnapshot = async () => {
    if (confirm('Atenção: Restaurar a mesa substituirá os tokens, desenhos e combate atuais pelo último ponto salvo na nuvem. Deseja continuar?')) {
      setIsRestoringSnapshot(true);
      await restoreCloudSnapshot(currentRoom);
      setIsRestoringSnapshot(false);
    }
  };

  const handleExportJSON = () => {
    exportSnapshotToFile(currentRoom, user?.id);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (confirm(`Restaurar mesa a partir do arquivo de backup "${file.name}"?`)) {
      await importSnapshotFromFile(file);
    }
  };

  const vercelLink = getVercelRoomUrl(currentRoom, currentPass || undefined);
  const localLink = getRoomUrl(currentRoom, currentPass || undefined);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vercelLink)}`;

  const handleCopy = (type: 'vercel' | 'local' = 'vercel') => {
    const url = type === 'vercel' ? vercelLink : localLink;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(type === 'vercel' ? "Link da Vercel (Online) copiado!" : "Link Local copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    toast.info(`Trocando de sala: ${newRoom.trim()}...`);
    navigateToRoom(newRoom.trim(), newPass.trim() || undefined);
  };

  const handleRandomRoom = () => {
    const adjs = ['escura', 'sangrenta', 'eterna', 'perdida', 'sombria', 'profunda', 'mística'];
    const nouns = ['taverna', 'masmorra', 'torre', 'caverna', 'fortaleza', 'tumba', 'cripta'];
    const rnd = (max: number) => Math.floor(Math.random() * max);
    setNewRoom(`${nouns[rnd(nouns.length)]}-${adjs[rnd(adjs.length)]}-${Math.floor(Math.random() * 9999)}`);
  };

  const content = (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      
      {/* 1. Open Cloud Lobby Banner */}
      <div className="glass-panel" style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(164,104,48,0.2) 0%, rgba(38,25,17,0.4) 100%)', border: '1px solid #c49a6c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fdfaf5', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} className="text-amber-400" /> Mural de Campanhas & Nuvem
            </div>
            <div style={{ fontSize: '0.72rem', color: '#d7c9b8', marginTop: '2px' }}>
              Navegue pelas suas mesas salvas ou troque de campanha.
            </div>
          </div>
          <button
            onClick={() => setActiveModal('lobby')}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Abrir Mural <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* 2. Gerenciador Completo da Mesa (Pasta da Wiki, Capa Local, Visibilidade) */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fdfaf5' }}>
          <Folder size={18} className="theme-amber" />
          Gerenciar Configurações da Mesa
        </h3>

        <form onSubmit={handleSaveRoomSettings} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#d4d4d8', marginBottom: '3px' }}>
              Nome da Mesa:
            </label>
            <input
              type="text"
              value={roomNameTitle}
              onChange={e => setRoomNameTitle(e.target.value)}
              placeholder="Ex: A Maldição de Strahd"
              style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '8px', fontSize: '0.8rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Apontar Pasta da Wiki */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#fde047', marginBottom: '3px', fontWeight: 700 }}>
              <Folder size={13} /> Pasta Local da Wiki (Personagens/Lore):
            </label>
            <input
              type="text"
              value={wikiPath}
              onChange={e => setWikiPath(e.target.value)}
              placeholder="Ex: D:/DOZERO/wikidozero"
              style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid #c49a6c', color: '#c49a6c', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>

          {/* Imagem de Capa */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#d4d4d8', marginBottom: '3px' }}>
              Capa da Mesa (URL ou Foto Local):
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                placeholder="https://..."
                style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '8px', fontSize: '0.8rem', boxSizing: 'border-box' }}
              />
              <label style={{ padding: '8px 10px', background: '#3b281d', border: '1px solid #5a4234', borderRadius: '8px', color: '#d7c9b8', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <Upload size={13} /> Foto Local
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Toggles: Visibilidade e Status Fechada */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              style={{ padding: '8px', borderRadius: '8px', background: isPublic ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${isPublic ? '#22c55e' : '#ef4444'}`, color: isPublic ? '#4ade80' : '#f87171', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              {isPublic ? <Eye size={13} /> : <EyeOff size={13} />}
              {isPublic ? 'Visível no Lobby' : 'Oculta no Lobby'}
            </button>

            <button
              type="button"
              onClick={() => setIsClosed(!isClosed)}
              style={{ padding: '8px', borderRadius: '8px', background: isClosed ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', border: `1px solid ${isClosed ? '#ef4444' : '#3b82f6'}`, color: isClosed ? '#f87171' : '#60a5fa', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              {isClosed ? <Lock size={13} /> : <Unlock size={13} />}
              {isClosed ? 'Trancar / Fechar' : 'Mesa Aberta'}
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '9px', marginTop: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Save size={15} /> Salvar Configurações da Mesa
          </button>
        </form>
      </div>

      {/* 3. Current Room Convites & Links */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fdfaf5' }}>
          <Network size={18} className="theme-indigo" />
          Convites da Sala Atual ({currentRoom})
        </h3>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-primary" 
            onClick={() => handleCopy('vercel')}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #a46830 0%, #8b5220 100%)', border: '1px solid #c49a6c' }}
          >
            <Globe size={15} />
            {copied ? 'Copiado!' : 'Copiar Link Vercel (Online)'}
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => handleCopy('local')}
            title="Copiar Link Local"
            style={{ padding: '9px 12px', fontSize: '0.75rem' }}
          >
            Local
          </button>
          <button 
            className="btn-icon" 
            onClick={() => setShowQR(!showQR)}
            title="Mostrar QR Code da Vercel"
            style={{ padding: '9px' }}
          >
            <QrCode size={18} />
          </button>
        </div>

        {showQR && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'white', padding: '16px', borderRadius: '12px' }}>
            <img loading="lazy" decoding="async" src={qrUrl} alt="QR Code Convite" style={{ width: '180px', height: '180px' }} />
            <span style={{ fontSize: '0.75rem', color: '#333', fontWeight: 600 }}>Escaneie para entrar na mesa no celular</span>
          </div>
        )}
      </div>

      {/* 4. Snapshots & Ponto de Restauração da Mesa */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fde047' }}>
          <History size={18} color="#fde047" />
          Snapshots & Ponto de Restauração
        </h3>
        <p style={{ margin: '0 0 12px 0', fontSize: '0.72rem', color: '#a1a1aa' }}>
          Grave o estado consolidado da mesa (tokens, cenários, combate e desenhos) ou restaure a qualquer momento.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={isSavingSnapshot}
            style={{
              padding: '8px 12px',
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              color: '#4ade80',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Save size={14} />
            {isSavingSnapshot ? 'Salvando...' : 'Salvar Snapshot'}
          </button>

          <button
            type="button"
            onClick={handleRestoreSnapshot}
            disabled={isRestoringSnapshot}
            style={{
              padding: '8px 12px',
              background: 'rgba(234,179,8,0.15)',
              border: '1px solid #eab308',
              borderRadius: '8px',
              color: '#fde047',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <History size={14} />
            {isRestoringSnapshot ? 'Restaurando...' : 'Restaurar Nuvem'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
          <button
            type="button"
            onClick={handleExportJSON}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #5a4234',
              borderRadius: '8px',
              color: '#d7c9b8',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Download size={13} /> Exportar .JSON
          </button>

          <label
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #5a4234',
              borderRadius: '8px',
              color: '#d7c9b8',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <FileUp size={13} /> Importar .JSON
            <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* 5. Fast Room Switcher */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fdfaf5' }}>
          <LinkIcon size={18} className="theme-green" />
          Trocar / Criar Nova Sala
        </h3>

        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: '#d4d4d8' }}>Nome da Nova Sala:</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="text" 
                value={newRoom}
                onChange={e => setNewRoom(e.target.value)}
                placeholder="Ex: caverna-dos-goblins"
                style={{ flex: 1, padding: '8px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '8px', fontSize: '0.8rem' }}
              />
              <button 
                type="button" 
                onClick={handleRandomRoom}
                className="btn-icon theme-blue"
                title="Gerar Nome Aleatório"
                style={{ padding: '8px' }}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: '#d4d4d8' }}>Senha Opcional:</label>
            <input 
              type="text" 
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Senha de acesso..."
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '8px', fontSize: '0.8rem', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!newRoom.trim()}
            style={{ padding: '9px', marginTop: '4px', fontSize: '0.8rem' }}
          >
            Entrar / Criar Esta Sala
          </button>
        </form>
      </div>

      {/* 5. Local IndexedDB Cache Scanner */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fdfaf5' }}>
          <Database size={18} className="theme-orange" />
          Salas Salvas no PC (IndexedDB)
        </h3>

        <button 
          className="btn-secondary" 
          onClick={scanLocalRooms}
          style={{ width: '100%', padding: '8px', marginBottom: '10px', fontSize: '0.78rem' }}
        >
          {isScanning ? 'Escaneando...' : 'Escanear Salas Salvas Localmente'}
        </button>

        {localRooms.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '8px' }}>
            {localRooms.map(r => (
              <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.82rem', color: r === currentRoom ? '#c49a6c' : '#fdfaf5' }}>{r}</span>
                  {r === currentRoom && <span style={{ fontSize: '0.65rem', color: '#86efac', fontWeight: 700 }}>● Sala Conectada</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {r !== currentRoom && (
                    <button 
                      className="btn-icon theme-blue" 
                      onClick={() => navigateToRoom(r)}
                      title="Entrar nesta sala"
                      style={{ padding: '6px' }}
                    >
                      <LinkIcon size={13} />
                    </button>
                  )}
                  <button 
                    className="btn-icon theme-red" 
                    onClick={() => handleDeleteRoom(r)}
                    disabled={r === currentRoom}
                    title="Excluir Dados Locais"
                    style={{ padding: '6px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (onClose) {
    return (
      <DraggableWindow
        id="roomManager"
        title="Gerenciador de Salas & Conexão"
        initialX={180}
        initialY={80}
        width={480}
        height={600}
        onClose={onClose}
      >
        {content}
      </DraggableWindow>
    );
  }

  return content;
};
