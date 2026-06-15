import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
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
            
            const safeName = Date.now() + '_' + filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fullPath = path.join(anexosDir, safeName);
            
            fs.writeFileSync(fullPath, buffer);
            
            // Return URL that triggers our media endpoint
            return sendResponse(200, { url: `http://localhost:5174/api/wiki/media?repoPath=${encodeURIComponent(repoPath)}&path=ANEXOS/${safeName}` });
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
