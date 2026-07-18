const mediaFiles = import.meta.glob('../../../wikidozero/ANEXOS/*.{png,jpg,jpeg,gif,webp}', { eager: true, import: 'default' });

export function resolveMediaUrl(mediaPath: string, repoPath: string): string {
  if (!mediaPath) return '';
  
  // Se o mediaPath tiver localhost cravado (ex: tokens antigos inseridos pelo PC), extrai só o caminho real (ex: ANEXOS/foto.webp)
  if (mediaPath.includes('localhost:') && mediaPath.includes('path=')) {
    const match = mediaPath.match(/path=([^&]+)/);
    if (match) {
      mediaPath = decodeURIComponent(match[1]);
    }
  }
  
  if (import.meta.env.PROD) {
    // Resolvemos do pacote bundlado pelo Vite
    const fileName = mediaPath.split('/').pop() || mediaPath.split('\\').pop() || '';
    
    const key = Object.keys(mediaFiles).find(k => k.toLowerCase().endsWith('/' + fileName.toLowerCase()));
    if (key) {
      return mediaFiles[key] as string;
    }
    
    // Se não achou na pasta ANEXOS, apenas retorna o path (pode ser uma URL externa)
    return mediaPath;
  } else {
    // Modo de Desenvolvimento (usa a API local Vite)
    return `/api/wiki/media?path=${encodeURIComponent(mediaPath)}&repoPath=${encodeURIComponent(repoPath)}&t=${Date.now()}`;
  }
}
