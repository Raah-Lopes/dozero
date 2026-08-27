import { useState } from 'react';
import { CodexFieldDefinition, CodexFieldKind, CodexType } from './codexModel';
import { Icone } from './CodexIcons';
import { CLS_BOTAO_AMBAR, CLS_BOTAO_FANTASMA, CLS_INPUT, CLS_ROTULO } from './CodexUI';

const CORES_PRESET = [
  '#e07b4f', '#d05f5f', '#e3b64f', '#f0d98c', '#74b183', '#8f9e63',
  '#5fbfae', '#6fa8d8', '#a78bd8', '#d98fae', '#a9a294', '#c2b49a',
];

const ICONES_TIPO = [
  'espada', 'mapa', 'ampulheta', 'gema', 'pata', 'olho',
  'escudo', 'sol', 'usuarios', 'livro', 'trilha', 'faiscas',
  'raio', 'coroa', 'caveira', 'caldeirao', 'pergaminho', 'bussola',
];

const ROTULOS_CAMPO: Record<CodexFieldKind, string> = {
  text: 'Texto curto',
  longtext: 'Texto longo (parágrafo)',
  number: 'Número',
  select: 'Seleção (opções)',
  url: 'Link (URL)',
  list: 'Lista de itens',
};

interface CampoRascunho {
  id: string;
  label: string;
  kind: CodexFieldKind;
  options: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);

export function CodexTypeModal({
  type,
  onClose,
  onSave,
  onDelete,
  onNotify,
}: {
  type: CodexType | null;
  onClose: () => void;
  onSave: (type: CodexType) => void;
  onDelete?: (typeId: string) => void;
  onNotify?: (text: string, tone?: 'amber' | 'ember' | 'green') => void;
}) {
  const [name, setName] = useState(type?.name ?? '');
  const [plural, setPlural] = useState(type?.plural ?? '');
  const [color, setColor] = useState(type?.color ?? CORES_PRESET[0]);
  const [icon, setIcon] = useState(type?.icon ?? 'faiscas');
  const [fields, setFields] = useState<CampoRascunho[]>(
    (type?.fields ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      kind: f.kind,
      options: (f.options || []).join(', '),
    }))
  );

  const handleSave = () => {
    const n = name.trim();
    if (!n) {
      onNotify?.('Dê um nome ao tipo de nota.', 'ember');
      return;
    }
    const typeId = type?.id ?? `tipo_${slug(n) || crypto.randomUUID().slice(0, 8)}`;
    const defs: CodexFieldDefinition[] = fields
      .filter((f) => f.label.trim())
      .map((f, i) => {
        const id = f.id || slug(f.label) || `campo_${i + 1}`;
        return {
          id,
          label: f.label.trim(),
          kind: f.kind,
          options: f.kind === 'select' ? f.options.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        };
      });

    // assegura chaves únicas
    const vistas = new Set<string>();
    for (const d of defs) {
      let k = d.id;
      let i = 2;
      while (vistas.has(k)) k = `${d.id}_${i++}`;
      vistas.add(k);
      d.id = k;
    }

    onSave({
      id: typeId,
      name: n,
      plural: plural.trim() || `${n}s`,
      color,
      icon,
      fields: defs,
      standard: type?.standard ?? false,
    });
    onNotify?.(type ? 'Tipo atualizado com sucesso.' : `Tipo "${n}" inventado.`, 'green');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="animar-modal borda-ornada max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-linha2 bg-tinta2 p-6 shadow-2xl shadow-black/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display texto-gravado text-xl font-extrabold text-papel">
              {type ? 'Reforjar tipo de nota' : 'Inventar tipo de nota'}
            </h2>
            <p className="mt-1 text-xs text-papel2">
              Tipos ganham cor, ícone e atributos próprios — as páginas criadas com ele herdam tudo.
            </p>
          </div>
          <button onClick={onClose} className="text-papel3 transition hover:text-papel">
            <Icone nome="x" tam={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={CLS_ROTULO}>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Relíquia" className={CLS_INPUT} />
          </div>
          <div>
            <label className={CLS_ROTULO}>Plural</label>
            <input value={plural} onChange={(e) => setPlural(e.target.value)} placeholder="ex.: Relíquias" className={CLS_INPUT} />
          </div>
          <div>
            <label className={CLS_ROTULO}>Cor classificatória</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer" />
              <div className="flex flex-wrap gap-1.5">
                {CORES_PRESET.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                      color === c ? 'border-papel' : 'border-black/40'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className={CLS_ROTULO}>Ícone</label>
            <div className="flex flex-wrap gap-1">
              {ICONES_TIPO.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcone(i)}
                  className={`rounded-md border p-2 transition ${
                    icon === i ? 'border-ambar/70 bg-ambar/15 text-ambar' : 'border-linha text-papel3 hover:text-papel'
                  }`}
                >
                  <Icone nome={i} tam={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label className={CLS_ROTULO}>Atributos específicos</label>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-linha bg-tinta p-2">
                <input
                  value={f.label}
                  onChange={(e) =>
                    setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Rótulo (ex.: Poder latente)"
                  className={`${CLS_INPUT} !w-44 !py-1.5 text-xs`}
                />
                <select
                  value={f.kind}
                  onChange={(e) =>
                    setFields(fields.map((x, j) => (j === i ? { ...x, kind: e.target.value as CodexFieldKind } : x)))
                  }
                  className={`${CLS_INPUT} !w-36 !py-1.5 text-xs`}
                >
                  {(Object.keys(ROTULOS_CAMPO) as CodexFieldKind[]).map((k) => (
                    <option key={k} value={k}>
                      {ROTULOS_CAMPO[k]}
                    </option>
                  ))}
                </select>
                {f.kind === 'select' && (
                  <input
                    value={f.options}
                    onChange={(e) =>
                      setFields(fields.map((x, j) => (j === i ? { ...x, options: e.target.value } : x)))
                    }
                    placeholder="opções separadas por vírgula"
                    className={`${CLS_INPUT} !py-1.5 text-xs`}
                  />
                )}
                <button
                  onClick={() => setFields(fields.filter((_, j) => j !== i))}
                  className="shrink-0 text-papel3 transition hover:text-brasa"
                >
                  <Icone nome="lixo" tam={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setFields([...fields, { id: '', label: '', kind: 'text', options: '' }])}
            className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-ambar transition hover:text-[#e8b654]"
          >
            <Icone nome="mais" tam={12} /> adicionar atributo
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-linha pt-4">
          <button onClick={handleSave} className={CLS_BOTAO_AMBAR}>
            <Icone nome="check" tam={15} /> {type ? 'Salvar alterações' : 'Forjar tipo'}
          </button>
          <button onClick={onClose} className={CLS_BOTAO_FANTASMA}>
            Cancelar
          </button>
          {type && !type.standard && onDelete && (
            <button
              onClick={() => {
                if (window.confirm(`Excluir o tipo "${type.name}"? As notas associadas serão preservadas como Conceito.`)) {
                  onDelete(type.id);
                  onClose();
                }
              }}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-brasa transition hover:brightness-125"
            >
              <Icone nome="lixo" tam={14} /> desfazer tipo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
