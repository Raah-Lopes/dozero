const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/index.css');

const newCss = `
/* --- VIRTUAL & GOLD CORE THEME STYLES --- */

/* Textos Metálicos (Gold) */
.text-gold {
  background: var(--gradient-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  text-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
  font-weight: 800;
  letter-spacing: 1px;
}

/* Painel Neon (NextGen) */
.panel-neon-red {
  background: var(--bg-primary);
  border: 2px solid var(--glass-border-highlight);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-md);
  position: relative;
  overflow: hidden;
}

/* Efeito Holográfico */
@keyframes scanlines {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

@keyframes glitch-anim {
  0% { clip-path: inset(10% 0 80% 0); }
  20% { clip-path: inset(80% 0 5% 0); }
  40% { clip-path: inset(30% 0 40% 0); }
  60% { clip-path: inset(50% 0 10% 0); }
  80% { clip-path: inset(5% 0 70% 0); }
  100% { clip-path: inset(90% 0 2% 0); }
}

.holo-box {
  background: rgba(239, 68, 68, 0.15); /* Vermelho holográfico translúcido */
  border: 1px solid rgba(239, 68, 68, 0.6);
  border-left: 4px solid var(--danger);
  border-right: 4px solid var(--danger);
  box-shadow: 0 0 25px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.2);
  position: relative;
  overflow: hidden;
  border-radius: 4px;
}

.holo-box::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 100%;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0%,
    rgba(239, 68, 68, 0.1) 1%,
    transparent 2%
  );
  animation: scanlines 4s linear infinite;
  pointer-events: none;
}

.holo-box.holo-critical {
  animation: glitch-anim 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 3;
}

.btn-gold {
  background: linear-gradient(to bottom, #fde047, #d97706);
  border: 1px solid #f59e0b;
  color: #0f172a !important; /* Texto escuro contrasta com ouro */
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
  transition: all 0.3s ease;
}

.btn-gold:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.6);
  filter: brightness(1.1);
}
`;

fs.appendFileSync(cssPath, newCss, 'utf8');
console.log('Appended Virtual & Gold styles to index.css');
