import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { verifyRoomAccess, type RoomAccess } from '../../services/roomAccessService';
import { startAuthorizedRoomSync, stopRoomSync } from '../../services/yjs';
import { useUserStore } from '../../store/user';
import { AuthModal } from '../Modals/AuthModal';
import { LoadingState } from '../UI/LoadingState';

export function RoomAccessGate({ roomCode, children }: { roomCode: string; children: React.ReactNode }) {
  const { user, loading, setAuthModalOpen } = useAuthStore();
  const setIsGM = useUserStore(state => state.setIsGM);
  const [access, setAccess] = React.useState<RoomAccess | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!user) {
      setAccess({ allowed: false, reason: 'not_authenticated' });
      stopRoomSync();
      return;
    }
    setAccess(null);
    void (async () => {
      let result = await verifyRoomAccess(roomCode);
      // Falhas HTTP/2/reset do gateway não significam falta de permissão.
      // Tentamos novamente antes de fechar a mesa para o usuário.
      for (const delay of [600, 1400]) {
        if (result.allowed || result.reason !== 'unavailable') break;
        await new Promise(resolve => window.setTimeout(resolve, delay));
        if (cancelled) return;
        result = await verifyRoomAccess(roomCode);
      }
      if (cancelled) return;
      setAccess(result);
      if (result.allowed) {
        setIsGM(result.role === 'admin' || result.role === 'owner' || result.role === 'gm');
        startAuthorizedRoomSync();
      } else { setIsGM(false); stopRoomSync(); }
    })().catch(() => !cancelled && setAccess({ allowed: false, reason: 'unavailable' }));
    return () => { cancelled = true; };
  }, [roomCode, user?.id, loading, setIsGM, retryKey]);

  if (loading || !access) return <GateScreen title="Validando acesso à mesa…" />;
  if (access.allowed) return <>{children}</>;
  const copy: Record<Exclude<RoomAccess, { allowed: true }>['reason'], string> = {
    not_authenticated: 'Entre com sua conta para abrir uma mesa.',
    not_configured: 'Esta instalação não possui autenticação configurada.',
    not_member: 'Sua conta não possui convite ou vínculo para esta mesa.',
    suspended: 'Esta conta está suspensa. Fale com a administração.',
    unavailable: 'Não foi possível confirmar sua permissão agora. Tente novamente.',
  };
  const isUnavailable = access.reason === 'unavailable';
  return <>
    <GateScreen title={isUnavailable ? 'Servidor temporariamente indisponível' : 'Acesso restrito'} detail={copy[access.reason]} action={access.reason === 'not_authenticated' ? () => setAuthModalOpen(true) : isUnavailable ? () => setRetryKey(key => key + 1) : undefined} actionLabel={isUnavailable ? 'Tentar novamente' : 'Entrar'} />
    {/* O login precisa existir fora da área protegida para links diretos /vtt.html. */}
    {access.reason === 'not_authenticated' && <AuthModal />}
  </>;
}

function GateScreen({ title, detail, action, actionLabel = 'Entrar' }: { title: string; detail?: string; action?: () => void; actionLabel?: string }) {
  if (!action && !detail) return <main style={{ minHeight: '100vh', background: '#0d0b09' }}><LoadingState label={title} /></main>;
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at top, #282015, #0d0b09 65%)', color: '#ead9b7' }}>
    <section style={{ width: 'min(440px, 100%)', border: '1px solid #6c5228', borderRadius: 14, padding: 28, background: 'rgba(20,16,12,.94)', boxShadow: '0 22px 60px #0008' }}>
      <p style={{ margin: '0 0 8px', color: '#d9a441', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }}>DOZERO · Mesa privada</p>
      <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
      {detail && <p style={{ color: '#b9ae9c', lineHeight: 1.5 }}>{detail}</p>}
      {action && <button type="button" onClick={action} style={{ marginTop: 10, padding: '10px 15px', border: 0, borderRadius: 8, background: '#b98531', color: '#17110a', fontWeight: 700, cursor: 'pointer' }}>{actionLabel}</button>}
    </section>
  </main>;
}
