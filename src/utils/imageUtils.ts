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

export const convertImageToWebP = async (
  file: File,
  quality: number = 0.85,
  maxDimension: number = 1024
): Promise<{ base64: string, filename: string }> => {
  return new Promise((resolve, reject) => {
    const isSvg = file.type === 'image/svg+xml';
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFilename = isSvg ? file.name : `${baseName}.webp`;

    if (isSvg) {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, filename: finalFilename });
      reader.onerror = () => reject(new Error('Falha ao ler arquivo SVG'));
      reader.readAsDataURL(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { naturalWidth: width, naturalHeight: height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const webpData = canvas.toDataURL('image/webp', quality);
        resolve({ base64: webpData, filename: finalFilename });
      } catch {
        const jpegData = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: jpegData, filename: `${baseName}.jpg` });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao decodificar imagem'));
    };

    img.src = objectUrl;
  });
};
