const TRANSIENT_FAILURE_COOLDOWN_MS = 30_000;
const CLOUD_COOLDOWN_STORAGE_KEY = 'dozero_cloud_cooldown_until';
let unavailableUntil = 0;

function readPersistedCooldown(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const value = Number(window.sessionStorage.getItem(CLOUD_COOLDOWN_STORAGE_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function persistCooldown(until: number): void {
  if (typeof window === 'undefined') return;

  try {
    if (until > Date.now()) {
      window.sessionStorage.setItem(CLOUD_COOLDOWN_STORAGE_KEY, String(until));
    } else {
      window.sessionStorage.removeItem(CLOUD_COOLDOWN_STORAGE_KEY);
    }
  } catch {
    // O freio em memória continua funcionando quando o armazenamento falha.
  }
}

/**
 * Shared circuit breaker for transient Supabase outages. Local-first flows use
 * this to avoid each workspace independently retrying a closed connection.
 */
export function isCloudCoolingDown(): boolean {
  unavailableUntil = Math.max(unavailableUntil, readPersistedCooldown());
  return Date.now() < unavailableUntil;
}

export function noteCloudSuccess(): void {
  unavailableUntil = 0;
  persistCooldown(0);
}

export function noteCloudFailure(error?: unknown): void {
  const message = error instanceof Error ? error.message : String(error || '');
  if (!message || /network|fetch|connection|timeout|closed|reset|http2/i.test(message)) {
    unavailableUntil = Date.now() + TRANSIENT_FAILURE_COOLDOWN_MS;
    // Mantém a pausa após Ctrl+F5. Sem isso, cada recarga volta a disparar a
    // mesma consulta de perfil mesmo quando o servidor acabou de fechar a conexão.
    persistCooldown(unavailableUntil);
  }
}
