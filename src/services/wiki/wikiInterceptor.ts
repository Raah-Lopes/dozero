// intercepta requisições locais da Wiki no Vercel (Production) para servir arquivos cacheados do build
const mdFiles = import.meta.glob('../../../wikidozero/**/*.md', { query: '?raw', import: 'default' });
let isWikiInterceptorSetup = false;

export function setupWikiInterceptor() {
  if (typeof window === 'undefined' || isWikiInterceptorSetup) return;

  if (import.meta.env.PROD) {
    isWikiInterceptorSetup = true;
    console.log("[WikiInterceptor] Modo Vercel ativado: Servindo Wiki do cache interno.");
    // ponytail: bind preserva o contexto nativo sem quebrar Request objects com body streams HTTP/2
    const originalFetch = window.fetch.bind(window);

    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      // Extrai URL sem tocar no objeto Request (evita consumir body streams)
      const requestUrl =
        typeof input === 'string' ? input :
        input instanceof URL ? input.href :
        (input as Request).url;

      // Tudo que não for wiki local passa IMEDIATAMENTE sem overhead nenhum
      if (!requestUrl.includes('/api/wiki/')) {
        return originalFetch(input, init);
      }

      // ---- rotas da Wiki ----
      if (requestUrl.includes('/api/wiki/tree')) {
        const tree: any[] = [];
        const addedFolders = new Set<string>();
        Object.keys(mdFiles).forEach(p => {
          let cleanPath = p.replace('../../../wikidozero/', '');
          if (cleanPath.startsWith('./')) cleanPath = cleanPath.substring(2);
          const parts = cleanPath.split('/');
          let currentFolder = '';
          for (let i = 0; i < parts.length - 1; i++) {
            currentFolder += (currentFolder ? '/' : '') + parts[i];
            if (!addedFolders.has(currentFolder)) {
              addedFolders.add(currentFolder);
              tree.push({ path: currentFolder, type: 'tree', mode: '040000' });
            }
          }
          tree.push({ path: cleanPath, type: 'blob', mode: '100644', size: 1024 });
        });
        return Promise.resolve(new Response(JSON.stringify({ tree }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (requestUrl.includes('/api/wiki/search')) {
        const paths = Object.keys(mdFiles).map(p => {
          let cleanPath = p.replace('../../../wikidozero/', '');
          if (cleanPath.startsWith('./')) cleanPath = cleanPath.substring(2);
          return cleanPath;
        });
        return Promise.resolve(new Response(JSON.stringify({ results: paths })));
      }

      if (requestUrl.includes('/api/wiki/documents')) {
        return Promise.all(Object.entries(mdFiles).map(async ([modulePath, loader]) => ({
          path: modulePath.replace('../../../wikidozero/', '').replace(/^\.\//, ''),
          content: String(await loader()),
        }))).then(documents => new Response(JSON.stringify({ documents }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      }

      if (requestUrl.includes('/api/wiki/ignored')) {
        return Promise.resolve(new Response(JSON.stringify({ ignored: [] }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (requestUrl.includes('/api/wiki/file')) {
        const method = init?.method?.toUpperCase() ?? 'GET';
        if (method === 'GET') {
          try {
            const urlObj = new URL(requestUrl, window.location.origin);
            const reqPath = urlObj.searchParams.get('path');
            if (reqPath) {
              const normalizedPath = reqPath.replace(/\\/g, '/');
              const fullPath = `../../../wikidozero/${normalizedPath}`;
              const loader =
                mdFiles[fullPath] ??
                mdFiles[Object.keys(mdFiles).find(k => k.toLowerCase() === fullPath.toLowerCase()) ?? ''];
              if (loader) {
                return loader().then(content => new Response(JSON.stringify({ content }), {
                  headers: { 'Content-Type': 'application/json' }
                }));
              }
              return Promise.resolve(new Response('Not Found', { status: 404 }));
            }
          } catch (e) {
            console.error("[WikiInterceptor] Erro:", e);
          }
        }
      }

      return originalFetch(input, init);
    };
  }
}
