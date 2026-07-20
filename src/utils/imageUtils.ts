import { getWikiConfig } from '../store';
import { resolveMediaUrl } from '../services/wiki/mediaResolver';

export const resolveImageUrl = (url: string | undefined | null): string => {
  if (!url) return '/vite.svg';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const config = getWikiConfig();
  const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  // Use resolveMediaUrl directly to support Vercel bundled images
  return resolveMediaUrl(url, repoPath);
};

export const convertImageToWebP = async (file: File, quality: number = 0.8, maxDimension: number = 800): Promise<{ base64: string, filename: string }> => {
  return new Promise((resolve, reject) => {
    // Se for um SVG, mantemos original para nao perder vetor
    const isSvg = file.type === 'image/svg+xml';
    
    const originalName = file.name;
    const lastDotIndex = originalName.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
    const finalFilename = isSvg ? originalName : `${baseName}.webp`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      if (isSvg) {
        return resolve({ base64: dataUrl, filename: finalFilename });
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
           const ratio = Math.min(maxDimension / width, maxDimension / height);
           width = Math.round(width * ratio);
           height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Não foi possível criar o contexto do Canvas para conversão."));
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export to webp
        const webpBase64 = canvas.toDataURL('image/webp', quality);
        resolve({ base64: webpBase64, filename: finalFilename });
      };
      img.onerror = () => reject(new Error("Falha ao carregar imagem para conversão."));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
    reader.readAsDataURL(file);
  });
};
