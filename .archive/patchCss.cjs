const fs = require('fs');
const file = 'd:/DOZERO/src/components/Wiki/wiki.css';
let css = fs.readFileSync(file, 'utf8');

const darkTheme = `

/* OVERRIDES DE CAIXAS COLORIDAS (ADMONITIONS) PARA DARK MODE */
.dozero-mdx [data-type="directive"], 
.dozero-mdx .mdxeditor-admonition {
  background-color: rgba(0, 0, 0, 0.4) !important;
  border-left: 4px solid var(--accent-primary) !important;
  color: #e2e8f0 !important;
  border-radius: 6px !important;
}

.dozero-mdx [data-type="directive"] p,
.dozero-mdx .mdxeditor-admonition p {
  color: #e2e8f0 !important;
  margin-bottom: 0 !important;
}

.dozero-mdx [data-type="directive"] strong,
.dozero-mdx .mdxeditor-admonition strong {
  color: #ffffff !important;
  font-weight: 700 !important;
}

/* Tipos específicos */
.dozero-mdx [data-type="danger"], 
.dozero-mdx .mdxeditor-admonition[data-type="danger"] {
  border-left-color: #ef4444 !important;
  background-color: rgba(239, 68, 68, 0.15) !important;
}

.dozero-mdx [data-type="info"], 
.dozero-mdx .mdxeditor-admonition[data-type="info"], 
.dozero-mdx [data-type="note"], 
.dozero-mdx .mdxeditor-admonition[data-type="note"] {
  border-left-color: #3b82f6 !important;
  background-color: rgba(59, 130, 246, 0.15) !important;
}

.dozero-mdx [data-type="warning"], 
.dozero-mdx .mdxeditor-admonition[data-type="warning"],
.dozero-mdx [data-type="caution"],
.dozero-mdx .mdxeditor-admonition[data-type="caution"] {
  border-left-color: #f59e0b !important;
  background-color: rgba(245, 158, 11, 0.15) !important;
}

.dozero-mdx [data-type="tip"], 
.dozero-mdx .mdxeditor-admonition[data-type="tip"],
.dozero-mdx [data-type="success"],
.dozero-mdx .mdxeditor-admonition[data-type="success"] {
  border-left-color: #10b981 !important;
  background-color: rgba(16, 185, 129, 0.15) !important;
}
`;

if (!css.includes('OVERRIDES DE CAIXAS COLORIDAS')) {
  fs.writeFileSync(file, css + darkTheme);
  console.log('Estilos CSS Dark Mode injetados com sucesso!');
} else {
  console.log('Estilos já estavam presentes.');
}
