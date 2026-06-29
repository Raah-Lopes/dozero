const fs = require('fs');
const file = 'd:/DOZERO/src/index.css';
let css = fs.readFileSync(file, 'utf8');

const patch = `

/* FORÇA BRUTA 2: CAIXAS ESCURAS SÓLIDAS */
.mdxeditor [data-type="directive"], 
.mdxeditor .mdxeditor-admonition,
.mdxeditor [data-mdx-directive],
.mdxeditor .danger, .mdxeditor .info, .mdxeditor .note, .mdxeditor .tip, .mdxeditor .caution, .mdxeditor .warning, .mdxeditor .success,
.mdxeditor .admonition {
  background-color: #1e293b !important; /* Slate 800 - Fundo bem escuro e sólido */
  color: #f1f5f9 !important;
  border-radius: 6px !important;
  border: 1px solid #334155 !important;
  border-left-width: 4px !important;
  padding: 1rem !important;
  margin-top: 1rem !important;
  margin-bottom: 1rem !important;
}

.mdxeditor [data-type="directive"] p,
.mdxeditor .mdxeditor-admonition p,
.mdxeditor [data-mdx-directive] p,
.mdxeditor .danger p, .mdxeditor .info p, .mdxeditor .note p, .mdxeditor .tip p, .mdxeditor .caution p, .mdxeditor .admonition p {
  color: #e2e8f0 !important;
}

.mdxeditor [data-type="directive"] strong,
.mdxeditor .mdxeditor-admonition strong,
.mdxeditor [data-mdx-directive] strong,
.mdxeditor .danger strong, .mdxeditor .info strong, .mdxeditor .note strong, .mdxeditor .tip strong, .mdxeditor .caution strong, .mdxeditor .admonition strong {
  color: #ffffff !important;
  font-weight: bold !important;
}

/* Cores das Bordas */
.mdxeditor .danger, .mdxeditor .admonition-danger, .mdxeditor [data-type="danger"], .mdxeditor [data-mdx-directive="danger"] {
  border-left-color: #ef4444 !important;
}
.mdxeditor .info, .mdxeditor .note, .mdxeditor .admonition-info, .mdxeditor .admonition-note, .mdxeditor [data-type="info"], .mdxeditor [data-mdx-directive="info"], .mdxeditor [data-type="note"], .mdxeditor [data-mdx-directive="note"] {
  border-left-color: #3b82f6 !important;
}
.mdxeditor .warning, .mdxeditor .caution, .mdxeditor .admonition-warning, .mdxeditor .admonition-caution, .mdxeditor [data-type="warning"], .mdxeditor [data-mdx-directive="warning"], .mdxeditor [data-type="caution"], .mdxeditor [data-mdx-directive="caution"] {
  border-left-color: #f59e0b !important;
}
.mdxeditor .tip, .mdxeditor .success, .mdxeditor .admonition-tip, .mdxeditor .admonition-success, .mdxeditor [data-type="tip"], .mdxeditor [data-mdx-directive="tip"], .mdxeditor [data-type="success"], .mdxeditor [data-mdx-directive="success"] {
  border-left-color: #10b981 !important;
}
`;

if (!css.includes('FORÇA BRUTA 2: CAIXAS ESCURAS SÓLIDAS')) {
  fs.writeFileSync(file, css + patch);
  console.log('Força Bruta 2 injetada!');
} else {
  console.log('Força Bruta 2 já injetada!');
}
