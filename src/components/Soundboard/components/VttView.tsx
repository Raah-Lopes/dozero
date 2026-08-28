import { useState } from "react";
import type { Trigger, VttEvent } from "../types";
import { EVENT_LABELS, useApp } from "../store";
import { Icon } from "../data/icons";

const EVENTS = Object.keys(EVENT_LABELS) as VttEvent[];

function StatusDot({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-flex h-2 w-2 rounded-full ${on ? "bg-moss-400" : "bg-fog-dim/50"}`}>
      {on && <span className="ripple-dot absolute inset-0 text-moss-400" />}
    </span>
  );
}

export function VttView() {
  const app = useApp();
  const { data } = app;
  const vtt = data.vtt;
  const [connecting, setConnecting] = useState<string | null>(null);

  const simulateConnect = (which: "foundry" | "roll20") => {
    setConnecting(which);
    window.setTimeout(() => {
      setConnecting(null);
      if (which === "foundry") {
        app.setVtt({ foundryConnected: !vtt.foundryConnected });
        app.toast(vtt.foundryConnected ? "Desconectado do Foundry VTT" : "Foundry VTT conectado (handshake simulado)", vtt.foundryConnected ? "warn" : "ok");
      } else {
        app.setVtt({ roll20Connected: !vtt.roll20Connected });
        app.toast(vtt.roll20Connected ? "Desconectado do Roll20" : "Roll20 vinculado via API (simulado)", vtt.roll20Connected ? "warn" : "ok");
      }
    }, 900);
  };

  const addTrigger = () => {
    const t: Trigger = {
      id: "trg" + Date.now(),
      event: EVENTS[data.vtt.triggers.length % EVENTS.length],
      sceneId: data.scenes[0]?.id ?? "",
      enabled: true,
    };
    app.saveTrigger(t);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="fade-up flex flex-wrap items-end justify-between gap-4 border-b border-line-soft pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center border border-gold-400/50 bg-gold-400/10 text-gold-400 chamfer">
            <Icon name="zap" size={28} sw={1.5} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-dim">foundry · roll20 · mesa própria</p>
            <h1 className="font-display text-2xl font-bold tracking-wide text-parch md:text-3xl">Integração VTT</h1>
          </div>
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto pb-8 pr-1">
        {/* plataformas */}
        <div className="grid gap-3 md:grid-cols-3">
          {/* Foundry */}
          <div className="reveal border border-line bg-ink-800/90 p-4 chamfer">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold tracking-wide text-parch">Foundry VTT</h3>
              <StatusDot on={vtt.foundryConnected} />
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-fog-dim">módulo nativo · websocket</p>
            <input
              value={vtt.foundryUrl}
              onChange={(e) => app.setVtt({ foundryUrl: e.target.value })}
              className="mt-3 w-full border border-line bg-ink-900 px-2.5 py-2 font-mono text-[11px] text-parch outline-none focus:border-gold-400/50 chamfer-sm"
              placeholder="ws://localhost:30000"
            />
            <button
              onClick={() => simulateConnect("foundry")}
              disabled={connecting !== null}
              className={`mt-2.5 w-full border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 chamfer-sm ${
                vtt.foundryConnected
                  ? "border-blood-400/50 text-blood-400 hover:bg-blood-500/15"
                  : "border-moss-500/50 bg-moss-500/10 text-moss-300 hover:bg-moss-500/25"
              }`}
            >
              {connecting === "foundry" ? "negociando…" : vtt.foundryConnected ? "Desconectar" : "Conectar"}
            </button>
          </div>

          {/* Roll20 */}
          <div className="reveal border border-line bg-ink-800/90 p-4 chamfer" style={{ animationDelay: "70ms" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold tracking-wide text-parch">Roll20</h3>
              <StatusDot on={vtt.roll20Connected} />
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-fog-dim">via API · companion script</p>
            <input
              type="password"
              value={vtt.roll20Key}
              onChange={(e) => app.setVtt({ roll20Key: e.target.value })}
              className="mt-3 w-full border border-line bg-ink-900 px-2.5 py-2 font-mono text-[11px] text-parch outline-none focus:border-gold-400/50 chamfer-sm"
              placeholder="API key da campanha"
            />
            <button
              onClick={() => simulateConnect("roll20")}
              disabled={connecting !== null || vtt.roll20Key.trim().length === 0}
              className={`mt-2.5 w-full border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 chamfer-sm ${
                vtt.roll20Connected
                  ? "border-blood-400/50 text-blood-400 hover:bg-blood-500/15"
                  : "border-moss-500/50 bg-moss-500/10 text-moss-300 hover:bg-moss-500/25"
              }`}
            >
              {connecting === "roll20" ? "autenticando…" : vtt.roll20Connected ? "Desvincular" : "Vincular API"}
            </button>
          </div>

          {/* Sync jogadores */}
          <div className="reveal border border-line bg-ink-800/90 p-4 chamfer" style={{ animationDelay: "140ms" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold tracking-wide text-parch">Sync de Jogadores</h3>
              <button
                onClick={() => {
                  app.setVtt({ playerSync: !vtt.playerSync });
                  app.toast(vtt.playerSync ? "Streaming desativado" : "Streaming do master ativo para a mesa", vtt.playerSync ? "warn" : "ok");
                }}
                className={`relative h-5 w-10 border transition-colors chamfer-sm ${vtt.playerSync ? "border-moss-500/60 bg-moss-500/25" : "border-line bg-ink-900"}`}
                aria-pressed={vtt.playerSync}
              >
                <span
                  className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 transition-all ${
                    vtt.playerSync ? "left-[22px] bg-moss-400 shadow-[0_0_8px_#2fd48c]" : "left-[5px] bg-fog-dim"
                  }`}
                />
              </button>
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-fog-dim">streaming do master</p>
            {vtt.playerSync ? (
              <div className="mt-3">
                <div className="shimmer h-1.5 w-full bg-ink-900" />
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {[
                    ["Kaelen, o Bardo", "23 ms"],
                    ["Morgana", "31 ms"],
                    ["Thordak", "19 ms"],
                  ].map(([nome, lat]) => (
                    <div key={nome} className="flex items-center gap-2 font-mono text-[10.5px] text-fog">
                      <Icon name="headphones" size={12} className="text-moss-400" />
                      <span className="flex-1 text-parch">{nome}</span>
                      <span className="text-moss-400">{lat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[11.5px] leading-relaxed text-fog-dim">
                Transmita o mix do mestre em tempo real — os jogadores ouvem a mesma atmosfera, sincronizada.
              </p>
            )}
          </div>
        </div>

        {/* triggers */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-wide text-parch">
              <span className="text-gold-400"><Icon name="zap" size={17} /></span>
              Triggers de Evento
            </h2>
            <p className="mt-0.5 text-xs text-fog-dim">Eventos da mesa disparam cenas automaticamente.</p>
          </div>
          <button
            onClick={addTrigger}
            className="flex items-center gap-1.5 border border-moss-600/50 bg-moss-500/10 px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-moss-300 transition-colors hover:bg-moss-500/20 chamfer-sm"
          >
            <Icon name="plus" size={13} /> Novo trigger
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {vtt.triggers.length === 0 && (
            <p className="border border-dashed border-line p-4 text-center text-xs text-fog-dim chamfer-sm">
              Nenhum trigger — crie um para automatizar a atmosfera.
            </p>
          )}
          {vtt.triggers.map((t) => {
            const scene = data.scenes.find((s) => s.id === t.sceneId);
            return (
              <div
                key={t.id}
                className={`flex flex-wrap items-center gap-2.5 border bg-ink-800/90 p-2.5 transition-opacity chamfer-sm ${
                  t.enabled ? "border-line" : "border-line-soft opacity-60"
                }`}
              >
                <button
                  onClick={() => app.saveTrigger({ ...t, enabled: !t.enabled })}
                  className={`relative h-5 w-10 shrink-0 border transition-colors chamfer-sm ${t.enabled ? "border-gold-400/60 bg-gold-400/20" : "border-line bg-ink-900"}`}
                  aria-pressed={t.enabled}
                >
                  <span
                    className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 transition-all ${
                      t.enabled ? "left-[22px] bg-gold-400 shadow-[0_0_8px_#e6c15c]" : "left-[5px] bg-fog-dim"
                    }`}
                  />
                </button>

                <span className="font-mono text-[10px] uppercase tracking-wider text-gold-300">quando</span>
                <select
                  value={t.event}
                  onChange={(e) => app.saveTrigger({ ...t, event: e.target.value as VttEvent })}
                  className="border border-line bg-ink-900 px-2 py-1.5 font-mono text-[11px] text-parch outline-none focus:border-gold-400/50 chamfer-sm"
                >
                  {EVENTS.map((ev) => (
                    <option key={ev} value={ev}>{EVENT_LABELS[ev]}</option>
                  ))}
                </select>

                <span className="font-mono text-[10px] uppercase tracking-wider text-arc-300">tocar</span>
                <select
                  value={t.sceneId}
                  onChange={(e) => app.saveTrigger({ ...t, sceneId: e.target.value })}
                  className="min-w-[140px] flex-1 border border-line bg-ink-900 px-2 py-1.5 font-mono text-[11px] text-parch outline-none focus:border-arc-400/50 chamfer-sm"
                >
                  {data.scenes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => app.fireTrigger(t.event)}
                  disabled={!t.enabled || !scene}
                  className="flex items-center gap-1.5 border border-gold-400/50 bg-gold-400/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gold-300 transition-all enabled:hover:bg-gold-400/25 enabled:active:scale-95 disabled:opacity-40 chamfer-sm"
                  title="Simula o evento vindo da mesa"
                >
                  <Icon name="play" size={11} /> Simular
                </button>
                <button
                  onClick={() => app.deleteTrigger(t.id)}
                  className="p-1.5 text-fog-dim transition-colors hover:text-blood-400"
                  aria-label="Excluir trigger"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* nota de arquitetura */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="border border-line-soft bg-ink-850/70 p-4 chamfer">
            <p className="mb-2 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fog-dim">
              <Icon name="gear" size={12} className="text-moss-400" /> Como o módulo opera
            </p>
            <p className="text-xs leading-relaxed text-fog">
              O <strong className="text-parch">Player Engine</strong> sintetiza tudo via Web Audio API — nenhum arquivo
              precisa ser hospedado. Eventos do VTT chegam por WebSocket, passam pelo{" "}
              <strong className="text-parch">Trigger Router</strong> e acionam cenas no Mixer com crossfade automático.
            </p>
          </div>
          <div className="border border-line-soft bg-ink-850/70 p-4 chamfer">
            <p className="mb-2 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fog-dim">
              <Icon name="users" size={12} className="text-arc-400" /> Compatibilidade
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Foundry VTT v12+", "Roll20 API", "Mesa própria (WebSocket)", "Obsidian TTRPG", "Export .json universal"].map((c) => (
                <span key={c} className="border border-line bg-ink-900 px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-fog chamfer-sm">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
