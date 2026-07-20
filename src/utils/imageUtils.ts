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
  quality: number = 0.9,
  maxDimension: number = 1024
): Promise<{ base64: string, filename: string }> => {
  return new Promise((resolve, reject) => {
    // SVGs keep their original format (no raster conversion)
    const isSvg = file.type === 'image/svg+xml';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const finalFilename = isSvg ? file.name : `${baseName}.webp`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (isSvg) return resolve({ base64: dataUrl, filename: finalFilename });

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ base64: canvas.toDataURL('image/webp', quality), filename: finalFilename });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
