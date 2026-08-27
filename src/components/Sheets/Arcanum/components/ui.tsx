import React, { useEffect, useRef, useState } from "react";

/* ---------------- scroll reveal ---------------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------------- cabeçalho de seção ---------------- */

export function Section({
  icon,
  title,
  kicker,
  accent = "#e0b054",
  actions,
  children,
  id,
}: {
  icon: React.ReactNode;
  title: string;
  kicker: string;
  accent?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Reveal>
      <section id={id} className="panel ornate-corners overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-line-soft bg-ink-800/60 px-5 py-3.5 sm:px-6">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border"
            style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14` }}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-body text-[11px] font-bold uppercase tracking-[0.22em] text-dim">
              {kicker}
            </p>
            <h2 className="font-display text-lg font-bold leading-tight text-parch-100 sm:text-xl">
              {title}
            </h2>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </Reveal>
  );
}

/* ---------------- inputs ---------------- */

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-fog/80">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ---------------- stepper numérico ---------------- */

export function Stepper({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const clamp = (v: number) =>
    Math.max(min ?? -9999, Math.min(max ?? 999999, v));
  return (
    <div className="inline-flex items-center rounded-md border border-line-soft bg-ink-900/70">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(clamp(value - step))}
        className="px-2 py-1 text-fog transition-colors hover:bg-ink-700 hover:text-gold-300 active:scale-90"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
        className="w-12 border-x border-line-soft bg-transparent py-1 text-center font-body text-sm font-bold text-parch-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(clamp(value + step))}
        className="px-2 py-1 text-fog transition-colors hover:bg-ink-700 hover:text-gold-300 active:scale-90"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}

/* ---------------- barra vital ---------------- */

export function VitalBar({
  label,
  value,
  max,
  color,
  onValue,
  onMax,
  compact = false,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  onValue: (v: number) => void;
  onMax: (v: number) => void;
  compact?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const low = pct <= 25;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-parch-300">
          <span className={`h-1.5 w-1.5 rounded-full ${low ? "low-pulse" : ""}`} style={{ background: color }} />
          {label}
        </span>
        <span className="flex items-center gap-1 text-sm font-bold text-parch-100">
          <input
            type="number"
            value={value}
            onChange={(e) => onValue(Math.max(0, Number(e.target.value) || 0))}
            className="num-input !w-14"
            aria-label={`${label} atual`}
          />
          <span className="text-dim">/</span>
          <input
            type="number"
            value={max}
            onChange={(e) => onMax(Math.max(1, Number(e.target.value) || 1))}
            className="num-input !w-14"
            aria-label={`${label} máximo`}
          />
        </span>
      </div>
      <div
        className={`relative h-3 overflow-hidden rounded-full border border-line-soft bg-ink-950 ${low ? "low-pulse rounded-full" : ""}`}
      >
        <div
          className="bar-shine relative h-full overflow-hidden rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(180deg, ${color}e6, ${color}b3 55%, ${color}99)`,
            boxShadow: `0 0 12px ${color}66`,
          }}
        />
      </div>
      {compact && <span className="sr-only">{Math.round(pct)}%</span>}
    </div>
  );
}

/* ---------------- toasts ---------------- */

export interface ToastMsg {
  id: number;
  text: string;
  tone: "gold" | "ember" | "jade";
}

export function Toasts({ toasts }: { toasts: ToastMsg[] }) {
  const tones = {
    gold: "border-gold-500/50 text-gold-200",
    ember: "border-ember-400/50 text-ember-300",
    jade: "border-jade-400/50 text-jade-300",
  };
  return (
    <div className="no-print pointer-events-none fixed bottom-5 left-5 z-[70] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in rounded-md border bg-ink-900/95 px-4 py-2.5 text-sm font-bold shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm ${tones[t.tone]}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------------- brasas ambientes ---------------- */

export function Embers() {
  const embers = React.useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 61) % 100}%`,
        size: 2 + ((i * 7) % 4),
        dur: 14 + ((i * 5) % 16),
        delay: -((i * 3.7) % 20),
        drift: ((i % 2 === 0 ? 1 : -1) * (20 + ((i * 13) % 60))).toFixed(0),
        op: 0.25 + ((i * 11) % 50) / 100,
      })),
    []
  );
  return (
    <div aria-hidden className="no-print">
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              animationDuration: `${e.dur}s`,
              animationDelay: `${e.delay}s`,
              "--ember-drift": `${e.drift}px`,
              "--ember-op": e.op,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
