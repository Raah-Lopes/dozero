const fs = require('fs');
const file = 'd:/DOZERO/src/index.css';
let css = fs.readFileSync(file, 'utf8');

const patch = `

/* FORÇA BRUTA: CAIXAS COLORIDAS DARK MODE */
.mdxeditor-root [data-type="directive"], 
.mdxeditor-root .mdxeditor-admonition,
.mdxeditor-root [data-mdx-directive] {
  background-color: rgba(0, 0, 0, 0.6) !important;
  border-left: 4px solid var(--accent-primary) !important;
  color: #e2e8f0 !important;
  border-radius: 6px !important;
}

.mdxeditor-root [data-type="directive"] p,
.mdxeditor-root .mdxeditor-admonition p,
.mdxeditor-root [data-mdx-directive] p {
  color: #e2e8f0 !important;
  margin-bottom: 0 !important;
}

.mdxeditor-root [data-type="directive"] strong,
.mdxeditor-root .mdxeditor-admonition strong,
.mdxeditor-root [data-mdx-directive] strong {
  color: #ffffff !important;
  font-weight: 700 !important;
}

.mdxeditor-root [data-type="danger"], 
.mdxeditor-root .mdxeditor-admonition[data-type="danger"],
.mdxeditor-root [data-mdx-directive="danger"] {
  border-left-color: #ef4444 !important;
  background-color: rgba(239, 68, 68, 0.25) !important;
}

.mdxeditor-root [data-type="info"], 
.mdxeditor-root .mdxeditor-admonition[data-type="info"], 
.mdxeditor-root [data-type="note"], 
.mdxeditor-root .mdxeditor-admonition[data-type="note"],
.mdxeditor-root [data-mdx-directive="info"],
.mdxeditor-root [data-mdx-directive="note"] {
  border-left-color: #3b82f6 !important;
  background-color: rgba(59, 130, 246, 0.25) !important;
}

.mdxeditor-root [data-type="warning"], 
.mdxeditor-root .mdxeditor-admonition[data-type="warning"],
.mdxeditor-root [data-type="caution"],
.mdxeditor-root .mdxeditor-admonition[data-type="caution"],
.mdxeditor-root [data-mdx-directive="warning"],
.mdxeditor-root [data-mdx-directive="caution"] {
  border-left-color: #f59e0b !important;
  background-color: rgba(245, 158, 11, 0.25) !important;
}

.mdxeditor-root [data-type="tip"], 
.mdxeditor-root .mdxeditor-admonition[data-type="tip"],
.mdxeditor-root [data-type="success"],
.mdxeditor-root .mdxeditor-admonition[data-type="success"],
.mdxeditor-root [data-mdx-directive="tip"],
.mdxeditor-root [data-mdx-directive="success"] {
  border-left-color: #10b981 !important;
  background-color: rgba(16, 185, 129, 0.25) !important;
}
`;

if (!css.includes('FORÇA BRUTA: CAIXAS COLORIDAS DARK MODE')) {
  fs.writeFileSync(file, css + patch);
  console.log('Força Bruta do Dark Mode aplicada com sucesso no index.css!');
} else {
  console.log('Estilos Força Bruta já estavam no index.css.');
}
