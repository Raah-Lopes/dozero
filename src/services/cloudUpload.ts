const IMGBB_KEY = (import.meta.env.VITE_IMGBB_KEY as string | undefined) || 'c36f8cd520e987d6142af2ba999b57b6';

export async function uploadImageToCloud(base64: string, filename?: string): Promise<string | null> {
  const pureBase64 = base64.replace(/^data:image\/\w+;base64,/, "").trim();

  if (IMGBB_KEY) {
    try {
      const form = new FormData();
      form.append("key", IMGBB_KEY);
      form.append("image", pureBase64);
      if (filename) form.append("name", filename.replace(/\.[^.]+$/, ""));
      const res = await fetch("https://api.imgbb.com/1/upload", { 
        method: "POST", 
        body: form,
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const json = await res.json();
        const url: string = json?.data?.url;
        if (url) { console.info("[CloudUpload] ImgBB OK ->", url); return url; }
      }
    } catch (e) { console.warn("[CloudUpload] ImgBB falhou/timeout, tentando Catbox...", e); }
  }

  try {
    const byteChars = atob(pureBase64);
    const byteNums = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteNums], { type: "image/webp" });
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", blob, filename || ("dozero_" + Date.now() + ".webp"));
    const res = await fetch("https://catbox.moe/user.php", { 
      method: "POST", 
      body: form,
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith("https://")) { console.info("[CloudUpload] Catbox OK ->", url); return url; }
    }
  } catch (e) { console.warn("[CloudUpload] Catbox falhou/timeout, usando armazenamento local.", e); }

  return null;
}
