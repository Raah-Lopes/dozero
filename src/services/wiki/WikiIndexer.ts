import type { WikiEntry } from './WikiQuery';
import { getWikiConfig } from '../../store';

function parseFrontmatter(content: string) {
  const trimmed = content.trim();
  // Aceita ---, ***, ou vários hífens no início e fim, ignorando espaços em branco residuais na linha
  const match = trimmed.match(/^(?:---|[*]{3,}|[-]{3,})[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|[*]{3,}|[-]{3,})[ \t]*\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: trimmed };
  
  const yamlText = match[1];
  const markdownContent = match[2];
  
  const data: Record<string, any> = {};
  yamlText.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      let key = line.slice(0, colonIdx).trim().replace(/\\_/g, '_');
      let val = line.slice(colonIdx + 1).trim();
      
      // Remove possíveis escapes de chaves inseridos pelo editor Markdown
      val = val.replace(/\\\[/g, '[').replace(/\\\]/g, ']').replace(/\\_/g, '_');
      
      if (val.startsWith('[') && val.endsWith(']')) {
        data[key] = val.slice(1, -1).split(',').map(s => s.trim());
      } else {
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!isNaN(Number(val)) && val !== '') {
           data[key] = Number(val);
        } else {
           data[key] = val;
        }
      }
    }
  });
  
  return { data, content: markdownContent };
}

export class WikiIndexer {
  private static index: WikiEntry[] | null = null;

  static async buildIndex(): Promise<WikiEntry[]> {
    if (this.index) {
      return this.index;
    }

    const entries: WikiEntry[] = [];
    const config = getWikiConfig();
    const repoPath = config.repoUrl; // ex: D:/wikidozero

    try {
      // Faz a busca na API local do projeto configurada no vite-plugins
      const res = await fetch(`http://localhost:5174/api/wiki/search?q=.md&repoPath=${encodeURIComponent(repoPath)}`);
      if (!res.ok) throw new Error('Falha ao buscar arquivos da API local');
      
      const data = await res.json();
      const files: string[] = data.results || [];

      // Carrega os arquivos via API para extrair o Frontmatter (gray-matter)
      // Como estamos no localhost, essas requisições são na velocidade do disco rígido
      for (const filePath of files) {
        if (!filePath.endsWith('.md')) continue;
        if (filePath.toLowerCase().includes('readme.md')) continue;

        try {
          const fileRes = await fetch(`http://localhost:5174/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(filePath)}`);
          if (!fileRes.ok) continue;
          
          const fileData = await fileRes.json();
          const rawContent = fileData.content;
          
          const parsed = parseFrontmatter(rawContent);

          const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
          const slug = filename.replace(/\.md$/i, '');

          entries.push({
            path: filePath, // guardamos o relativePath devolvido pela API
            slug,
            metadata: parsed.data || {}
          });
        } catch (err) {
          console.error(`[WikiIndexer] Erro ao ler arquivo ${filePath}:`, err);
        }
      }

    } catch (err) {
      console.error('[WikiIndexer] Erro ao conectar na API local da wiki:', err);
    }

    this.index = entries;
    return this.index;
  }

  static async loadFileContent(path: string): Promise<string | null> {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl;

      const fileRes = await fetch(`http://localhost:5174/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(path)}`);
      if (!fileRes.ok) return null;
      
      const fileData = await fileRes.json();
      const rawContent = fileData.content;
      
      const parsed = parseFrontmatter(rawContent);
      return parsed.content; // O texto puro
    } catch (err) {
      console.error(`[WikiIndexer] Erro ao carregar conteúdo de ${path} da API:`, err);
      return null;
    }
  }
}
