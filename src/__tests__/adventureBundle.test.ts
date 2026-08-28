import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  isGzipBuffer, 
  compressBundleGzip, 
  decompressBundleData, 
  auditBundleAssets, 
  validateAdventureBundle, 
  exportAdventureBundle, 
  importAdventureBundle,
  AdventureBundle
} from '../services/adventureBundleService';
import * as sceneCloud from '../services/sceneCloudService';
import * as encounterCloud from '../services/encounterCloudService';
import * as characterRepo from '../services/characterRepository';
import * as lineageCloud from '../services/lineageCloudService';

vi.mock('../services/sceneCloudService', () => ({
  getScenesFromCloud: vi.fn(),
  saveSceneToCloud: vi.fn(),
}));

vi.mock('../services/encounterCloudService', () => ({
  getCombatEncounters: vi.fn(),
  saveCombatEncounter: vi.fn(),
}));

vi.mock('../services/characterRepository', () => ({
  getCampaignCharacters: vi.fn(),
  saveCharacter: vi.fn(),
}));

vi.mock('../services/lineageCloudService', () => ({
  loadLineageAtlas: vi.fn(),
  saveLineageAtlas: vi.fn(),
}));

vi.mock('../components/UI/Toast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('Adventure Bundle .dozero Service (G.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('isGzipBuffer & Compression / Decompression', () => {
    it('detects gzip magic header correctly', () => {
      const gzipHeader = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]).buffer;
      const plainText = new Uint8Array([0x7b, 0x22, 0x61, 0x22]).buffer; // '{"a"'
      const emptyBuffer = new Uint8Array([]).buffer;

      expect(isGzipBuffer(gzipHeader)).toBe(true);
      expect(isGzipBuffer(plainText)).toBe(false);
      expect(isGzipBuffer(emptyBuffer)).toBe(false);
    });

    it('roundtrips string data via compress and decompress', async () => {
      const sample = JSON.stringify({
        version: '2.0',
        bundleName: 'Aventura Teste',
        scenes: [{ id: 's1', name: 'Masmorra do Dragao' }]
      });

      const compressedBlob = await compressBundleGzip(sample);
      expect(compressedBlob.size).toBeGreaterThan(0);

      const buffer = await compressedBlob.arrayBuffer();
      const restored = await decompressBundleData(buffer);
      expect(restored).toBe(sample);
    });

    it('decompresses plain uncompressed JSON gracefully', async () => {
      const plain = '{"bundleName":"Legado"}';
      const buffer = new TextEncoder().encode(plain).buffer;
      const result = await decompressBundleData(buffer);
      expect(result).toBe(plain);
    });
  });

  describe('auditBundleAssets', () => {
    it('extracts image and audio URLs and reports external domains', () => {
      const mockBundle: AdventureBundle = {
        version: '2.0',
        bundleName: 'Aventura Auditada',
        exportedAt: new Date().toISOString(),
        scenes: [
          {
            id: 's1',
            campaign_id: 'c1',
            name: 'Floresta Sombria',
            thumbnail_url: 'https://images.unsplash.com/photo-1234',
            backgrounds: [{ url: 'https://cdn.dozero.vtt/maps/forest.webp' }],
            audio_config: { ambienceUrl: 'https://audio.dozero.vtt/rain.mp3', musicUrl: 'https://audio.dozero.vtt/tavern.mp3' },
            grid_config: {},
            fog_config: {},
            props: [],
            created_at: '',
            updated_at: ''
          }
        ],
        characters: [
          {
            id: 'ch1',
            campaign_id: 'c1',
            name: 'Orc Guerreiro',
            type: 'npc',
            avatar_url: 'https://cdn.dozero.vtt/tokens/orc.webp',
            data: { avatar: 'https://cdn.dozero.vtt/tokens/orc.webp' },
            created_at: '',
            updated_at: ''
          }
        ],
        encounters: []
      };

      const audit = auditBundleAssets(mockBundle);
      expect(audit.totalUrls).toBe(5);
      expect(audit.imageUrls).toContain('https://images.unsplash.com/photo-1234');
      expect(audit.imageUrls).toContain('https://cdn.dozero.vtt/maps/forest.webp');
      expect(audit.imageUrls).toContain('https://cdn.dozero.vtt/tokens/orc.webp');
      expect(audit.audioUrls).toContain('https://audio.dozero.vtt/rain.mp3');
      expect(audit.externalDomains).toContain('images.unsplash.com');
      expect(audit.externalDomains).toContain('cdn.dozero.vtt');
      expect(audit.externalDomains).toContain('audio.dozero.vtt');
    });
  });

  describe('validateAdventureBundle', () => {
    it('validates a correct bundle and returns manifest', async () => {
      const sampleBundle: AdventureBundle = {
        version: '2.0',
        bundleName: 'Castelo de Ravenloft',
        system: 'D&D 5e',
        author: 'Strahd',
        description: 'Aventura gotica',
        exportedAt: '2026-08-27T00:00:00Z',
        scenes: [{ id: '1', name: 'Sala do Trono' } as any],
        characters: [{ id: '2', name: 'Vampiro' } as any],
        encounters: [{ id: '3', name: 'Emboscada' } as any]
      };

      const buffer = new TextEncoder().encode(JSON.stringify(sampleBundle)).buffer;
      const res = await validateAdventureBundle(buffer);

      expect(res.valid).toBe(true);
      expect(res.manifest?.bundleName).toBe('Castelo de Ravenloft');
      expect(res.manifest?.counts.scenes).toBe(1);
      expect(res.manifest?.counts.characters).toBe(1);
      expect(res.manifest?.counts.encounters).toBe(1);
    });

    it('rejects invalid or corrupted files', async () => {
      const invalidBuffer = new TextEncoder().encode('arquivo que nao e json valido').buffer;
      const res = await validateAdventureBundle(invalidBuffer);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('rejects bundle without scenes, characters or encounters', async () => {
      const emptyBundle = JSON.stringify({ version: '2.0', bundleName: 'Vazio' });
      const buffer = new TextEncoder().encode(emptyBundle).buffer;
      const res = await validateAdventureBundle(buffer);
      expect(res.valid).toBe(false);
    });
  });

  describe('exportAdventureBundle', () => {
    it('fetches cloud entities and packages bundle with manifest', async () => {
      (sceneCloud.getScenesFromCloud as any).mockResolvedValue([{ id: 'sc1', name: 'Taverna' }]);
      (encounterCloud.getCombatEncounters as any).mockResolvedValue([{ id: 'enc1', name: 'Briga de Bar' }]);
      (characterRepo.getCampaignCharacters as any).mockResolvedValue([{ id: 'char1', name: 'Barman' }]);
      (lineageCloud.loadLineageAtlas as any).mockResolvedValue(null);

      const result = await exportAdventureBundle(
        'mesa-123',
        'Aventura da Taverna',
        { compress: false, description: 'Sessao zero' },
        'user-1'
      );

      expect(sceneCloud.getScenesFromCloud).toHaveBeenCalledWith('mesa-123');
      expect(encounterCloud.getCombatEncounters).toHaveBeenCalledWith('mesa-123');
      expect(characterRepo.getCampaignCharacters).toHaveBeenCalledWith('mesa-123', 'user-1');
      expect(result.filename).toBe('Aventura_da_Taverna.dozero');
      expect(result.manifest.counts.scenes).toBe(1);
      expect(result.manifest.counts.encounters).toBe(1);
      expect(result.manifest.counts.characters).toBe(1);
    });
  });

  describe('importAdventureBundle', () => {
    it('imports selected entities to target campaign and reports progress', async () => {
      (sceneCloud.saveSceneToCloud as any).mockResolvedValue({ id: 'new-sc' });
      (encounterCloud.saveCombatEncounter as any).mockResolvedValue({ id: 'new-enc' });
      (characterRepo.saveCharacter as any).mockResolvedValue({ id: 'new-char' });
      (lineageCloud.saveLineageAtlas as any).mockResolvedValue(true);

      const sampleBundle: AdventureBundle = {
        version: '2.0',
        bundleName: 'Pacote de Teste',
        exportedAt: '2026-08-27T00:00:00Z',
        scenes: [{ id: 'old-sc', name: 'Cena 1' } as any],
        characters: [{ id: 'old-ch', name: 'Monstro 1' } as any],
        encounters: [{ id: 'old-enc', name: 'Combate 1' } as any],
        lineage: { campaign_id: 'old', data: { version: 1, rootIds: [], houses: [], members: [], relationships: [] }, updated_at: '', updated_by: '' }
      };

      const buffer = new TextEncoder().encode(JSON.stringify(sampleBundle)).buffer;
      const progressList: number[] = [];

      const result = await importAdventureBundle(
        buffer,
        'mesa-destino',
        {
          importScenes: true,
          importCharacters: true,
          importEncounters: true,
          importLineage: true,
          overwriteExisting: false
        },
        'user-gm',
        (pct) => progressList.push(pct)
      );

      expect(result.scenesCount).toBe(1);
      expect(result.charactersCount).toBe(1);
      expect(result.encountersCount).toBe(1);
      expect(result.lineageImported).toBe(true);
      expect(sceneCloud.saveSceneToCloud).toHaveBeenCalledWith(
        expect.objectContaining({ campaign_id: 'mesa-destino', name: 'Cena 1', id: undefined })
      );
      expect(progressList).toContain(100);
    });

    it('respects selective import options (e.g. only characters)', async () => {
      (characterRepo.saveCharacter as any).mockResolvedValue({ id: 'new-char' });

      const sampleBundle: AdventureBundle = {
        version: '2.0',
        bundleName: 'Apenas Fichas',
        exportedAt: '2026-08-27T00:00:00Z',
        scenes: [{ id: 'sc1', name: 'Cena Ignorada' } as any],
        characters: [{ id: 'ch1', name: 'Heroi Importado' } as any],
        encounters: [{ id: 'enc1', name: 'Encontro Ignorado' } as any],
      };

      const buffer = new TextEncoder().encode(JSON.stringify(sampleBundle)).buffer;
      const result = await importAdventureBundle(
        buffer,
        'mesa-destino',
        {
          importScenes: false,
          importCharacters: true,
          importEncounters: false,
          importLineage: false,
        }
      );

      expect(result.scenesCount).toBe(0);
      expect(result.charactersCount).toBe(1);
      expect(result.encountersCount).toBe(0);
      expect(sceneCloud.saveSceneToCloud).not.toHaveBeenCalled();
      expect(characterRepo.saveCharacter).toHaveBeenCalled();
    });
  });
});
