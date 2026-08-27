import React, { useEffect, useMemo, useState } from 'react';
import { CodexFolder, CodexNote, CodexRelation, CodexType } from './codexModel';
import { Icone, SeloTipo } from './CodexIcons';
import { PontoCor } from './CodexUI';

function formatarDataCurta(isoString: string) {
  try {
    const d = new Date(isoString);
    const dia = d.getDate();
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mes = meses[d.getMonth()] || '';
    return `${dia} DE ${mes}.`;
  } catch {
    return '';
  }
}

export function CodexStatsView({
  notes,
  types,
  folders,
  relations,
  onOpenNote,
}: {
  notes: CodexNote[];
  types: CodexType[];
  folders: CodexFolder[];
  relations: CodexRelation[];
  onOpenNote: (note: CodexNote) => void;
}) {
  const [monta, setMonta] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMonta(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const typeMap = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const getType = (typeId: string) =>
    typeMap.get(typeId) || { id: typeId, name: typeId, color: '#d9a441', icon: 'faiscas', fields: [] };

  const contTipo = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.typeId, (m.get(n.typeId) ?? 0) + 1);
    return m;
  }, [notes]);

  const porTipo = useMemo(
    () =>
      types
        .map((t) => ({ tipo: t, n: contTipo.get(t.id) ?? 0 }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n),
    [types, contTipo]
  );
  const maxTipo = Math.max(1, ...porTipo.map((x) => x.n));

  const porRelacao = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of relations) {
      const label = r.label || 'Relacionado a';
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [relations]);

  const grau = (noteId: string) =>
    relations.filter((r) => r.sourceId === noteId || r.targetId === noteId).length;

  const conectadas = useMemo(
    () =>
      notes
        .map((nota) => ({ nota, grau: grau(nota.id) }))
        .filter((x) => x.grau > 0)
        .sort((a, b) => b.grau - a.grau)
        .slice(0, 6),
    [notes, relations]
  );

  const recentes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [notes]
  );

  const etiquetas = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()]
      .map(([etiqueta, n]) => ({ etiqueta, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 24);
  }, [notes]);
  const maxEt = Math.max(1, ...etiquetas.map((e) => e.n));

  const destaque = conectadas[0];
  const totalCampos = useMemo(
    () =>
      notes.reduce(
        (s, n) =>
          s +
          Object.values(n.fields).filter((v) => (Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined && v !== null)).length,
        0
      ),
    [notes]
  );

  const numerais = [
    { rotulo: 'notas', n: notes.length, icone: 'livro' },
    { rotulo: 'relações', n: relations.length, icone: 'grafo' },
    { rotulo: 'tipos', n: types.length, icone: 'faiscas' },
    { rotulo: 'pastas', n: folders.length, icone: 'pasta' },
    { rotulo: 'campos preenchidos', n: totalCampos, icone: 'check' },
  ];

  return (
    <div className="animar-aparecer space-y-6 pb-8">
      {/* painel de números de cabeçalho */}
      <section className="borda-ornada grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#3b3222] bg-[#3b3222] sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 row-span-1 flex flex-col justify-between bg-gradient-to-br from-[#272117] to-[#1d1913] p-5 sm:col-span-1 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7f7660]">favoritas</p>
          <p className="font-display text-4xl font-extrabold text-[#d9a441]">
            {notes.filter((n) => n.favorite).length}
          </p>
          <Icone nome="estrela" tam={20} className="text-[#d9a441]/60" preenchido />
        </div>
        {numerais.map((x) => (
          <div key={x.rotulo} className="flex flex-col justify-between bg-[#1d1913] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7f7660]">{x.rotulo}</p>
            <p className="font-display text-4xl font-extrabold text-[#ede4d0]">{x.n}</p>
            <Icone nome={x.icone} tam={20} className="text-[#7f7660]" />
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* coluna principal (esquerda) */}
        <div className="space-y-6 lg:col-span-3">
          {/* Distribuição de Notas por Tipo */}
          <section className="rounded-xl border border-[#3b3222] bg-[#1d1913] p-6 shadow-lg shadow-black/40">
            <h3 className="font-display mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#ede4d0]">
              <Icone nome="faiscas" tam={16} className="text-[#d9a441]" /> Distribuição por tipo
            </h3>
            <div className="space-y-3">
              {porTipo.map(({ tipo, n }) => (
                <div key={tipo.id} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-[13px] font-medium text-[#b3a78c]">
                    {tipo.plural || tipo.name}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#15120e]">
                    <div
                      className="flex h-full items-center rounded-full pl-2 transition-all duration-700 ease-out"
                      style={{
                        width: monta ? `${Math.max(8, (n / maxTipo) * 100)}%` : '0%',
                        background: `linear-gradient(90deg, ${tipo.color}, ${tipo.color}cc)`,
                        boxShadow: `0 0 14px ${tipo.color}44`,
                      }}
                    >
                      <span className="text-[10px] font-black text-[#15120e]">{n}</span>
                    </div>
                  </div>
                </div>
              ))}
              {porTipo.length === 0 && <p className="text-xs italic text-[#7f7660]">Nenhuma nota criada.</p>}
            </div>
          </section>

          {/* Relações Mais Tecidas */}
          <section className="rounded-xl border border-[#3b3222] bg-[#1d1913] p-6 shadow-lg shadow-black/40">
            <h3 className="font-display mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#ede4d0]">
              <Icone nome="grafo" tam={16} className="text-[#d9a441]" /> Relações mais tecidas
            </h3>
            {porRelacao.length === 0 ? (
              <p className="text-sm italic text-[#7f7660]">Nenhuma relação registrada ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {porRelacao.map(([tipoLabel, n]) => (
                  <span
                    key={tipoLabel}
                    className="flex items-center gap-2 rounded-lg border border-[#3b3222] bg-[#272117] px-3.5 py-2 text-[12.5px] font-medium text-[#ede4d0]"
                  >
                    <Icone nome="link" tam={13} className="text-[#d9a441]/80" />
                    {tipoLabel}
                    <span className="rounded bg-[#15120e] px-1.5 py-0.5 text-xs font-black text-[#d9a441]">
                      {n}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Constelação de Etiquetas */}
          <section className="rounded-xl border border-[#3b3222] bg-[#1d1913] p-6 shadow-lg shadow-black/40">
            <h3 className="font-display mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#ede4d0]">
              <Icone nome="etiqueta" tam={16} className="text-[#d9a441]" /> Constelação de etiquetas
            </h3>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2.5">
              {etiquetas.map(({ etiqueta, n }) => {
                const ratio = n / maxEt;
                const fontSize = 13 + ratio * 15;
                const fontWeight = ratio > 0.6 ? 800 : ratio > 0.3 ? 600 : 400;
                const opacity = 0.55 + ratio * 0.45;
                return (
                  <span
                    key={etiqueta}
                    className="cursor-default tracking-wide transition-all duration-200 hover:scale-105 hover:text-[#d9a441]"
                    style={{
                      fontSize: `${fontSize}px`,
                      fontWeight,
                      opacity,
                      color: ratio > 0.5 ? '#ede4d0' : '#b3a78c',
                    }}
                  >
                    #{etiqueta}
                  </span>
                );
              })}
              {etiquetas.length === 0 && <p className="text-xs italic text-[#7f7660]">Nenhuma tag cadastrada.</p>}
            </div>
          </section>
        </div>

        {/* coluna lateral (direita) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Coração da Teia */}
          {destaque && (
            <section className="borda-ornada rounded-xl border border-[#d9a441]/40 bg-gradient-to-br from-[#272117] to-[#1d1913] p-6 shadow-xl shadow-black/50">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d9a441]">
                coração da teia
              </p>
              <button
                onClick={() => onOpenNote(destaque.nota)}
                className="font-display texto-gravado mt-2 block text-left text-2xl font-extrabold leading-tight text-[#ede4d0] transition hover:text-[#d9a441]"
              >
                {destaque.nota.name}
              </button>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[#b3a78c]">
                {destaque.grau} relações partem ou chegam a esta página — é para cá que a história
                gravita.
              </p>
              <div className="mt-3.5">
                <SeloTipo
                  nome={getType(destaque.nota.typeId).name}
                  cor={getType(destaque.nota.typeId).color}
                  icone={getType(destaque.nota.typeId).icon}
                  pequeno
                />
              </div>
            </section>
          )}

          {/* Mais Conectadas */}
          <section className="rounded-xl border border-[#3b3222] bg-[#1d1913] p-6 shadow-lg shadow-black/40">
            <h3 className="font-display mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#ede4d0]">
              <Icone nome="coroa" tam={16} className="text-[#d9a441]" /> Mais conectadas
            </h3>
            <div className="space-y-1">
              {conectadas.map(({ nota, grau: nGrau }, i) => {
                const tipo = getType(nota.typeId);
                return (
                  <button
                    key={nota.id}
                    onClick={() => onOpenNote(nota)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-[#272117]"
                  >
                    <span className="font-display w-4 text-center text-sm font-black text-[#d9a441]">
                      {i + 1}
                    </span>
                    <PontoCor cor={tipo.color} tam={7} />
                    <span className="flex-1 truncate text-[13px] font-medium text-[#b3a78c] hover:text-[#ede4d0]">
                      {nota.name}
                    </span>
                    <span className="rounded bg-[#15120e] px-2 py-0.5 text-[11px] font-black text-[#7f7660]">
                      {nGrau}
                    </span>
                  </button>
                );
              })}
              {conectadas.length === 0 && <p className="text-xs italic text-[#7f7660]">Nenhuma conexão tecida.</p>}
            </div>
          </section>

          {/* Revisões Recentes */}
          <section className="rounded-xl border border-[#3b3222] bg-[#1d1913] p-6 shadow-lg shadow-black/40">
            <h3 className="font-display mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#ede4d0]">
              <Icone nome="relogio" tam={16} className="text-[#d9a441]" /> Revisões recentes
            </h3>
            <div className="space-y-1">
              {recentes.map((n) => {
                const tipo = getType(n.typeId);
                return (
                  <button
                    key={n.id}
                    onClick={() => onOpenNote(n)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-[#272117]"
                  >
                    <PontoCor cor={tipo.color} tam={7} />
                    <span className="flex-1 truncate text-[13px] font-medium text-[#b3a78c] hover:text-[#ede4d0]">
                      {n.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7f7660]">
                      {formatarDataCurta(n.updatedAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Pastas */}
          <section className="rounded-xl border border-[#3b3222] bg-[#1d1913] p-6 shadow-lg shadow-black/40">
            <h3 className="font-display mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#ede4d0]">
              <Icone nome="pasta" tam={16} className="text-[#d9a441]" /> Pastas
            </h3>
            <div className="space-y-3">
              {folders.map((p) => {
                const n = notes.filter((x) => x.folderId === p.id).length;
                const pct = notes.length ? (n / notes.length) * 100 : 0;
                return (
                  <div key={p.id}>
                    <div className="mb-1 flex justify-between text-[11.5px] font-medium text-[#b3a78c]">
                      <span className="truncate">{p.name}</span>
                      <span className="font-bold text-[#7f7660]">{n}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#15120e]">
                      <div
                        className="h-full rounded-full bg-[#d9a441]/80 transition-all duration-700"
                        style={{ width: monta ? `${pct}%` : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
              {folders.length === 0 && (
                <p className="text-sm italic text-[#7f7660]">Nenhuma pasta criada.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
