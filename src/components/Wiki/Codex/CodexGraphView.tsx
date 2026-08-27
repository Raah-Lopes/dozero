import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CodexNote, CodexRelation, CodexType } from './codexModel';
import { Icone, SeloTipo } from './CodexIcons';

interface No {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function CodexGraphView({
  notes,
  types,
  relations,
  onOpenNote,
}: {
  notes: CodexNote[];
  types: CodexType[];
  relations: CodexRelation[];
  onOpenNote: (note: CodexNote) => void;
}) {
  const ids = useMemo(() => new Set(notes.map((n) => n.id)), [notes]);
  const activeRelations = useMemo(
    () => relations.filter((r) => ids.has(r.sourceId) && ids.has(r.targetId)),
    [relations, ids]
  );

  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [, setPassada] = useState(0);
  const nosRef = useRef<Map<string, No>>(new Map());
  const arrastando = useRef<string | null>(null);
  const moveu = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 900, h: 600 });

  const typeMap = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const getType = (typeId: string) =>
    typeMap.get(typeId) || { id: typeId, name: typeId, color: '#d9a441', icon: 'faiscas', fields: [] };

  const grau = (noteId: string) =>
    relations.filter((r) => r.sourceId === noteId || r.targetId === noteId).length;

  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // posições iniciais em espiral
  useEffect(() => {
    const mapa = nosRef.current;
    notes.forEach((n, i) => {
      if (!mapa.has(n.id)) {
        const ang = i * 2.4;
        const raio = 60 + i * 26;
        mapa.set(n.id, {
          id: n.id,
          x: tam.w / 2 + Math.cos(ang) * raio * 0.9,
          y: tam.h / 2 + Math.sin(ang) * raio * 0.62,
          vx: 0,
          vy: 0,
        });
      }
    });
    for (const k of [...mapa.keys()]) if (!ids.has(k)) mapa.delete(k);
  }, [ids, notes, tam.w, tam.h]);

  // simulação de forças
  useEffect(() => {
    if (notes.length === 0) return;
    let raf = 0;
    const passo = () => {
      const mapa = nosRef.current;
      const nos = notes.map((n) => mapa.get(n.id)!).filter(Boolean);
      const cx = tam.w / 2;
      const cy = tam.h / 2;

      // repulsão
      for (let i = 0; i < nos.length; i++) {
        for (let j = i + 1; j < nos.length; j++) {
          const a = nos[i];
          const b = nos[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d2 = 1;
          }
          const d = Math.sqrt(d2);
          const f = Math.min(14, 11000 / d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // arestas / molas
      for (const r of activeRelations) {
        const a = mapa.get(r.sourceId);
        const b = mapa.get(r.targetId);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 165) * 0.028;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // gravidade central
      for (const n of nos) {
        if (arrastando.current === n.id) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx += (cx - n.x) * 0.012;
        n.vy += (cy - n.y) * 0.012;
        n.vx *= 0.8;
        n.vy *= 0.8;
        n.x = Math.min(tam.w - 40, Math.max(40, n.x + n.vx));
        n.y = Math.min(tam.h - 46, Math.max(40, n.y + n.vy));
      }

      setPassada((p) => (p + 1) % 100000);
      raf = requestAnimationFrame(passo);
    };

    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [notes, activeRelations, tam.w, tam.h]);

  const aoMover = (e: React.PointerEvent) => {
    if (!arrastando.current) return;
    const no = nosRef.current.get(arrastando.current);
    const rect = svgRef.current!.getBoundingClientRect();
    if (no) {
      no.x = e.clientX - rect.left;
      no.y = e.clientY - rect.top;
      moveu.current = true;
    }
  };

  const raioDe = (id: string) => 13 + Math.min(9, grau(id) * 1.7);

  const tiposPresentes = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.typeId, (m.get(n.typeId) ?? 0) + 1);
    return [...m.entries()].map(([id, count]) => ({ tipo: getType(id), count }));
  }, [notes, typeMap]);

  const sel = selecionada ? notes.find((n) => n.id === selecionada) : null;

  if (notes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-papel3">
        <p>Nenhuma nota disponível para tecer no grafo.</p>
      </div>
    );
  }

  return (
    <div ref={caixaRef} className="relative h-full w-full overflow-hidden rounded-lg border border-linha bg-tinta2">
      {/* brilho ambiente */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(217,164,65,0.06), transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(224,123,79,0.05), transparent 55%)',
        }}
      />
      <svg
        ref={svgRef}
        width={tam.w}
        height={tam.h}
        className="relative block cursor-grab active:cursor-grabbing"
        onPointerMove={aoMover}
        onPointerUp={() => (arrastando.current = null)}
        onPointerLeave={() => (arrastando.current = null)}
        onClick={() => setSelecionada(null)}
      >
        {/* arestas */}
        {activeRelations.map((r) => {
          const a = nosRef.current.get(r.sourceId);
          const b = nosRef.current.get(r.targetId);
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const ra = raioDe(r.sourceId) + 2;
          const rb = raioDe(r.targetId) + 2;
          const x1 = a.x + (dx / d) * ra;
          const y1 = a.y + (dy / d) * ra;
          const x2 = b.x - (dx / d) * rb;
          const y2 = b.y - (dy / d) * rb;
          const ligada = selecionada !== null && (r.sourceId === selecionada || r.targetId === selecionada);
          const opacidade = selecionada === null ? 0.55 : ligada ? 0.95 : 0.12;

          const ang = Math.atan2(y2 - y1, x2 - x1);
          const seta = `M ${x2} ${y2} L ${x2 - 9 * Math.cos(ang - 0.42)} ${
            y2 - 9 * Math.sin(ang - 0.42)
          } L ${x2 - 9 * Math.cos(ang + 0.42)} ${y2 - 9 * Math.sin(ang + 0.42)} Z`;

          return (
            <g key={r.id} opacity={opacidade} style={{ transition: 'opacity 0.25s' }}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={r.color || '#d9a441'} strokeWidth={ligada ? 2.4 : 1.6} />
              {!r.bidirectional && <path d={seta} fill={r.color || '#d9a441'} />}
              {d > 110 && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#c9bda2"
                  stroke="#15120e"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {r.label}
                </text>
              )}
            </g>
          );
        })}

        {/* nós */}
        {notes.map((n) => {
          const no = nosRef.current.get(n.id);
          if (!no) return null;
          const tipo = getType(n.typeId);
          const r = raioDe(n.id);
          const selecionadaEsta = selecionada === n.id;
          const esmaecida =
            selecionada !== null &&
            !selecionadaEsta &&
            !relations.some(
              (x) =>
                (x.sourceId === selecionada && x.targetId === n.id) ||
                (x.targetId === selecionada && x.sourceId === n.id)
            );
          const iniciais = n.name
            .replace(/[^a-zA-ZÀ-ú0-9 ]/g, '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join('');

          return (
            <g
              key={n.id}
              transform={`translate(${no.x},${no.y})`}
              opacity={esmaecida ? 0.22 : 1}
              style={{ transition: 'opacity 0.25s', cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                arrastando.current = n.id;
                moveu.current = false;
                svgRef.current?.setPointerCapture(e.pointerId);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!moveu.current) setSelecionada(n.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onOpenNote(n);
              }}
            >
              {selecionadaEsta && (
                <circle
                  r={r + 7}
                  fill="none"
                  stroke="#d9a441"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="animar-girar"
                  style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                />
              )}
              <circle r={r + 3} fill={`${tipo.color}22`} />
              <circle r={r} fill={tipo.color} stroke="#15120e" strokeWidth="2.5" />
              <text
                textAnchor="middle"
                dy="0.36em"
                fontSize={r * 0.72}
                fontWeight="800"
                fill="#1c1509"
                style={{ pointerEvents: 'none', fontFamily: "var(--font-corpo, 'Alegreya Sans', sans-serif)" }}
              >
                {iniciais}
              </text>
              <text
                textAnchor="middle"
                y={r + 16}
                fontSize="11"
                fontWeight="600"
                fill="#ddd2b8"
                stroke="#15120e"
                strokeWidth="3.5"
                paintOrder="stroke"
                style={{ pointerEvents: 'none' }}
              >
                {n.name.length > 24 ? `${n.name.slice(0, 23)}…` : n.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* legenda */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[70%] flex-wrap gap-x-4 gap-y-1 rounded-md border border-linha bg-tinta/85 px-3 py-2 backdrop-blur">
        {tiposPresentes.map(({ tipo, count }) => (
          <span key={tipo.id} className="flex items-center gap-1.5 text-[11px] text-papel2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: tipo.color }} />
            {tipo.plural || tipo.name} <span className="text-papel3">{count}</span>
          </span>
        ))}
      </div>

      <p className="pointer-events-none absolute right-3 top-3 rounded-md border border-linha bg-tinta/85 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-papel3 backdrop-blur">
        arraste os nós · clique para inspecionar · duplo clique abre a página
      </p>

      {/* painel do nó selecionado */}
      {sel && (
        <div className="animar-modal absolute left-3 top-3 w-72 rounded-lg border border-linha2 bg-tinta/95 p-4 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <SeloTipo
              nome={getType(sel.typeId).name}
              cor={getType(sel.typeId).color}
              icone={getType(sel.typeId).icon}
              pequeno
            />
            <button onClick={() => setSelecionada(null)} className="text-papel3 transition hover:text-papel">
              <Icone nome="x" tam={15} />
            </button>
          </div>
          <h3 className="font-display mt-2.5 text-lg font-bold leading-tight text-papel">{sel.name}</h3>
          {sel.description && (
            <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-papel2">
              {sel.description.length > 130 ? `${sel.description.slice(0, 130).trimEnd()}…` : sel.description}
            </p>
          )}
          <div className="mt-3 space-y-1.5 border-t border-linha pt-2.5">
            {relations
              .filter((r) => r.sourceId === sel.id || r.targetId === sel.id)
              .slice(0, 6)
              .map((r) => {
                const outroId = r.sourceId === sel.id ? r.targetId : r.sourceId;
                const outra = notes.find((n) => n.id === outroId);
                if (!outra) return null;
                const saida = r.sourceId === sel.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelecionada(outra.id)}
                    className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[12px] text-papel2 transition hover:bg-tinta3 hover:text-papel"
                  >
                    <span style={{ color: r.color || '#d9a441' }}>
                      <Icone nome={saida ? 'setaDir' : 'setaEsq'} tam={12} />
                    </span>
                    <span className="shrink-0 font-semibold" style={{ color: r.color || '#d9a441' }}>
                      {r.label}
                    </span>
                    <span className="truncate text-papel3">→ {outra.name}</span>
                  </button>
                );
              })}
            {relations.filter((r) => r.sourceId === sel.id || r.targetId === sel.id).length === 0 && (
              <p className="text-[11px] italic text-papel3">Sem relações tecidas.</p>
            )}
          </div>
          <button
            onClick={() => onOpenNote(sel)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-ambar px-3 py-2 text-xs font-bold text-[#241a06] transition hover:bg-[#e8b654] active:scale-[0.98]"
          >
            <Icone nome="livro" tam={14} /> Abrir página completa
          </button>
        </div>
      )}
    </div>
  );
}
