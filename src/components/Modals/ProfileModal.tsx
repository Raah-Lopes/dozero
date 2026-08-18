import React, { useState } from 'react';
import { X, User, Camera, Check, AlertCircle, Loader2, Calendar, Shield, LogOut, Upload } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const ProfileModal: React.FC = () => {
  const { user, isProfileModalOpen, setProfileModalOpen, updateUserProfile, uploadAvatar, signOut } = useAuthStore();
  const [fullName, setFullName] = useState(user?.user_metadata?.custom_avatar ? (user?.user_metadata?.full_name || user?.user_metadata?.name || '') : '');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sincroniza campos com o usuário atual
  React.useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '');
      setAvatarUrl(user.user_metadata?.custom_avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture || '');
    }
  }, [user, isProfileModalOpen]);

  if (!isProfileModalOpen || !user) return null;

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploadingAvatar(true);

    try {
      const publicUrl = await uploadAvatar(file);
      setAvatarUrl(publicUrl);
      setSuccessMsg('Avatar otimizado e atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload do avatar:', err);
      setErrorMsg(err.message || 'Falha ao fazer upload da imagem. Verifique se o bucket "avatars" existe no Supabase Storage.');
    } finally {
      setIsUploadingAvatar(false);
      // Limpa input
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await updateUserProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim(),
      });
      setSuccessMsg('Perfil atualizado com sucesso!');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setErrorMsg(err.message || 'Falha ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Recente';

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setProfileModalOpen(false);
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '18px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(168, 85, 247, 0.2)',
          padding: '24px',
          color: '#f4f4f5',
          fontFamily: 'var(--font-body, sans-serif)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex' }}>
              <User size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fafafa' }}>
                Meu Perfil
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#a1a1aa' }}>
                Gerencie sua identidade de jogador/mestre
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProfileModalOpen(false)}
            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card Overview */}
        <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(168, 85, 247, 0.5)' }} 
            />
          ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.2)', border: '2px solid rgba(168, 85, 247, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#c084fc' }}>
              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fafafa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName || user.email?.split('@')[0]}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
            <div style={{ marginTop: '4px', display: 'flex', gap: '10px', fontSize: '0.65rem', color: '#71717a' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={11} /> Criado em {createdAt}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
                <Shield size={11} /> Conta Gratuita
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, color: '#f87171' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={15} style={{ flexShrink: 0, color: '#34d399' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSave} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '5px' }}>
              Nome de Exibição / Nickname
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Mestre Arcano"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#09090b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '0.85rem',
                color: '#fafafa',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '5px' }}>
              Foto de Perfil (Avatar)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Camera size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://... ou faça upload"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#09090b',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    padding: '9px 12px 9px 36px',
                    fontSize: '0.85rem',
                    color: '#fafafa',
                    outline: 'none',
                  }}
                />
              </div>

              <label
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Otimizando...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Upload WebP</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingAvatar}
                  onChange={handleAvatarFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#71717a' }}>
              💡 Imagens enviadas são convertidas e comprimidas para WebP (256x256) automaticamente.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                background: 'linear-gradient(135deg, #9333ea, #6366f1)',
                border: 'none',
                borderRadius: '10px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(147, 51, 234, 0.4)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja sair da conta?')) {
                  signOut();
                }
              }}
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: '#fca5a5',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
