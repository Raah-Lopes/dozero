import { useCallback, useEffect, useState } from "react";

const bytes = (value: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    4,
    Math.max(0, Math.floor(Math.log(Math.max(1, value)) / Math.log(1024))),
  );
  return (
    (value / 1024 ** index).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    }) +
    " " +
    units[index]
  );
};
export default function StoragePanel({ status }: { status: string }) {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const [space, retained] = await Promise.allSettled([
        navigator.storage?.estimate?.() ?? Promise.reject(new Error()),
        navigator.storage?.persisted?.() ?? Promise.reject(new Error()),
      ]);
      setEstimate(space.status === "fulfilled" ? space.value : null);
      setPersistent(retained.status === "fulfilled" ? retained.value : null);
      if (space.status === "rejected")
        setMessage(
          "O navegador não informou o espaço disponível. Você pode continuar usando o aplicativo e baixar backups normalmente.",
        );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (status !== "Salvo neste navegador") return;
    const timer = setTimeout(() => void refresh(), 400);
    return () => clearTimeout(timer);
  }, [status, refresh]);
  const requestPersistence = async () => {
    setBusy(true);
    try {
      const granted = await navigator.storage?.persist?.();
      setPersistent(granted ?? null);
      setMessage(
        granted
          ? "Proteção concedida pelo navegador. Continue guardando backups em arquivo."
          : "O navegador não concedeu a proteção nesta tentativa. Seus projetos continuam salvos; mantenha um backup em arquivo.",
      );
    } catch {
      setMessage(
        "Não foi possível solicitar a proteção. Seus projetos continuam disponíveis.",
      );
    } finally {
      setBusy(false);
    }
  };
  const used = estimate?.usage,
    quota = estimate?.quota;
  const known =
    typeof used === "number" &&
    Number.isFinite(used) &&
    typeof quota === "number" &&
    Number.isFinite(quota) &&
    quota > 0;
  const ratio = known ? Math.min(100, (used / quota) * 100) : 0;
  return (
    <details
      className="mx-4 mb-3 border border-stone-700 rounded bg-stone-900/50"
      aria-label="Armazenamento local"
    >
      <summary className="p-3 cursor-pointer text-sm">
        Armazenamento local ·{" "}
        {known ? bytes(used) + " usados" : "consultar espaço e recuperação"}
      </summary>
      <div className="px-4 pb-4 text-sm space-y-3">
        {known ? (
          <>
            <p>
              Usado neste endereço: <strong>{bytes(used)}</strong> · Limite
              estimado: <strong>{bytes(quota)}</strong> · Disponível estimado:{" "}
              <strong>{bytes(Math.max(0, quota - used))}</strong>.
            </p>
            <progress
              aria-label="Espaço utilizado"
              className="w-full h-2 accent-amber-500"
              max={100}
              value={ratio}
            />
            {ratio >= 85 && (
              <p className="text-amber-200">
                O armazenamento está próximo do limite. Baixe um backup antes de
                importar mais mapas.
              </p>
            )}
          </>
        ) : (
          <p>Estimativa de espaço indisponível.</p>
        )}
        <p className="text-stone-400">
          Esses valores são estimativas do navegador para este endereço,
          incluindo o ponto de recuperação. O espaço efetivo também depende do
          dispositivo.
        </p>
        <p>
          Proteção contra limpeza automática:{" "}
          <strong>
            {persistent === true
              ? "concedida"
              : persistent === false
                ? "não concedida"
                : "não informada"}
          </strong>
          .
        </p>
        <p className="text-stone-400">
          A cada gravação concluída, o estado anterior fica disponível como
          ponto de recuperação. Ele é local e pode ocupar espaço adicional. O
          backup JSON continua sendo a cópia que você pode levar para outro
          navegador ou computador.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="dz-button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Verificar espaço
          </button>
          {persistent !== true && (
            <button
              className="dz-button"
              disabled={busy || !navigator.storage?.persist}
              onClick={() => void requestPersistence()}
            >
              Solicitar proteção dos dados
            </button>
          )}
        </div>
        {message && <p role="status">{message}</p>}
      </div>
    </details>
  );
}
