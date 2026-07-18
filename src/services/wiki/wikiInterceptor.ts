// intercepta requisições locais da Wiki no Vercel (Production) para servir arquivos cacheados do build
const mdFiles = import.meta.glob('../../../wikidozero/**/*.md', { query: '?raw', import: 'default' });

export function setupWikiInterceptor() {
  if (import.meta.env.PROD) {
    console.log("[WikiInterceptor] Modo Vercel ativado: Servindo Wiki do cache interno.");
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const requestUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const options = args[1];
      
      if (typeof requestUrl === 'string' && requestUrl.includes('/api/wiki/tree')) {
        const tree: any[] = [];
        const addedFolders = new Set<string>();

        Object.keys(mdFiles).forEach(p => {
          let cleanPath = p.replace('../../../wikidozero/', '');
          if (cleanPath.startsWith('./')) cleanPath = cleanPath.substring(2);
          
          // Adiciona as pastas pais
          const parts = cleanPath.split('/');
          let currentFolder = '';
          for (let i = 0; i < parts.length - 1; i++) {
            currentFolder += (currentFolder ? '/' : '') + parts[i];
            if (!addedFolders.has(currentFolder)) {
              addedFolders.add(currentFolder);
              tree.push({ path: currentFolder, type: 'tree', mode: '040000' });
            }
          }
          
          // Adiciona o arquivo
          tree.push({ path: cleanPath, type: 'blob', mode: '100644', size: 1024 });
        });
        
        return new Response(JSON.stringify({ tree }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (typeof requestUrl === 'string' && requestUrl.includes('/api/wiki/search')) {
        const paths = Object.keys(mdFiles).map(p => {
          let cleanPath = p.replace('../../../wikidozero/', '');
          if (cleanPath.startsWith('./')) cleanPath = cleanPath.substring(2);
          return cleanPath;
        });
        return new Response(JSON.stringify({ results: paths }));
      }
      
      if (typeof requestUrl === 'string' && requestUrl.includes('/api/wiki/ignored')) {
        return new Response(JSON.stringify({ ignored: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (typeof requestUrl === 'string' && requestUrl.includes('/api/wiki/file')) {
        const method = (options && options.method) ? options.method.toUpperCase() : 'GET';
        if (method === 'GET') {
          try {
            // Em caso de chamadas relativas, adicionar origin fake para o parse funcionar
            const urlObj = new URL(requestUrl, window.location.origin);
            const reqPath = urlObj.searchParams.get('path');
            
            if (reqPath) {
              const normalizedPath = reqPath.replace(/\\/g, '/');
              const fullPath = `../../../wikidozero/${normalizedPath}`;
              
              const loader = mdFiles[fullPath];
              if (loader) {
                const content = await loader();
                return new Response(JSON.stringify({ content }), {
                  headers: { 'Content-Type': 'application/json' }
                });
              } else {
                const fallbackKey = Object.keys(mdFiles).find(k => k.toLowerCase() === fullPath.toLowerCase());
                if (fallbackKey) {
                   const content = await mdFiles[fallbackKey]();
                   return new Response(JSON.stringify({ content }), {
                     headers: { 'Content-Type': 'application/json' }
                   });
                }
                return new Response('Not Found', { status: 404 });
              }
            }
          } catch (e) {
            console.error("[WikiInterceptor] Erro no fetch customizado:", e);
          }
        }
      }

      return originalFetch(...args);
    };
  }
}
