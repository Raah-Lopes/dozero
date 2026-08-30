import { supabase } from './supabase';

const CAMPAIGN_ASSETS_BUCKET = 'campaign-assets';

function currentRoomAssetPrefix(): string {
  const roomCode = typeof window === 'undefined'
    ? 'dozero-mesa-principal-v2'
    : new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
  return roomCode.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function assetObjectPath(filename?: string): string {
  const fallback = `image_${Date.now()}.webp`;
  const baseName = (filename || fallback).split(/[\\/]/).pop() || fallback;
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
  return `${currentRoomAssetPrefix()}/${uniqueName}`;
}

/**
 * Converte base64 data URL para Blob
 */
export function base64ToBlob(base64Data: string): { blob: Blob, mimeType: string } {
  const parts = base64Data.split(';base64,');
  const mimeType = parts[0].replace('data:', '') || 'image/webp';
  const byteCharacters = atob(parts[1] || parts[0]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return { blob: new Blob([byteArray], { type: mimeType }), mimeType };
}

/**
 * Faz upload de imagem (Blob ou File ou Base64) para o bucket do Supabase Storage
 */
export async function uploadToSupabaseStorage(
  fileOrBase64: File | Blob | string,
  filename?: string,
  bucket: string = CAMPAIGN_ASSETS_BUCKET
): Promise<string | null> {
  if (!supabase) return null;

  try {
    let fileBody: File | Blob;
    let contentType = 'image/webp';

    if (typeof fileOrBase64 === 'string') {
      const { blob, mimeType } = base64ToBlob(fileOrBase64);
      fileBody = blob;
      contentType = mimeType;
    } else {
      fileBody = fileOrBase64;
      contentType = (fileOrBase64 as File).type || 'image/webp';
    }

    const objectPath = assetObjectPath(filename);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, fileBody, {
        contentType,
        cacheControl: '31536000',
        upsert: false
      });

    if (error) throw error;

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicData?.publicUrl || null;
  } catch (err) {
    console.warn(`[SupabaseStorage] Erro ao enviar ${filename} para bucket ${bucket}:`, err);
    return null;
  }
}
