export const convertImageToWebP = async (file: File, quality: number = 0.8): Promise<{ base64: string, filename: string }> => {
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
      
      if (isSvg || file.type === 'image/webp') {
        // Já é webp ou svg, devolvemos como está
        return resolve({ base64: dataUrl, filename: finalFilename });
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Não foi possível criar o contexto do Canvas para conversão."));
        }
        ctx.drawImage(img, 0, 0);
        
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
