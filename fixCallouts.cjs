const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Mapeamento de blocos de estilo do Obsidian para o Padrão MDX (Admonitions)
  // O regex precisa lidar com linhas de corpo que podem ou não começar com ">" (devido a edições anteriores)
  // Vamos buscar por > [!type]- Title e pegar tudo até encontrar outra tag ou quebra dupla forte.
  // Uma abordagem mais segura:
  const blocks = [
    { obs: 'quote', std: 'info' },
    { obs: 'warning', std: 'warning' },
    { obs: 'info', std: 'note' },
    { obs: 'success', std: 'tip' }
  ];

  blocks.forEach(({obs, std}) => {
    // Busca `> [!tipo]` e substitui por `:::tipo`
    // Tira os `> ` de todas as linhas que vierem depois, até encontrar uma linha em branco ou o fim do arquivo.
    
    // Uma forma iterativa linha a linha é mais segura
    const lines = content.split('\n');
    let insideBlock = false;
    let newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const matchHeader = line.match(/^>\s*\[!([a-zA-Z]+)\]-?\s*(.*)/);
      
      if (matchHeader) {
        if (insideBlock) {
          newLines.push(':::'); // Fecha bloco anterior se colidir
        }
        insideBlock = true;
        let type = matchHeader[1].toLowerCase();
        let title = matchHeader[2].trim();
        
        // Converte o tipo
        if (type === 'quote') type = 'info';
        if (type === 'success') type = 'tip';
        if (type === 'info') type = 'note';
        
        newLines.push(`:::${type}[${title}]`);
        continue;
      }
      
      if (insideBlock) {
        // Se a linha começar com >, a gente limpa
        if (line.trim().startsWith('>')) {
          newLines.push(line.replace(/^>\s?/, ''));
        } else if (line.trim() === '') {
          // Linha em branco fecha o bloco callout se for dupla? No Obsidian linha em branco quebra o bloco se não tiver >
          newLines.push(line);
          // Vamos olhar a próxima linha, se ela não começar com >, a gente fecha o bloco
          if (i + 1 < lines.length && !lines[i+1].trim().startsWith('>') && lines[i+1].trim() !== '') {
            newLines.push(':::');
            insideBlock = false;
          }
        } else {
           // Linha sem > no meio do bloco (como as listas que colocamos)
           newLines.push(line);
           // Se a próxima linha for div ou h1 ou ---, fechamos.
           if (i + 1 < lines.length && (lines[i+1].trim().startsWith('<div') || lines[i+1].startsWith('---') || lines[i+1].startsWith('> [!'))) {
             newLines.push(':::');
             insideBlock = false;
           }
        }
      } else {
        newLines.push(line);
      }
    }
    
    if (insideBlock) {
      newLines.push(':::');
    }
    content = newLines.join('\n');
  });

  fs.writeFileSync(file, content);
}

try {
  processFile('d:/DOZERO/src/services/ai/prompts/rpgPrompts.ts');
  processFile('d:/DOZERO/wikidozero/[1] 🏕️ Campanha Principal/Fichas/Jogadores/Jacir Malemog.md');
  console.log('Migração de Callouts Finalizada!');
} catch(e) {
  console.error(e);
}
