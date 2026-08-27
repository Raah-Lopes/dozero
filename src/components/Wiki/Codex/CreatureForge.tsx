import React, { useEffect, useRef, useState } from 'react';
import { ConfigForja, forjarCriatura, resumoConfig } from './codexForge';
import { Icone } from './CodexIcons';
import { CodexNote } from './codexModel';
import { CLS_BOTAO_AMBAR, CLS_BOTAO_FANTASMA, CLS_INPUT } from './CodexUI';

const PASSOS = [
  { id: 1, nome: 'Criação Inteligente', icone: 'faiscas', pergunta: 'Que tipo de criatura você imagina?' },
  { id: 2, nome: 'Categoria & Tema', icone: 'etiqueta', pergunta: 'Qual a natureza e a atmosfera dela?' },
  { id: 3, nome: 'Porte & Ameaça', icone: 'raio', pergunta: 'Qual o tamanho e o nível de perigo?' },
  { id: 4, nome: 'Detalhes Finais', icone: 'pincel', pergunta: 'Refine sua criação' },
];

const CATEGORIAS = ['Monstro', 'NPC Hostil', 'Boss', 'Minion'];
const FAMILIAS = ['Aberração', 'Construto', 'Morto-Vivo', 'Elemental', 'Celestial', 'Feérico', 'Diabo'];

const TEMATICAS: { nome: string; desc: string }[] = [
  { nome: 'Sombrio & Horror', desc: 'Criaturas das trevas, horror cósmico, pesadelos' },
  { nome: 'Elemental & Natural', desc: 'Forças da natureza, elementais, espíritos' },
  { nome: 'Infernal & Demoníaco', desc: 'Demônios, diabos, aberrações infernais' },
  { nome: 'Arcano & Místico', desc: 'Guardiões mágicos, construtos arcanos' },
  { nome: 'Bestial & Selvagem', desc: 'Predadores, bestas colossais, enxames' },
  { nome: 'Militar & Tático', desc: 'NPCs hostis, comandantes, tropas' },
  { nome: 'Morto-Vivo', desc: 'Liches, vampiros, hordas de zumbis' },
  { nome: 'Dracônico', desc: 'Dragões, wyverns, drakes' },
];

const PORTES = ['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Colossal'];

const AMEACAS: { nome: string; desc: string }[] = [
  { nome: 'Minion', desc: 'Ameaça mínima, derrotável em 1-2 golpes' },
  { nome: 'Fraco', desc: 'Grupo de baixo nível (1-4)' },
  { nome: 'Médio', desc: 'Desafio justo (5-8)' },
  { nome: 'Forte', desc: 'Ameaça séria (9-14)' },
  { nome: 'Elite', desc: 'Perigo mortal (15-18)' },
  { nome: 'Lendário', desc: 'Boss épico (19+)' },
];

const ESTILOS = ['Sombrio & Épico', 'Lúdico & Fantástico', 'Realista & Brutal', 'Mítico & Ancestral', 'Sci-Fi & Futurista', 'Folclórico Brasileiro'];

const PAPEIS = ['Automático', 'Líder', 'Comum', 'Caçador', 'Artilheiro', 'Bruto', 'Controlador', 'Boss', 'Espreitador', 'Manipulador', 'Soldado', 'Suporte', 'Especialista', 'Enxame', 'Solo'];

const SUGESTOES = [
  'Um guardião de tumba que coleciona os nomes dos invasores',
  'Uma besta dos pântanos que imita vozes de afogados',
  'Algo que vive entre o sonho e o pesadelo de uma cidade',
];

const FRASES_FORJA = [
  'Invocando a essência…',
  'Moldando carne, escamas ou engrenagens…',
  'Afiando garras e intenções…',
  'Consultando os dados do destino…',
  'Gravando o nome no códice…',
];

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-ambar/90">{children}</p>
  );
}

function Lasca({
  ativo,
  onClick,
  children,
  opcional = false,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  opcional?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-md border px-3 py-2 text-[13px] font-semibold transition-all duration-200 active:scale-95 ${
        ativo
          ? 'border-ambar bg-ambar/15 text-ambar shadow-[0_0_18px_rgba(217,164,65,0.18)]'
          : 'border-linha bg-tinta3 text-papel2 hover:-translate-y-0.5 hover:border-linha2 hover:text-papel'
      }`}
    >
      <span className="flex items-center gap-1.5">
        {children}
        {opcional && !ativo && <span className="text-[9px] uppercase tracking-wider text-papel3">opcional</span>}
      </span>
      {ativo && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ambar text-[#241a06]">
          <Icone nome="check" tam={10} />
        </span>
      )}
    </button>
  );
}

function CartaoOpcao({
  ativo,
  onClick,
  titulo,
  desc,
}: {
  ativo: boolean;
  onClick: () => void;
  titulo: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-start rounded-lg border p-3.5 text-left transition-all duration-200 active:scale-[0.98] ${
        ativo
          ? 'border-ambar bg-ambar/12 shadow-[0_0_24px_rgba(217,164,65,0.16)]'
          : 'border-linha bg-tinta3 hover:-translate-y-0.5 hover:border-linha2 hover:bg-tinta4'
      }`}
    >
      <span className={`font-display text-[14px] font-bold ${ativo ? 'text-ambar' : 'text-papel'}`}>
        {titulo}
      </span>
      <span className="mt-1 text-[11.5px] leading-snug text-papel2">{desc}</span>
      {ativo && (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-ambar text-[#241a06]">
          <Icone nome="check" tam={12} />
        </span>
      )}
    </button>
  );
}

export function CreatureForge({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (note: CodexNote) => void;
}) {
  const [passo, setPasso] = useState(1);
  const [cfg, setCfg] = useState<ConfigForja>({
    prompt: '',
    categoria: '',
    familia: '',
    tematica: '',
    porte: '',
    ameaca: '',
    estilo: '',
    papel: 'Automático',
    extras: '',
  });
  const [gerando, setGerando] = useState(false);
  const [frase, setFrase] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const set = (p: Partial<ConfigForja>) => setCfg((c) => ({ ...c, ...p }));

  const pendencia =
    passo === 2
      ? !cfg.categoria || !cfg.tematica
      : passo === 3
      ? !cfg.porte || !cfg.ameaca
      : passo === 4
      ? !cfg.estilo
      : false;

  const avisoPendencia =
    passo === 2
      ? 'Escolha ao menos uma categoria e uma temática.'
      : passo === 3
      ? 'Defina o porte e o nível de ameaça.'
      : passo === 4
      ? 'Escolha o estilo narrativo para temperar a forja.'
      : '';

  const avancar = () => {
    if (pendencia) return;
    if (passo < 4) setPasso(passo + 1);
    else gerar();
  };

  const gerar = () => {
    if (gerando) return;
    setGerando(true);
    setFrase(0);
    FRASES_FORJA.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setFrase(i), i * 520));
    });
    timers.current.push(
      window.setTimeout(() => {
        try {
          const resultado = forjarCriatura(cfg);
          onCreate({
            id: `note_${crypto.randomUUID()}`,
            typeId: 'criatura',
            folderId: null,
            name: resultado.nome,
            description: resultado.descricao,
            imageUrl: null,
            gallery: [],
            fields: resultado.campos,
            tags: resultado.tags,
            favorite: false,
            links: [],
            icon: resultado.icone || 'pata',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch {
          setGerando(false);
        }
      }, FRASES_FORJA.length * 520 + 350)
    );
  };

  const linhasResumo = resumoConfig(cfg);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]"
      onClick={gerando ? undefined : onClose}
    >
      <div
        className="animar-modal flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-linha2 bg-tinta2 shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* brasas no topo */}
        <div
          className="pointer-events-none h-1.5 shrink-0"
          style={{ background: 'linear-gradient(90deg, transparent, #d9a441, #e07b4f, #d9a441, transparent)' }}
        />

        {/* cabeçalho */}
        <div className="flex items-center justify-between gap-4 border-b border-linha px-6 py-4">
          <div className="flex items-center gap-3.5">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-brasa/50 bg-brasa/10 text-brasa">
              <Icone nome="caldeirao" tam={23} />
              <span className="animar-forjar absolute -right-1 -top-1 text-ambar">
                <Icone nome="faiscas" tam={13} />
              </span>
            </span>
            <div>
              <h2 className="font-display texto-gravado text-xl font-extrabold tracking-wide text-papel">
                Forja de Criaturas
              </h2>
              <p className="text-[11px] uppercase tracking-[0.18em] text-papel3">
                criação inteligente · 4 rituais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={gerando}
            className="text-papel3 transition hover:text-papel disabled:opacity-30"
          >
            <Icone nome="x" tam={18} />
          </button>
        </div>

        {/* trilha de passos */}
        <div className="flex items-center gap-2 border-b border-linha px-6 py-3.5">
          {PASSOS.map((p, i) => {
            const feito = passo > p.id;
            const ativo = passo === p.id;
            return (
              <div key={p.id} className="flex flex-1 items-center gap-2">
                <button
                  onClick={() => !gerando && p.id < passo && setPasso(p.id)}
                  className={`flex min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition ${
                    feito ? 'cursor-pointer hover:bg-tinta3' : 'cursor-default'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
                      ativo
                        ? 'border-ambar bg-ambar/15 text-ambar shadow-[0_0_16px_rgba(217,164,65,0.3)]'
                        : feito
                        ? 'border-ambar/50 bg-ambar/10 text-ambar'
                        : 'border-linha2 bg-tinta text-papel3'
                    }`}
                  >
                    <Icone nome={feito ? 'check' : p.icone} tam={15} />
                  </span>
                  <span className="hidden min-w-0 lg:block">
                    <span
                      className={`block truncate text-[12.5px] font-bold ${
                        ativo ? 'text-ambar' : feito ? 'text-papel' : 'text-papel3'
                      }`}
                    >
                      {p.nome}
                    </span>
                    <span className="block text-[9px] uppercase tracking-[0.16em] text-papel3">
                      ritual {p.id} de 4
                    </span>
                  </span>
                </button>
                {i < PASSOS.length - 1 && (
                  <span
                    className={`h-px flex-1 transition-colors duration-500 ${
                      feito || ativo ? 'bg-ambar/50' : 'bg-linha'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* corpo */}
        <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div key={passo} className="animar-deslizar">
            <p className="font-display mb-4 text-lg font-bold text-papel">
              {PASSOS[passo - 1].pergunta}
            </p>

            {passo === 1 && (
              <div className="mx-auto max-w-2xl">
                <Rotulo>Sua visão</Rotulo>
                <textarea
                  value={cfg.prompt}
                  onChange={(e) => set({ prompt: e.target.value })}
                  rows={5}
                  placeholder="Descreva livremente: uma sombra que devora memórias, um colosso de raízes que marcha a cada eclipse…"
                  className={`${CLS_INPUT} resize-none text-[15px] leading-relaxed`}
                />
                <p className="mt-2 text-[11px] italic text-papel3">
                  Pode deixar em branco — a forja também sabe sonhar sozinha.
                </p>
                <div className="mt-5">
                  <Rotulo>
                    <span className="flex items-center gap-1.5">
                      <Icone nome="faiscas" tam={11} /> Sussurros do oráculo
                    </span>
                  </Rotulo>
                  <div className="flex flex-col gap-2">
                    {SUGESTOES.map((s) => (
                      <button
                        key={s}
                        onClick={() => set({ prompt: s })}
                        className={`rounded-lg border border-dashed px-4 py-2.5 text-left text-[13px] transition hover:border-ambar/60 hover:bg-ambar/8 hover:text-ambar ${
                          cfg.prompt === s ? 'border-ambar/70 bg-ambar/10 text-ambar' : 'border-linha2 text-papel2'
                        }`}
                      >
                        "{s}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {passo === 2 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Rotulo>Categoria</Rotulo>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS.map((c) => (
                      <Lasca key={c} ativo={cfg.categoria === c} onClick={() => set({ categoria: c })}>
                        {c}
                      </Lasca>
                    ))}
                  </div>
                  <div className="mt-5">
                    <Rotulo>
                      Família <span className="normal-case tracking-normal text-papel3">(opcional)</span>
                    </Rotulo>
                    <div className="flex flex-wrap gap-2">
                      {FAMILIAS.map((f) => (
                        <Lasca
                          key={f}
                          ativo={cfg.familia === f}
                          onClick={() => set({ familia: cfg.familia === f ? '' : f })}
                          opcional
                        >
                          {f}
                        </Lasca>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Rotulo>Temática</Rotulo>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {TEMATICAS.map((t) => (
                      <CartaoOpcao
                        key={t.nome}
                        ativo={cfg.tematica === t.nome}
                        onClick={() => set({ tematica: t.nome })}
                        titulo={t.nome}
                        desc={t.desc}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {passo === 3 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Rotulo>Porte</Rotulo>
                  <div className="flex items-end gap-2">
                    {PORTES.map((p, i) => (
                      <button
                        key={p}
                        onClick={() => set({ porte: p })}
                        title={p}
                        className={`flex flex-1 flex-col items-center gap-2 rounded-lg border px-1 pb-2.5 pt-3 transition-all active:scale-95 ${
                          cfg.porte === p
                            ? 'border-ambar bg-ambar/12 shadow-[0_0_18px_rgba(217,164,65,0.18)]'
                            : 'border-linha bg-tinta3 hover:-translate-y-0.5 hover:border-linha2'
                        }`}
                      >
                        <span
                          className="rounded-sm transition-all"
                          style={{
                            width: 10 + i * 4,
                            height: 10 + i * 4,
                            background: cfg.porte === p ? '#d9a441' : '#4a4030',
                            boxShadow: cfg.porte === p ? '0 0 12px rgba(217,164,65,0.5)' : 'none',
                          }}
                        />
                        <span
                          className={`text-[10.5px] font-bold ${cfg.porte === p ? 'text-ambar' : 'text-papel2'}`}
                        >
                          {p}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] italic text-papel3">
                    Do que cabe na palma ao que esmaga fortalezas.
                  </p>
                  <div className="mt-6">
                    <Rotulo>Nível de ameaça</Rotulo>
                    <div className="grid grid-cols-2 gap-2">
                      {AMEACAS.map((a) => (
                        <CartaoOpcao
                          key={a.nome}
                          ativo={cfg.ameaca === a.nome}
                          onClick={() => set({ ameaca: a.nome })}
                          titulo={`${a.nome}`}
                          desc={a.desc}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-start gap-3 lg:pt-1">
                  <div className="borda-ornada rounded-lg border border-ambar/35 bg-gradient-to-br from-tinta3 to-tinta2 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ambar">
                      como a forja lê suas escolhas
                    </p>
                    <ul className="mt-3 space-y-2.5 text-[12.5px] text-papel2">
                      <li className="flex gap-2.5">
                        <Icone nome="raio" tam={14} className="mt-0.5 shrink-0 text-ambar" />
                        <span>
                          A <b className="text-papel">ameaça</b> define o nível e o XP da criatura — de
                          capim para espadas a pesadelo de campanha.
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <Icone nome="escudo" tam={14} className="mt-0.5 shrink-0 text-ambar" />
                        <span>
                          O <b className="text-papel">porte</b> multiplica vitalidade e presença no
                          campo de batalha.
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <Icone nome="faiscas" tam={14} className="mt-0.5 shrink-0 text-ambar" />
                        <span>
                          A <b className="text-papel">temática</b> escolhe nome, habilidades, fraquezas
                          e o habitat onde ela espera.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-linha bg-tinta2 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-papel3">
                      leitura atual
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        cfg.categoria,
                        cfg.familia,
                        cfg.tematica,
                        cfg.porte && `Porte ${cfg.porte}`,
                        cfg.ameaca && `Ameaça ${cfg.ameaca}`,
                      ]
                        .filter(Boolean)
                        .map((x) => (
                          <span
                            key={x as string}
                            className="rounded-full border border-linha2 bg-tinta3 px-2.5 py-1 text-[11px] text-papel2"
                          >
                            {x}
                          </span>
                        ))}
                      {![cfg.categoria, cfg.tematica, cfg.porte, cfg.ameaca].some(Boolean) && (
                        <span className="text-[12px] italic text-papel3">Nada gravado ainda…</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {passo === 4 && (
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="space-y-5 lg:col-span-3">
                  <div>
                    <Rotulo>Estilo narrativo</Rotulo>
                    <div className="flex flex-wrap gap-2">
                      {ESTILOS.map((e) => (
                        <Lasca key={e} ativo={cfg.estilo === e} onClick={() => set({ estilo: e })}>
                          {e}
                        </Lasca>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Rotulo>
                      Papel tático <span className="normal-case tracking-normal text-papel3">(opcional)</span>
                    </Rotulo>
                    <div className="flex flex-wrap gap-2">
                      {PAPEIS.map((p) => (
                        <Lasca
                          key={p}
                          ativo={cfg.papel === p}
                          onClick={() => set({ papel: p })}
                          opcional={p !== 'Automático'}
                        >
                          {p}
                        </Lasca>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Rotulo>
                      Instruções extras <span className="normal-case tracking-normal text-papel3">(opcional)</span>
                    </Rotulo>
                    <textarea
                      value={cfg.extras}
                      onChange={(e) => set({ extras: e.target.value })}
                      rows={3}
                      placeholder="Ex: Deve ter conexão com o fogo, ter uma fase de boss, ser baseado em folclore japonês…"
                      className={`${CLS_INPUT} resize-none text-[13.5px]`}
                    />
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="borda-ornada flex h-full flex-col rounded-lg border border-ambar/40 bg-gradient-to-br from-tinta3 to-tinta2 p-5">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ambar">
                      <Icone nome="pergaminho" tam={13} /> Resumo da criação
                    </p>
                    <div className="mt-3 flex-1 space-y-2">
                      {linhasResumo.map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-baseline justify-between gap-3 border-b border-linha/60 pb-1.5"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-papel3">{k}</span>
                          <span
                            className={`text-right text-[12.5px] font-semibold ${
                              v === '—' ? 'text-papel3' : 'text-papel'
                            }`}
                          >
                            {v}
                          </span>
                        </div>
                      ))}
                      {cfg.prompt.trim() && (
                        <div className="pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-papel3">
                            Visão do mestre
                          </span>
                          <p className="mt-1 text-[12px] italic leading-snug text-papel2">"{cfg.prompt.trim()}"</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-md border border-brasa/40 bg-brasa/10 px-3 py-2">
                      <span className="flex items-center gap-2 text-[11px] font-bold text-brasa">
                        <Icone nome="faiscas" tam={13} /> Custo: 8 créditos de IA
                      </span>
                      <span className="text-[10px] italic text-papel3">cobrados em glória</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* véu da forja */}
          {gerando && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-tinta/92 backdrop-blur-sm">
              <span className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-brasa/50 bg-brasa/10 text-brasa">
                <Icone nome="caldeirao" tam={44} />
                <span className="animar-girar absolute inset-0 rounded-full border border-dashed border-ambar/50" />
                <span className="animar-forjar absolute -right-1 -top-1 text-ambar">
                  <Icone nome="faiscas" tam={22} />
                </span>
                <span
                  className="animar-forjar absolute -bottom-2 -left-2 text-brasa"
                  style={{ animationDelay: '0.4s' }}
                >
                  <Icone nome="faiscas" tam={16} />
                </span>
              </span>
              <p key={frase} className="animar-deslizar font-display text-lg font-bold text-ambar">
                {FRASES_FORJA[frase]}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-papel3">a forja não aceita pressa</p>
            </div>
          )}
        </div>

        {/* rodapé */}
        <div className="flex items-center justify-between gap-3 border-t border-linha px-6 py-4">
          <button onClick={onClose} disabled={gerando} className={`${CLS_BOTAO_FANTASMA} disabled:opacity-30`}>
            <Icone nome="x" tam={14} /> Cancelar
          </button>
          <div className="flex items-center gap-3">
            {pendencia && avisoPendencia && (
              <span className="hidden text-[11px] italic text-brasa sm:block">{avisoPendencia}</span>
            )}
            {passo > 1 && (
              <button
                onClick={() => setPasso(passo - 1)}
                disabled={gerando}
                className={CLS_BOTAO_FANTASMA}
              >
                <Icone nome="setaEsq" tam={14} /> Voltar
              </button>
            )}
            <button
              onClick={avancar}
              disabled={pendencia || gerando}
              className={`${CLS_BOTAO_AMBAR} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {passo < 4 ? (
                <>
                  Próximo <Icone nome="setaDir" tam={14} />
                </>
              ) : (
                <>
                  <Icone nome="faiscas" tam={15} /> Gerar Criatura
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}