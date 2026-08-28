import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveCharacter,
  getVaultCharacters,
  deleteCharacter,
  createCharacterSnapshot,
  getCharacterVersions,
  restoreCharacterVersion,
  deleteCharacterVersion,
  cloneCharacter,
  importCharacterFromJson,
  CharacterRecord
} from '../services/characterRepository';

describe('Player Vault System & Version History (B.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves, retrieves, and deletes characters in global vault', async () => {
    const char = await saveCharacter({
      name: 'Valeros, o Guerreiro',
      type: 'pc',
      data: { hp: 45, maxHp: 45, str: 18 }
    });

    expect(char.id).toBeDefined();
    expect(char.name).toBe('Valeros, o Guerreiro');

    const vault = await getVaultCharacters();
    expect(vault.some(c => c.id === char.id)).toBe(true);

    await deleteCharacter(char.id);
    const afterDel = await getVaultCharacters();
    expect(afterDel.some(c => c.id === char.id)).toBe(false);
  });

  describe('Character Version History & Snapshots', () => {
    it('creates snapshots and retrieves version history', async () => {
      const char = await saveCharacter({
        name: 'Merisiel',
        type: 'pc',
        data: { level: 1, hp: 12 }
      });

      const snap1 = await createCharacterSnapshot(char.id, 'Nível 1 - Inicial');
      expect(snap1).toBeDefined();
      expect(snap1?.label).toBe('Nível 1 - Inicial');
      expect(snap1?.snapshot.data).toEqual({ level: 1, hp: 12 });

      // Atualiza o personagem para o nível 2
      await saveCharacter({
        ...char,
        data: { level: 2, hp: 20 }
      });

      const snap2 = await createCharacterSnapshot(char.id, 'Nível 2 - Ladina');
      expect(snap2?.label).toBe('Nível 2 - Ladina');

      const versions = await getCharacterVersions(char.id);
      expect(versions.length).toBe(2);
      expect(versions[0].label).toBe('Nível 2 - Ladina');
    });

    it('restores character from a previous version snapshot', async () => {
      const char = await saveCharacter({
        name: 'Kyra, Clériga',
        type: 'pc',
        data: { hp: 30, spells: ['Cura Menor'] }
      });

      const snapshot = await createCharacterSnapshot(char.id, 'Ponto Seguro');
      expect(snapshot).toBeDefined();

      // Altera dados atuais
      await saveCharacter({
        ...char,
        name: 'Kyra, Clériga (Envenenada)',
        data: { hp: 5, spells: [] }
      });

      let currentVault = await getVaultCharacters();
      expect(currentVault.find(c => c.id === char.id)?.name).toBe('Kyra, Clériga (Envenenada)');

      // Restaura versão antiga
      const restored = await restoreCharacterVersion(snapshot!.id);
      expect(restored).toBeDefined();
      expect(restored?.name).toBe('Kyra, Clériga');
      expect((restored?.data as any).hp).toBe(30);

      currentVault = await getVaultCharacters();
      expect(currentVault.find(c => c.id === char.id)?.name).toBe('Kyra, Clériga');
    });

    it('deletes version snapshots', async () => {
      const char = await saveCharacter({ name: 'Ezren', type: 'pc', data: {} });
      const snap = await createCharacterSnapshot(char.id, 'Versão Temporária');
      expect(snap).toBeDefined();

      let versions = await getCharacterVersions(char.id);
      expect(versions.length).toBe(1);

      await deleteCharacterVersion(snap!.id);
      versions = await getCharacterVersions(char.id);
      expect(versions.length).toBe(0);
    });
  });

  describe('Character Cloning & JSON Import/Export', () => {
    it('clones character with a new UUID and custom name', async () => {
      const source = await saveCharacter({
        name: 'Harsk, Patrulheiro',
        type: 'pc',
        data: { dex: 16, bow: '+1 Composto' }
      });

      const clone = await cloneCharacter(source.id, 'camp_mesa_2', 'Harsk - Campanha das Sombras');
      expect(clone).toBeDefined();
      expect(clone?.id).not.toBe(source.id);
      expect(clone?.name).toBe('Harsk - Campanha das Sombras');
      expect(clone?.campaign_id).toBe('camp_mesa_2');
      expect(clone?.data).toEqual(source.data);
    });

    it('imports character from JSON string', async () => {
      const jsonContent = JSON.stringify({
        schema_version: '1.0',
        character: {
          name: 'Seoni, Feiticeira',
          type: 'pc',
          avatar_url: 'https://example.com/seoni.png',
          data: { cha: 19, spells: ['Mísseis Mágicos'] },
          notes_markdown: 'Linhagem Dracônica'
        }
      });

      const imported = await importCharacterFromJson(jsonContent);
      expect(imported).toBeDefined();
      expect(imported.name).toBe('Seoni, Feiticeira');
      expect((imported.data as any).cha).toBe(19);

      const vault = await getVaultCharacters();
      expect(vault.some(c => c.name === 'Seoni, Feiticeira')).toBe(true);
    });

    it('throws error when importing invalid JSON without name', async () => {
      await expect(importCharacterFromJson('{"invalid": true}')).rejects.toThrow();
    });
  });
});
