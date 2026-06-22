import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import https from 'https';
import http from 'http';
import type { Plugin } from 'vite';

// Helper to build tree like GitHub's API
function buildFsTree(dir: string, baseDir: string, tree: any[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === '.git' || file === 'node_modules') continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    
    if (stat.isDirectory()) {
      tree.push({ path: relativePath, type: 'tree', mode: '040000' });
      buildFsTree(fullPath, baseDir, tree);
    } else {
      tree.push({ path: relativePath, type: 'blob', mode: '100644', size: stat.size });
    }
}
  return tree;
}

// Helper to build graph data
function buildGraph(dir: string, baseDir: string, nodes: any[] = [], links: any[] = []) {
  if (!fs.existsSync(dir)) return { nodes, links };
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === '.git' || file === 'node_modules' || file === 'ANEXOS') continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      buildGraph(fullPath, baseDir, nodes, links);
    } else if (file.endsWith('.md')) {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const id = relativePath;
      const name = file.replace('.md', '');
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Buscar avatar (primeira imagem)
      let avatar = null;
      const imgRegex = /!\[.*?\]\((.*?)\)|!\[\[(.*?)\]\]/;
      const imgMatch = imgRegex.exec(content);
      if (imgMatch) {
        let extracted = imgMatch[1] || imgMatch[2];
        if (extracted) {
          avatar = extracted.replace(/\\/g, '').split('|')[0].trim();
        }
      }

      nodes.push({ id, name, path: relativePath, group: path.dirname(relativePath), avatar });
      
      // MDXEditor pode escapar os colchetes gerando \[\[nome\]\]
      // Regex captura opcionalmente "Rótulo::" antes do link
      const regex = /(?:([^\[\]\n]+?)\s*::\s*)?(?:\\?\[){2}(.*?)(?:\\?\]){2}/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        let label = match[1] ? match[1].trim() : undefined;
        let targetName = match[2].split('|')[0]; // Handle [[Target|Alias]]
        targetName = targetName.split('#')[0]; // Handle [[Target#Section]]
        links.push({ source: id, target: targetName.trim(), label });
      }
    }
  }
  return { nodes, links };
}

export function wikiLocalApi(): Plugin {
  return {
    name: 'wiki-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/wiki')) return next();

        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        
        const sendResponse = (status: number, data: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.statusCode = status;
          res.end(JSON.stringify(data));
        };

        // Parse JSON body if POST/PUT
        let body: any = {};
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
          let bodyStr = '';
          for await (const chunk of req) {
            bodyStr += chunk;
          }
          if (bodyStr) {
            try { body = JSON.parse(bodyStr); } catch (e) {}
          }
        }

        const repoPath = url.searchParams.get('repoPath') || body.repoPath;
        if (!repoPath || !fs.existsSync(repoPath)) {
          return sendResponse(404, { error: `Pasta não encontrada: ${repoPath}` });
        }

        try {
          if (req.method === 'GET' && pathname === '/api/wiki/tree') {
            const tree = buildFsTree(repoPath, repoPath);
            return sendResponse(200, { tree });
          }

          if (req.method === 'POST' && pathname === '/api/wiki/open') {
            const filepath = body.path || '';
            const full = path.join(repoPath, filepath);
            
            if (!fs.existsSync(full)) return sendResponse(404, { error: 'folder not found' });

            const command = process.platform === 'win32' ? `start "" "${full}"` :
                            process.platform === 'darwin' ? `open "${full}"` :
                            `xdg-open "${full}"`;

            exec(command, (error) => {
               if (error) console.error('Failed to open folder:', error);
            });
            return sendResponse(200, { success: true });
          }

          if (req.method === 'GET' && pathname === '/api/wiki/graph') {
            const graphData = buildGraph(repoPath, repoPath);
            return sendResponse(200, graphData);
          }
          
          if (req.method === 'GET' && pathname === '/api/wiki/file') {
            const filepath = url.searchParams.get('path');
            if (!filepath) return sendResponse(400, { error: 'path required' });
            const full = path.join(repoPath, filepath);
            if (!fs.existsSync(full)) return sendResponse(404, { error: 'file not found' });
            
            const content = fs.readFileSync(full, 'utf-8');
            return sendResponse(200, { content });
          }

          if (req.method === 'GET' && pathname === '/api/wiki/raw') {
            const filepath = url.searchParams.get('path');
            if (!filepath) return sendResponse(400, { error: 'path required' });
            const full = path.join(repoPath, filepath);
            if (!fs.existsSync(full)) return sendResponse(404, { error: 'file not found' });
            
            const ext = path.extname(full).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', 
              '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'
            };
            
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            return fs.createReadStream(full).pipe(res);
          }

          if (req.method === 'GET' && pathname === '/api/proxy') {
            const targetUrl = url.searchParams.get('url');
            if (!targetUrl) return sendResponse(400, { error: 'url required' });
            
            try {
              const parsedUrl = new URL(targetUrl);
              const lib = parsedUrl.protocol === 'https:' ? https : http;
              
              const proxyReq = lib.request(parsedUrl, {
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Referer': parsedUrl.origin
                }
              }, (proxyRes) => {
                res.writeHead(proxyRes.statusCode || 200, {
                  'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
                  'Access-Control-Allow-Origin': '*',
                  'Cache-Control': 'public, max-age=31536000'
                });
                proxyRes.pipe(res);
              });
              
              proxyReq.on('error', (e) => {
                console.error('Proxy error:', e);
                sendResponse(500, { error: 'Proxy falhou' });
              });
              
              proxyReq.end();
              return;
            } catch (e) {
              return sendResponse(400, { error: 'Invalid URL' });
            }
          }

          if (req.method === 'GET' && pathname === '/api/wiki/search') {
            const query = url.searchParams.get('q');
            if (!query) return sendResponse(400, { error: 'query required' });
            
            const results: string[] = [];
            const queryLower = query.toLowerCase();
            
            function searchRecursive(dir: string) {
              if (!fs.existsSync(dir)) return;
              const files = fs.readdirSync(dir);
              for (const file of files) {
                if (file === '.git' || file === 'node_modules' || file === 'ANEXOS') continue;
                const fullP = path.join(dir, file);
                const stat = fs.statSync(fullP);
                if (stat.isDirectory()) {
                  searchRecursive(fullP);
                } else if (file.endsWith('.md')) {
                  const content = fs.readFileSync(fullP, 'utf-8');
                  if (content.toLowerCase().includes(queryLower) || file.toLowerCase().includes(queryLower)) {
                    const relativePath = path.relative(repoPath, fullP).replace(/\\/g, '/');
                    results.push(relativePath);
                  }
                }
              }
            }
            
            searchRecursive(repoPath);
            return sendResponse(200, { results });
          }

          if (req.method === 'POST' && pathname === '/api/wiki/init') {
            const templatePath = path.resolve('template_wiki');
            if (!fs.existsSync(templatePath)) return sendResponse(500, { error: 'Template folder not found' });
            
            function copyRecursiveSync(src: string, dest: string) {
              const exists = fs.existsSync(src);
              const stats = exists && fs.statSync(src);
              if (stats && stats.isDirectory()) {
                if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
                fs.readdirSync(src).forEach((childItemName) => {
                  copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
                });
              } else {
                fs.copyFileSync(src, dest);
              }
            }

            try {
              if (!fs.existsSync(repoPath)) fs.mkdirSync(repoPath, { recursive: true });
              copyRecursiveSync(templatePath, repoPath);
              return sendResponse(200, { success: true });
            } catch (e: any) {
              return sendResponse(500, { error: e.message });
            }
          }

          if (req.method === 'POST' && pathname === '/api/wiki/save') {
            const filepath = body.path;
            const content = body.content;
            if (!filepath || content === undefined) return sendResponse(400, { error: 'path and content required' });
            
            const full = path.join(repoPath, filepath);
            const dir = path.dirname(full);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(full, content, 'utf-8');
            return sendResponse(200, { success: true });
          }

          if (req.method === 'POST' && pathname === '/api/wiki/folder') {
            const folderpath = body.path;
            if (!folderpath) return sendResponse(400, { error: 'path required' });
            
            const full = path.join(repoPath, folderpath);
            if (!fs.existsSync(full)) {
              fs.mkdirSync(full, { recursive: true });
            }
            return sendResponse(200, { success: true });
          }

          if (req.method === 'POST' && pathname === '/api/wiki/move') {
            const oldPath = body.oldPath;
            const newPath = body.newPath;
            if (!oldPath || !newPath) return sendResponse(400, { error: 'oldPath and newPath required' });
            
            const fullOld = path.join(repoPath, oldPath);
            const fullNew = path.join(repoPath, newPath);
            
            if (!fs.existsSync(fullOld)) {
              return sendResponse(404, { error: 'Source not found' });
            }
            
            const dirNew = path.dirname(fullNew);
            if (!fs.existsSync(dirNew)) fs.mkdirSync(dirNew, { recursive: true });
            
            fs.renameSync(fullOld, fullNew);
            return sendResponse(200, { success: true });
          }

          if (req.method === 'POST' && pathname === '/api/wiki/rename') {
            const { oldPath, newName } = body;
            const repo = body.repoPath || url.searchParams.get('repoPath');
            if (!oldPath || !newName || !repo) return sendResponse(400, { error: 'Missing parameters' });
            
            const oldFull = path.join(repo, oldPath);
            if (!fs.existsSync(oldFull)) return sendResponse(404, { error: 'File not found' });
            
            const dir = path.dirname(oldFull);
            const newFull = path.join(dir, newName.endsWith('.md') ? newName : newName + '.md');
            
            fs.renameSync(oldFull, newFull);
            
            const oldBaseName = path.basename(oldPath, '.md');
            const newBaseName = path.basename(newFull, '.md');
            
            function updateLinksRecursive(directory: string) {
              const files = fs.readdirSync(directory);
              for (const file of files) {
                if (file === '.git' || file === 'node_modules' || file === 'ANEXOS') continue;
                const fullP = path.join(directory, file);
                const stat = fs.statSync(fullP);
                if (stat.isDirectory()) {
                  updateLinksRecursive(fullP);
                } else if (file.endsWith('.md')) {
                  let content = fs.readFileSync(fullP, 'utf-8');
                  const regex = /(?:\\?\[){2}(.*?)(?:\\?\]){2}/g;
                  let modified = false;
                  
                  const newContent = content.replace(regex, (match, inner) => {
                    let parts = inner.split('|');
                    let target = parts[0];
                    let alias = parts[1];
                    let cleanTarget = target.trim();
                    if (cleanTarget.toLowerCase().endsWith('.md')) cleanTarget = cleanTarget.slice(0, -3);
                    
                    if (cleanTarget.toLowerCase() === oldBaseName.toLowerCase()) {
                       modified = true;
                       let newInner = newBaseName;
                       if (alias) newInner += '|' + alias;
                       
                       if (match.startsWith('\\[')) return `\\[\\[${newInner}\\]\\]`;
                       return `[[${newInner}]]`;
                    }
                    return match;
                  });

                  if (modified) fs.writeFileSync(fullP, newContent);
                }
              }
            }
            
            updateLinksRecursive(repo);
            return sendResponse(200, { success: true });
          }

          if (req.method === 'DELETE' && pathname === '/api/wiki/file') {
            const filepath = body.path;
            if (!filepath) return sendResponse(400, { error: 'path required' });
            
            const full = path.join(repoPath, filepath);
            if (fs.existsSync(full)) {
               const stat = fs.statSync(full);
               if (stat.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
               else fs.unlinkSync(full);
            }
            return sendResponse(200, { success: true });
          }

          if (req.method === 'POST' && pathname === '/api/wiki/push') {
            // exec git push
            const cmd = `git add . && git commit -m "Wiki update via DOZERO" && git push origin main`;
            exec(cmd, { cwd: repoPath }, (error, stdout, stderr) => {
              if (error) {
                 return sendResponse(500, { error: error.message, stderr });
              }
              return sendResponse(200, { success: true, stdout });
            });
            return; // Wait for callback
          }

          if (req.method === 'POST' && pathname === '/api/wiki/save-image') {
            const { filename, base64 } = body;
            if (!filename || !base64) return sendResponse(400, { error: 'filename and base64 required' });
            
            const anexosDir = path.join(repoPath, 'ANEXOS');
            if (!fs.existsSync(anexosDir)) fs.mkdirSync(anexosDir, { recursive: true });
            
            // Remove data:image/png;base64, prefix
            const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Deduplicação Inteligente: Verifica se a imagem exata já existe
            const files = fs.readdirSync(anexosDir);
            for (const file of files) {
              const existingPath = path.join(anexosDir, file);
              const stat = fs.statSync(existingPath);
              // Para máxima performance, primeiro comparamos o tamanho em bytes
              if (stat.size === buffer.length) {
                const existingBuffer = fs.readFileSync(existingPath);
                if (existingBuffer.equals(buffer)) {
                  // A imagem é idêntica! Não criamos duplicata, apenas retornamos o link existente.
                  return sendResponse(200, { url: `http://localhost:5174/api/wiki/media?repoPath=${encodeURIComponent(repoPath)}&path=ANEXOS/${file}` });
                }
              }
            }
            
            const baseSafeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            let finalSafeName = baseSafeName;
            let fullPath = path.join(anexosDir, finalSafeName);
            
            let counter = 1;
            const ext = path.extname(baseSafeName);
            const base = path.basename(baseSafeName, ext);
            
            while (fs.existsSync(fullPath)) {
              finalSafeName = `${base}_${counter}${ext}`;
              fullPath = path.join(anexosDir, finalSafeName);
              counter++;
            }
            
            fs.writeFileSync(fullPath, buffer);
            
            // Return URL that triggers our media endpoint (using relative path to avoid localhost network issues)
            return sendResponse(200, { url: `/api/wiki/media?repoPath=${encodeURIComponent(repoPath)}&path=ANEXOS/${finalSafeName}` });
          }

          if (req.method === 'GET' && pathname === '/api/wiki/media') {
            const filepath = url.searchParams.get('path');
            if (!filepath) return sendResponse(400, { error: 'path required' });
            
            const full = path.join(repoPath, filepath);
            if (!fs.existsSync(full)) return sendResponse(404, { error: 'file not found' });
            
            const ext = path.extname(full).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.webp': 'image/webp'
            };
            
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            const stream = fs.createReadStream(full);
            stream.pipe(res);
            return;
          }

          sendResponse(404, { error: 'Route not found' });
        } catch (e: any) {
          sendResponse(500, { error: e.message });
        }
      });
    }
  };
}
