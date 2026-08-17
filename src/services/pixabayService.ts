// src/services/pixabayService.ts

export interface PixabayImageItem {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  likes: number;
  user: string;
  userImageURL: string;
}

export interface PixabayVideoItem {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  picture_id: string;
  videos: {
    large: { url: string; width: number; height: number; size: number; thumbnail: string };
    medium: { url: string; width: number; height: number; size: number; thumbnail: string };
    small: { url: string; width: number; height: number; size: number; thumbnail: string };
    tiny: { url: string; width: number; height: number; size: number; thumbnail: string };
  };
  views: number;
  downloads: number;
  likes: number;
  user: string;
  userImageURL: string;
}

export interface PixabaySearchResponse<T> {
  total: number;
  totalHits: number;
  hits: T[];
}

export interface ImageSearchOptions {
  imageType?: 'all' | 'photo' | 'illustration' | 'vector';
  orientation?: 'all' | 'horizontal' | 'vertical';
  category?: string;
  page?: number;
  perPage?: number;
  safeSearch?: boolean;
}

export interface VideoSearchOptions {
  videoType?: 'all' | 'film' | 'animation';
  category?: string;
  page?: number;
  perPage?: number;
  safeSearch?: boolean;
}

const STORAGE_KEY = 'pixabay_api_key';
// User's Pixabay API key configured as default
const DEFAULT_KEY = '7183667-868e8f69cdaa8652ccb33fc57'; 

const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const getPixabayApiKey = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || DEFAULT_KEY;
  } catch {
    return DEFAULT_KEY;
  }
};

export const setPixabayApiKey = (key: string): void => {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('[PixabayService] Erro ao salvar chave:', err);
  }
};

export const hasCustomPixabayKey = (): boolean => {
  try {
    const key = localStorage.getItem(STORAGE_KEY)?.trim() || DEFAULT_KEY;
    return !!key;
  } catch {
    return true;
  }
};

// Smart Portuguese to English RPG dictionary for rich Pixabay results
const PT_TO_EN_RPG: Record<string, string> = {
  'taverna': 'tavern pub',
  'castelo': 'castle fortress',
  'masmorra': 'dungeon crypt',
  'floresta': 'fantasy forest woods',
  'fogueira': 'campfire bonfire fire',
  'fogo': 'fire flames',
  'chuva': 'rain storm thunderstorm',
  'neve': 'snow blizzard winter',
  'montanha': 'mountain peaks landscape',
  'caverna': 'cave cavern',
  'cripta': 'crypt tomb',
  'dragao': 'dragon',
  'dragão': 'dragon creature',
  'magia': 'magic spell arcane',
  'portal': 'portal magic glowing',
  'cidade': 'medieval city fantasy',
  'guerreiro': 'warrior knight',
  'cavaleiro': 'knight armor',
  'mago': 'wizard mage sorcerer',
  'bruxo': 'warlock wizard',
  'monstro': 'monster creature beast',
  'batalha': 'battle fantasy combat',
  'espada': 'sword blade weapon',
  'ouro': 'gold coins treasure',
  'tesouro': 'treasure chest gold',
};

const enrichQuery = (q: string): string => {
  const clean = q.trim().toLowerCase();
  if (!clean) return 'fantasy landscape';
  return PT_TO_EN_RPG[clean] || q.trim();
};

export const searchPixabayImages = async (
  query: string,
  options: ImageSearchOptions = {}
): Promise<PixabaySearchResponse<PixabayImageItem>> => {
  const apiKey = getPixabayApiKey();
  const {
    imageType = 'all',
    orientation = 'horizontal',
    category,
    page = 1,
    perPage = 24,
    safeSearch = true,
  } = options;

  const finalQuery = enrichQuery(query);
  const cacheKey = `img_${finalQuery}_${imageType}_${orientation}_${category || ''}_${page}_${perPage}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: finalQuery,
    image_type: imageType,
    orientation: orientation,
    page: String(page),
    per_page: String(perPage),
    safesearch: String(safeSearch),
  });

  if (category) {
    params.set('category', category);
  }

  const url = `https://pixabay.com/api/?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 400 || response.status === 429) {
      throw new Error(`Erro na API do Pixabay (Status ${response.status}). Verifique sua chave de API ou limite de uso.`);
    }
    throw new Error(`Erro ao buscar imagens no Pixabay (${response.statusText})`);
  }

  const data: PixabaySearchResponse<PixabayImageItem> = await response.json();
  cache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
};

export const searchPixabayVideos = async (
  query: string,
  options: VideoSearchOptions = {}
): Promise<PixabaySearchResponse<PixabayVideoItem>> => {
  const apiKey = getPixabayApiKey();
  const {
    videoType = 'all',
    category,
    page = 1,
    perPage = 24,
    safeSearch = true,
  } = options;

  const finalQuery = enrichQuery(query);
  const cacheKey = `vid_${finalQuery}_${videoType}_${category || ''}_${page}_${perPage}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: finalQuery,
    video_type: videoType,
    page: String(page),
    per_page: String(perPage),
    safesearch: String(safeSearch),
  });

  if (category) {
    params.set('category', category);
  }

  const url = `https://pixabay.com/api/videos/?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 400 || response.status === 429) {
      throw new Error(`Erro na API de Vídeos do Pixabay (Status ${response.status}). Verifique sua chave de API.`);
    }
    throw new Error(`Erro ao buscar vídeos no Pixabay (${response.statusText})`);
  }

  const data: PixabaySearchResponse<PixabayVideoItem> = await response.json();
  cache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
};
