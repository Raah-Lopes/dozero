import type { Plugin } from 'vite';

export function youtubeLocalApi(): Plugin {
  return {
    name: 'youtube-local-api',
    configureServer(server) {
      console.log("[youtubeLocalApi] Middleware montado e pronto!");
      server.middlewares.use(async (req, res, next) => {
        
        const sendResponse = (status: number, data: any) => {
           res.setHeader('Content-Type', 'application/json');
           res.setHeader('Access-Control-Allow-Origin', '*');
           res.statusCode = status;
           res.end(JSON.stringify(data));
        };

        if (req.url?.startsWith('/api/yt/stream')) {
          console.log("[youtubeLocalApi] Rota /api/yt/stream acessada!");
          try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const videoId = url.searchParams.get('videoId');
            
            if (!videoId) return sendResponse(400, { error: 'Missing videoId' });

            console.log(`[youtubeLocalApi] Resolvendo vídeo: ${videoId}`);
             // Importação dinâmica para evitar problemas de compatibilidade no loader do vite.config.ts
             const ytdlModule = await import('@distube/ytdl-core');
             const ytdl = ytdlModule.default || ytdlModule;
             
             const info = await ytdl.getInfo(videoId);
             const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
             
             if (!format) return sendResponse(404, { error: 'Audio format not found' });

             return sendResponse(200, { url: format.url, title: info.videoDetails.title });
             
          } catch (err: any) {
             console.error('[YTDL] Error resolving stream:', err.message);
             return sendResponse(500, { error: err.message });
          }
        }
        
        if (req.url?.startsWith('/api/yt/playlist')) {
          // Playlists will not be natively resolved through ytdl-core here.
          // AudioEngine will just fallback to the single video.
          return sendResponse(200, { items: [] });
        }

        next();
      });
    }
  };
}
