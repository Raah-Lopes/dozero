const fs = require('fs');
const file = 'd:/DOZERO/src/services/ai/prompts/rpgPrompts.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /```dataviewjs[\s\S]*?```/g;

const replacement = `<div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px;">
  <img src="\`INPUT[text:imagem]\`" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #10b981; box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 10px;" />
  <h1 style="margin: 0; font-size: 2.2em; font-weight: bold;">👤 \`INPUT[text:nome_completo]\`</h1>
</div>`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Migração concluída com sucesso!');
