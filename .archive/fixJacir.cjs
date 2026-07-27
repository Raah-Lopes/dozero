const fs = require('fs');
const file = 'd:/DOZERO/wikidozero/[1] 🏕️ Campanha Principal/Fichas/Jogadores/Jacir Malemog.md';
let content = fs.readFileSync(file, 'utf8');

// The file has blocks like:
// > \[!quote]- Interpretação e Lore
// > **Nome Completo:** Jacir Malemog "O Brega Elástico" | **Imagem:** ...
// 
// and so on. We want to convert them to :::info[Interpretação e Lore] ... :::

function replaceBlock(content, regex, newType) {
  return content.replace(regex, (match) => {
    // extract the title (the part after the header)
    const lines = match.split('\n');
    const headerLine = lines[0];
    const titleMatch = headerLine.match(/> \\?\[![a-z]+\]-?\s*(.*)/i);
    const title = titleMatch ? titleMatch[1] : '';

    const cleanLines = lines.slice(1).map(l => l.replace(/^>\s?/, ''));
    return `\n:::${newType}[${title}]\n` + cleanLines.join('\n') + `\n:::\n`;
  });
}

content = replaceBlock(content, /> \\?\[!quote\]- [^\n]*\n(?:> [^\n]*\n?)*(?=\n> \\?\[!|$)/i, 'info');
content = replaceBlock(content, /> \\?\[!warning\]- [^\n]*\n(?:> [^\n]*\n?)*(?=\n> \\?\[!|$)/i, 'warning');
content = replaceBlock(content, /> \\?\[!info\]- [^\n]*\n(?:> [^\n]*\n?)*(?=\n> \\?\[!|$)/i, 'note');
content = replaceBlock(content, /> \\?\[!success\] [^\n]*\n(?:> [^\n]*\n?)*/i, 'tip');

fs.writeFileSync(file, content);
console.log('Jacir Fixed!');

// Also fix rpgPrompts.ts
const file2 = 'd:/DOZERO/src/services/ai/prompts/rpgPrompts.ts';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = replaceBlock(content2, /> \\?\[!quote\]- [^\n]*\n(?:> [^\n]*\n?)*(?=\n> \\?\[!|\n<div|$)/i, 'info');
content2 = replaceBlock(content2, /> \\?\[!warning\]- [^\n]*\n(?:> [^\n]*\n?)*(?=\n> \\?\[!|\n<div|$)/i, 'warning');
content2 = replaceBlock(content2, /> \\?\[!info\]- [^\n]*\n(?:> [^\n]*\n?)*(?=\n> \\?\[!|\n<div|$)/i, 'note');
content2 = replaceBlock(content2, /> \\?\[!success\] [^\n]*\n(?:> [^\n]*\n?)*/i, 'tip');
fs.writeFileSync(file2, content2);
console.log('rpgPrompts Fixed!');
