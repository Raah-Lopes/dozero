import { TheaterScene } from '../../store';

export function exportSceneAsMarkdown(scene: TheaterScene) {
  // Cria o bloco JSON oculto
  const jsonBlock = `<!-- SCENE_DATA_START -->\n\`\`\`json\n${JSON.stringify(scene, null, 2)}\n\`\`\`\n<!-- SCENE_DATA_END -->`;

  // Cria o markdown visualmente agradável
  let md = `# ${scene.title}\n`;
  if (scene.subtitle) md += `**${scene.subtitle}**\n`;
  md += `\n*Clima: ${scene.weather} | Atmosfera: ${scene.mood} | Horário: ${scene.timeOfDay}*\n\n`;
  
  if (scene.description) {
    md += `## Descrição\n${scene.description}\n\n`;
  }

  if (scene.objectives && scene.objectives.length > 0) {
    md += `## Objetivos\n`;
    scene.objectives.forEach(obj => {
      const check = obj.completed ? '[x]' : '[ ]';
      const secret = obj.secret ? ' (Secreto)' : '';
      md += `- ${check} ${obj.text}${secret}\n`;
    });
    md += `\n`;
  }

  if (scene.assets && scene.assets.length > 0) {
    md += `## Elementos Visuais\n`;
    scene.assets.forEach(asset => {
      md += `- **${asset.title}** (${asset.type})\n`;
    });
    md += `\n`;
  }

  md += `---\n\n> *Os dados técnicos desta cena estão ocultos abaixo para importação no DOZERO.*\n\n${jsonBlock}\n`;

  // Baixa o arquivo
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${scene.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cena'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importSceneFromMarkdown(file: File): Promise<TheaterScene> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const match = text.match(/<!-- SCENE_DATA_START -->\s*```json\n([\s\S]*?)\n```\s*<!-- SCENE_DATA_END -->/);
      if (match && match[1]) {
        try {
          const scene = JSON.parse(match[1]) as TheaterScene;
          // Ensure new ID to avoid collisions
          scene.id = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          resolve(scene);
        } catch (err) {
          reject(new Error('JSON da cena inválido ou corrompido no arquivo.'));
        }
      } else {
        reject(new Error('Arquivo não contém dados de cena exportados do DOZERO.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsText(file);
  });
}
