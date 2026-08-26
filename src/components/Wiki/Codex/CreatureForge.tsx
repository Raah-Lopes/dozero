import React, { useEffect, useRef, useState } from 'react';
import { ConfigForja, forjarCriatura } from './codexForge';
import { Icone } from './CodexIcons';
import { CodexNote } from './codexModel';

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const PASSOS = [
  { id: 1, nome: 'Criação Inteligente', icone: 'faiscas', pergunta: 'Que tipo de criatura você imagina?' },
  { id: 2, nome: 'Categoria & Tema', icone: 'etiqueta', pergunta: 'Qual a natureza e a atmosfera dela?' },
  { id: 3, nome: 'Porte & Ameaça', icone: 'raio', pergunta: 'Qual o tamanho e o nível de perigo?' },
  { id: 4, nome: 'Detalhes Finais', icone: 'pincel', pergunta: 'Refine sua criação' },
];

const CATEGORIAS = ['Monstro', 'NPC Hostil', 'Boss', 'Minion'];
const FAMILIAS = ['Aberração', 'Construto', 'Morto-Vivo', 'Elemental', 'Celestial', 'Feérico', 'Diabo'];

const TEMATICAS = [
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

const AMEACAS = [
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

function Lasca({ ativo, onClick, children, opcional = false }: { ativo: boolean; onClick: () => void; children: React.ReactNode; opcional?: boolean; }) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-md border px-3 py-2 text-[13px] font-semibold transition-all duration-200 active:scale-95 ${ativo ? 'border-ambar bg-ambar/15 text-ambar shadow-[0_0_18px_rgba(217,164,65,0.18)]' : 'border-linha bg-tinta3 text-papel2 hover:-translate-y-0.5 hover:border-linha2 hover:text-papel'}`}
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

function CartaoOpcao({ ativo, onClick, titulo, desc }: { ativo: boolean; onClick: () => void; titulo: string; desc: string; }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-start rounded-lg border p-3.5 text-left transition-all duration-200 active:scale-[0.98] ${ativo ? 'border-ambar bg-ambar/12 shadow-[0_0_24px_rgba(217,164,65,0.16)]' : 'border-linha bg-tinta3 hover:-translate-y-0.5 hover:border-linha2 hover:bg-tinta4'}`}
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

export function CreatureForge({ onClose, onCreate }: { onClose: () => void; onCreate: (note: CodexNote) => void; }) {
  const [passo, setPasso] = useState(1);
  const [cfg, setCfg] = useState<ConfigForja>({ prompt: '', categoria: '', familia: '', tematica: '', porte: '', ameaca: '', estilo: '', papel: 'Automático', extras: '' });
  const [gerando, setGerando] = useState(false);
  const [frase, setFrase] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const set = (p: Partial<ConfigForja>) => setCfg((c) => ({ ...c, ...p }));
  const pendencia = passo === 2 ? !cfg.categoria || !cfg.tematica : passo === 3 ? !cfg.porte || !cfg.ameaca : passo === 4 ? !cfg.estilo : false;
  const avisoPendencia = passo === 2 ? 'Escolha ao menos uma categoria e uma temática.' : passo === 3 ? 'Defina o porte e o nível de ameaça.' : passo === 4 ? 'Escolha o estilo narrativo para temperar a forja.' : '';

  const avancar = () => { if (pendencia) return; if (passo < 4) setPasso(passo + 1); else gerar(); };

  const gerar = () => {
    if (gerando) return;
    setGerando(true);
    setFrase(0);
    FRASES_FORJA.forEach((_, i) => timers.current.push(window.setTimeout(() => setFrase(i), i * 520)));
    timers.current.push(
      window.setTimeout(() => {
        try {
          const resultado = forjarCriatura(cfg);
          onCreate({
            id: id('note'), typeId: 'creature', folderId: null, name: resultado.nome, description: resultado.descricao, imageUrl: '', content: '',
            fields: { categoria: resultado.categoria, tematica: resultado.tematica, porte: resultado.porte, ameaca: resultado.ameaca, estilo: resultado.estilo, papel: resultado.papel, familia: resultado.familia, extras: resultado.extras },
            tags: resultado.tags, favorites: false, links: [], createdAt: Date.now(), updatedAt: Date.now()
          });
        } catch (caught) { console.error(caught); setGerando(false); }
      }, FRASES_FORJA.length * 520 + 400)
    );
  };

  const p = PASSOS[passo - 1];

  return (
    <div className="animar-aparecer fixed inset-0 z-50 flex items-center justify-center bg-[#0a1519]/90 p-4 backdrop-blur-md sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="animar-modal relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#295348] bg-tinta2 shadow-2xl">
        <header className="relative flex items-center p-6 sm:px-8">
          <div className="flex flex-1 items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tinta3 text-ambar">
              <Icone nome={p.icone} tam={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ambar/80">Passo {passo} de 4</p>
              <h2 className="font-display mt-0.5 text-2xl font-extrabold text-papel sm:text-3xl">{p.nome}</h2>
            </div>
          </div>
          <p className="hidden text-right text-sm italic text-papel3 sm:block">{p.pergunta}</p>
          <button onClick={onClose} className="absolute right-4 top-4 p-2 text-papel3 transition hover:text-papel"><Icone nome="x" tam={24} /></button>
        </header>

        <div className="relative h-1.5 w-full bg-tinta4">
          <div className="absolute bottom-0 left-0 top-0 bg-ambar transition-all duration-500 ease-out" style={{ width: `${(passo / 4) * 100}%`, boxShadow: '0 0 12px rgba(217,164,65,0.6)' }} />
        </div>

        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="animar-deslizar">
            {passo === 1 && (
              <div className="mx-auto max-w-2xl">
                <Rotulo>Semente de Criação (Opcional)</Rotulo>
                <textarea value={cfg.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="Descreva brevemente o que tem em mente ou deixe a forja surpreender você..." className="w-full resize-none rounded-xl border border-linha bg-tinta p-5 text-lg text-papel placeholder:text-papel3 outline-none transition focus:border-ambar/70 focus:ring-2 focus:ring-ambar/20" rows={4} />
                <div className="mt-8">
                  <p className="mb-4 text-xs font-semibold text-papel3">Invisões que ressoam do Códice:</p>
                  <div className="flex flex-col gap-2.5">
                    {SUGESTOES.map((sug) => (
                      <button key={sug} onClick={() => set({ prompt: sug })} className="rounded-lg border border-linha bg-tinta3 px-4 py-2.5 text-left text-sm text-papel2 transition hover:border-linha2 hover:text-papel active:scale-[0.99]">"{sug}"</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {passo === 2 && (
              <div className="space-y-10">
                <section><Rotulo>Categoria Fundamental</Rotulo><div className="flex flex-wrap gap-2.5">{CATEGORIAS.map((c) => <Lasca key={c} ativo={cfg.categoria === c} onClick={() => set({ categoria: c })}>{c}</Lasca>)}</div></section>
                <section><Rotulo>Família ou Linhagem</Rotulo><div className="flex flex-wrap gap-2.5">{FAMILIAS.map((f) => <Lasca key={f} ativo={cfg.familia === f} onClick={() => set({ familia: f })} opcional>{f}</Lasca>)}</div></section>
                <section><Rotulo>Temática Principal</Rotulo><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{TEMATICAS.map((t) => <CartaoOpcao key={t.nome} ativo={cfg.tematica === t.nome} onClick={() => set({ tematica: t.nome })} titulo={t.nome} desc={t.desc} />)}</div></section>
              </div>
            )}
            {passo === 3 && (
              <div className="space-y-10">
                <section><Rotulo>Escala e Porte</Rotulo><div className="flex flex-wrap gap-2.5">{PORTES.map((p) => <Lasca key={p} ativo={cfg.porte === p} onClick={() => set({ porte: p })}>{p}</Lasca>)}</div></section>
                <section><Rotulo>Nível de Ameaça Coletiva</Rotulo><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{AMEACAS.map((a) => <CartaoOpcao key={a.nome} ativo={cfg.ameaca === a.nome} onClick={() => set({ ameaca: a.nome })} titulo={a.nome} desc={a.desc} />)}</div></section>
              </div>
            )}
            {passo === 4 && (
              <div className="space-y-10">
                <section><Rotulo>Estilo Literário / Narrativo</Rotulo><div className="flex flex-wrap gap-2.5">{ESTILOS.map((e) => <Lasca key={e} ativo={cfg.estilo === e} onClick={() => set({ estilo: e })}>{e}</Lasca>)}</div></section>
                <section><Rotulo>Papel Tático Primário</Rotulo><div className="flex flex-wrap gap-2.5">{PAPEIS.map((p) => <Lasca key={p} ativo={cfg.papel === p} onClick={() => set({ papel: p })} opcional>{p}</Lasca>)}</div></section>
                <section><Rotulo>Instruções Extraordinárias</Rotulo><textarea value={cfg.extras} onChange={(e) => set({ extras: e.target.value })} placeholder="Ex: Ela deve ter três fases diferentes durante o combate..." className="w-full resize-none rounded-xl border border-linha bg-tinta p-5 text-sm text-papel placeholder:text-papel3 outline-none transition focus:border-ambar/70 focus:ring-2 focus:ring-ambar/20" rows={3} /></section>
              </div>
            )}
          </div>
        </main>

        <footer className="flex shrink-0 items-center justify-between border-t border-linha bg-tinta3 p-5 sm:px-8">
          <button onClick={onClose} disabled={gerando} className="text-sm font-semibold text-papel3 transition hover:text-papel">Cancelar</button>
          <div className="flex items-center gap-4">
            {pendencia && <span className="text-xs font-semibold text-brasa">{avisoPendencia}</span>}
            {passo > 1 && <button onClick={() => setPasso(passo - 1)} disabled={gerando} className="inline-flex items-center justify-center gap-2 rounded-md border border-linha bg-tinta3 px-4 py-2 text-sm font-medium text-papel2 transition hover:border-linha2 hover:text-papel active:scale-[0.98]">Voltar</button>}
            {passo < 4 ? <button onClick={avancar} disabled={pendencia || gerando} className="inline-flex items-center justify-center gap-2 rounded-md bg-ambar px-6 py-2 text-sm font-bold text-[#241a06] shadow-[0_2px_14px_rgba(217,164,65,0.25)] transition hover:bg-[#e8b654] hover:shadow-[0_2px_22px_rgba(217,164,65,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:grayscale">Próximo Passo</button> : <button onClick={gerar} disabled={pendencia || gerando} className="inline-flex items-center justify-center gap-2 rounded-md bg-ambar px-6 py-2 text-sm font-bold text-[#241a06] shadow-[0_2px_14px_rgba(217,164,65,0.25)] transition hover:bg-[#e8b654] hover:shadow-[0_2px_22px_rgba(217,164,65,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:grayscale">{gerando ? <>Forjando...</> : <><Icone nome="caldeirao" tam={18} /> Forjar Criatura</>}</button>}
          </div>
        </footer>

        {gerando && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-tinta2/90 backdrop-blur-sm">
            <div className="animar-girar mb-6 text-ambar"><Icone nome="caldeirao" tam={64} /></div>
            <h3 className="font-display text-center text-3xl font-bold text-papel">{FRASES_FORJA[frase]}</h3>
            <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.25em] text-ambar/70">A forja não aceita pressa</p>
          </div>
        )}
      </div>
      <style>{`
        .animar-aparecer { animation: fadeIn 0.3s ease-out; }
        .animar-modal { animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animar-deslizar { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animar-girar { animation: spin 4s linear infinite; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}