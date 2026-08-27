import { useEffect, useRef, useState } from 'react';
import { CodexFolder, CodexNote, CodexRelation, CodexType } from './codexModel';
import { Icone } from './CodexIcons';
import { CLS_BOTAO_AMBAR, CLS_BOTAO_FANTASMA } from './CodexUI';

const L = 1280;
const A = 920;

function linhas(ctx: CanvasRenderingContext2D, texto: string, maxW: number, maxLinhas = 99): string[] {
  const palavras = String(texto || '').split(/\s+/).filter(Boolean);
  const resultado: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tentativa).width > maxW && atual) {
      resultado.push(atual);
      atual = p;
      if (resultado.length === maxLinhas) break;
    } else {
      atual = tentativa;
    }
  }
  if (atual && resultado.length < maxLinhas) resultado.push(atual);
  if (resultado.length === maxLinhas && palavras.length > resultado.join(' ').split(' ').length) {
    resultado[maxLinhas - 1] = resultado[maxLinhas - 1].replace(/\s?\S*$/, '') + '…';
  }
  return resultado;
}

function retanguloArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const slugArquivo = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'nota';

export function CodexExportModal({
  note,
  types,
  folders,
  relations,
  notes,
  onClose,
  onNotify,
}: {
  note: CodexNote;
  types: CodexType[];
  folders: CodexFolder[];
  relations: CodexRelation[];
  notes: CodexNote[];
  onClose: () => void;
  onNotify?: (text: string, tone?: 'amber' | 'ember' | 'green') => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pronto, setPronto] = useState(false);

  const tipo = types.find((t) => t.id === note.typeId) || types[0] || {
    id: 'conceito',
    name: 'Conceito',
    color: '#d9a441',
    icon: 'faiscas',
    fields: [],
  };
  const pasta = folders.find((f) => f.id === note.folderId);
  const relacoesNota = relations.filter((r) => r.sourceId === note.id || r.targetId === note.id).slice(0, 4);

  useEffect(() => {
    let vivo = true;
    const desenhar = async () => {
      try {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {
        /* segue */
      }
      if (!vivo) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // fundo escuro tinta
      ctx.fillStyle = '#191510';
      ctx.fillRect(0, 0, L, A);
      const brilho = ctx.createRadialGradient(220, 160, 40, 220, 160, 760);
      brilho.addColorStop(0, `${tipo.color}33`);
      brilho.addColorStop(1, 'transparent');
      ctx.fillStyle = brilho;
      ctx.fillRect(0, 0, L, A);

      // moldura externa
      ctx.strokeStyle = `${tipo.color}aa`;
      ctx.lineWidth = 3;
      ctx.strokeRect(26, 26, L - 52, A - 52);
      ctx.strokeStyle = '#d9a441';
      ctx.lineWidth = 4;
      const cantos = [
        [26, 26, 1, 1],
        [L - 26, 26, -1, 1],
        [26, A - 26, 1, -1],
        [L - 26, A - 26, -1, -1],
      ];
      for (const [cx, cy, sx, sy] of cantos) {
        ctx.beginPath();
        ctx.moveTo(cx + 34 * sx, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + 34 * sy);
        ctx.stroke();
      }

      // painel esquerdo: imagem ou monograma
      const px = 48;
      const py = 48;
      const pw = 400;
      const ph = A - 96;
      ctx.save();
      retanguloArredondado(ctx, px, py, pw, ph, 10);
      ctx.clip();
      let imagemUsada = false;
      if (note.imageUrl) {
        try {
          const img = new Image();
          if (/^https?:/i.test(note.imageUrl)) img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('img'));
            img.src = note.imageUrl!;
          });
          const escala = Math.max(pw / img.width, ph / img.height);
          const dw = img.width * escala;
          const dh = img.height * escala;
          ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
          imagemUsada = true;
        } catch {
          imagemUsada = false;
        }
      }
      if (!imagemUsada) {
        const grad = ctx.createLinearGradient(px, py, px + pw, py + ph);
        grad.addColorStop(0, `${tipo.color}44`);
        grad.addColorStop(1, '#27211700');
        ctx.fillStyle = '#272117';
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = grad;
        ctx.fillRect(px, py, pw, ph);
        const iniciais = note.name
          .replace(/[^a-zA-ZÀ-ú0-9 ]/g, '')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase())
          .join('');
        ctx.fillStyle = `${tipo.color}55`;
        ctx.font = "900 300px 'Cinzel', Georgia, serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(iniciais || '?', px + pw / 2, py + ph / 2 + 20);

        // losango ornamental
        ctx.strokeStyle = `${tipo.color}88`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + pw / 2, py + ph / 2 - 190);
        ctx.lineTo(px + pw / 2 + 60, py + ph / 2 - 130);
        ctx.lineTo(px + pw / 2, py + ph / 2 - 70);
        ctx.lineTo(px + pw / 2 - 60, py + ph / 2 - 130);
        ctx.closePath();
        ctx.stroke();
      }

      // sombra interna inferior
      const sombra = ctx.createLinearGradient(0, py + ph - 160, 0, py + ph);
      sombra.addColorStop(0, 'transparent');
      sombra.addColorStop(1, 'rgba(10,8,6,0.75)');
      ctx.fillStyle = sombra;
      ctx.fillRect(px, py, pw, ph);
      ctx.restore();

      // coluna direita
      const cx0 = 496;
      const cw = L - cx0 - 70;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      let y = 108;

      // selo do tipo
      ctx.font = "800 21px 'Alegreya Sans', sans-serif";
      const nomeTipo = (tipo.name || 'ENTIDADE').toUpperCase();
      const seloW = ctx.measureText(nomeTipo).width + 46;
      retanguloArredondado(ctx, cx0, y - 27, seloW, 38, 6);
      ctx.fillStyle = tipo.color;
      ctx.fill();
      ctx.fillStyle = '#1c1509';
      // losango pequeno
      ctx.beginPath();
      ctx.moveTo(cx0 + 18, y - 8);
      ctx.lineTo(cx0 + 24, y - 14);
      ctx.lineTo(cx0 + 30, y - 8);
      ctx.lineTo(cx0 + 24, y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillText(nomeTipo, cx0 + 40, y);

      // nome
      y += 62;
      ctx.fillStyle = '#f3ead7';
      ctx.font = "700 54px 'Cinzel', Georgia, serif";
      const nomeLinhas = linhas(ctx, note.name, cw, 2);
      for (const lnh of nomeLinhas) {
        ctx.fillText(lnh, cx0, y);
        y += 60;
      }

      // meta
      y += 4;
      ctx.font = "500 21px 'Alegreya Sans', sans-serif";
      ctx.fillStyle = '#b3a78c';
      const meta = [pasta?.name, `criada em ${new Date(note.createdAt).toLocaleDateString('pt-BR')}`]
        .filter(Boolean)
        .join('  ·  ');
      ctx.fillText(meta, cx0, y);
      y += 40;

      // etiquetas
      if (note.tags.length) {
        let tx = cx0;
        ctx.font = "700 19px 'Alegreya Sans', sans-serif";
        for (const t of note.tags.slice(0, 6)) {
          const w = ctx.measureText(`#${t}`).width + 26;
          if (tx + w > cx0 + cw) break;
          retanguloArredondado(ctx, tx, y - 24, w, 32, 16);
          ctx.strokeStyle = '#d9a44188';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#d9a441';
          ctx.fillText(`#${t}`, tx + 13, y - 1);
          tx += w + 10;
        }
        y += 42;
      }

      // divisor
      ctx.strokeStyle = '#3b3222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx0, y);
      ctx.lineTo(cx0 + cw, y);
      ctx.stroke();
      y += 40;

      // descrição
      if (note.description) {
        ctx.fillStyle = '#ddd2b8';
        ctx.font = "400 24px 'Alegreya Sans', sans-serif";
        const descLinhas = linhas(ctx, note.description, cw, 4);
        for (const lnh of descLinhas) {
          ctx.fillText(lnh, cx0, y);
          y += 32;
        }
        y += 22;
      }

      // atributos
      const camposCheios = tipo.fields
        .filter((c) => {
          const val = note.fields[c.id];
          return Array.isArray(val) ? val.length > 0 : val !== '' && val !== undefined && val !== null;
        })
        .slice(0, 6);

      if (camposCheios.length) {
        const colW = (cw - 40) / 2;
        camposCheios.forEach((c, i) => {
          const col = i % 2;
          const x = cx0 + col * (colW + 40);
          if (col === 0 && i > 0) y += 66;
          ctx.fillStyle = '#7f7660';
          ctx.font = "800 16px 'Alegreya Sans', sans-serif";
          ctx.fillText(c.label.toUpperCase(), x, y);
          ctx.fillStyle = '#ede4d0';
          ctx.font = "500 23px 'Alegreya Sans', sans-serif";
          const rawVal = note.fields[c.id];
          const strVal = Array.isArray(rawVal) ? rawVal.join(', ') : String(rawVal || '');
          const v = linhas(ctx, strVal, colW, 1)[0] ?? '';
          ctx.fillText(v, x, y + 28);
        });
        if (camposCheios.length % 2 === 1) y += 66;
        else y += 44;
        y += 14;
      }

      // relações
      if (relacoesNota.length) {
        ctx.strokeStyle = '#3b3222';
        ctx.beginPath();
        ctx.moveTo(cx0, y);
        ctx.lineTo(cx0 + cw, y);
        ctx.stroke();
        y += 34;
        ctx.font = "600 21px 'Alegreya Sans', sans-serif";
        for (const r of relacoesNota) {
          const outroId = r.sourceId === note.id ? r.targetId : r.sourceId;
          const outra = notes.find((n) => n.id === outroId);
          if (!outra) continue;
          const saida = r.sourceId === note.id;
          ctx.fillStyle = r.color || '#d9a441';
          const prefixo = `${saida ? '→ ' : '← '}${r.label}${r.bidirectional ? ' ⇄' : ''}  `;
          ctx.fillText(prefixo, cx0, y);
          const wPref = ctx.measureText(prefixo).width;
          ctx.fillStyle = '#b3a78c';
          ctx.fillText(outra.name, cx0 + wPref, y);
          y += 30;
        }
      }

      // rodapé
      ctx.fillStyle = '#7f7660';
      ctx.font = "700 17px 'Alegreya Sans', sans-serif";
      ctx.fillText(
        `ARCANUM · códice do mestre — exportado em ${new Date().toLocaleDateString('pt-BR')}`,
        cx0,
        A - 56
      );

      setPronto(true);
    };

    void desenhar();
    return () => {
      vivo = false;
    };
  }, [note, types, folders, relations, notes, tipo]);

  const baixar = () => {
    const canvas = canvasRef.current;
    if (!canvas || !note) return;
    try {
      canvas.toBlob(
        (b) => {
          if (b && b.type.includes('webp')) {
            const url = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${slugArquivo(note.name)}.webp`;
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 5000);
            onNotify?.('Página exportada como WebP.', 'green');
          } else {
            onNotify?.('Este navegador não gerou WebP nativo.', 'ember');
          }
        },
        'image/webp',
        0.92
      );
    } catch {
      onNotify?.('Exportação bloqueada por imagem externa sem CORS.', 'ember');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="animar-modal flex max-h-[94vh] w-full max-w-3xl flex-col rounded-xl border border-linha2 bg-tinta2 shadow-2xl shadow-black/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-linha px-5 py-3.5">
          <h3 className="font-display flex items-center gap-2 text-base font-bold text-papel">
            <Icone nome="baixar" tam={17} className="text-ambar" /> Exportar página como imagem
          </h3>
          <button onClick={onClose} className="text-papel3 transition hover:text-papel">
            <Icone nome="x" tam={17} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="relative overflow-hidden rounded-lg border border-linha2">
            <canvas ref={canvasRef} width={L} height={A} className="block h-auto w-full" />
            {!pronto && (
              <div className="absolute inset-0 flex items-center justify-center bg-tinta/80">
                <p className="flex items-center gap-2 text-sm text-papel2">
                  <span className="animar-pulso inline-block h-2 w-2 rounded-full bg-ambar" />
                  gravando a página na placa…
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-linha px-5 py-3.5">
          <p className="text-[11px] text-papel3">
            Formato <b className="text-ambar">.webp</b> · {L}×{A}px · pronto para compartilhar com os jogadores
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className={CLS_BOTAO_FANTASMA}>
              Fechar
            </button>
            <button onClick={baixar} disabled={!pronto} className={`${CLS_BOTAO_AMBAR} disabled:opacity-40`}>
              <Icone nome="baixar" tam={15} /> Baixar .webp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
