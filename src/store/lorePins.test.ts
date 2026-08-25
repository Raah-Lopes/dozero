import { describe, it, expect, beforeEach } from 'vitest';
import { 
  addLorePin, 
  updateLorePin, 
  updateLorePinPosition, 
  removeLorePin, 
  getLorePins, 
  getVisibleLorePins, 
  createLorePinFromWikiEntry,
  getLorePinColor
} from './lorePins';
import { state } from '../services/yjs';

describe('LorePins Store', () => {
  beforeEach(() => {
    state.lorePins.clear();
  });

  it('deve adicionar um pin de lore e calcular cor automaticamente pelo tipo', () => {
    const pin = addLorePin({
      x: 150,
      y: 200,
      title: 'Castelo das Sombras',
      entityType: 'local'
    });

    expect(pin.id).toBeDefined();
    expect(pin.title).toBe('Castelo das Sombras');
    expect(pin.color).toBe('#34d399'); // Cor do tipo local
    expect(state.lorePins.get(pin.id)).toEqual(pin);
  });

  it('deve atualizar propriedades e posição do pin', () => {
    const pin = addLorePin({
      x: 100,
      y: 100,
      title: 'Vila Antiga'
    });

    updateLorePinPosition(pin.id, 250, 300);
    expect((state.lorePins.get(pin.id) as any).x).toBe(250);
    expect((state.lorePins.get(pin.id) as any).y).toBe(300);

    updateLorePin(pin.id, { title: 'Vila Renovada', entityType: 'organizacao' });
    const updated = state.lorePins.get(pin.id) as any;
    expect(updated.title).toBe('Vila Renovada');
    expect(updated.color).toBe('#fbbf24'); // Cor do tipo organizacao
  });

  it('deve filtrar visibilidade entre Mestre e Jogadores (gmOnly)', () => {
    const publicPin = addLorePin({
      x: 50,
      y: 50,
      title: 'Taverna do Pônei Saltarico',
      gmOnly: false
    });

    const secretPin = addLorePin({
      x: 60,
      y: 60,
      title: 'Covil Secreto dos Ladrões',
      gmOnly: true
    });

    // Mestre enxerga todos
    const gmPins = getVisibleLorePins(true);
    expect(gmPins).toHaveLength(2);

    // Jogadores não enxergam pins secretos
    const playerPins = getVisibleLorePins(false);
    expect(playerPins).toHaveLength(1);
    expect(playerPins[0].id).toBe(publicPin.id);
  });

  it('deve criar um pin a partir de uma entrada da wiki', () => {
    const fakeEntry = {
      slug: 'val-de-draken',
      path: 'wikidozero/Locais/Val_de_Draken.md',
      title: 'Val de Draken',
      metadata: {
        tipo: 'local',
        nome: 'Val de Draken',
        descricao: 'Um vale misterioso repleto de ruínas dracônicas.'
      }
    };

    const pin = createLorePinFromWikiEntry(fakeEntry as any, 500, 400, false);
    expect(pin.title).toBe('Val de Draken');
    expect(pin.wikiPath).toBe('wikidozero/Locais/Val_de_Draken.md');
    expect(pin.entityType).toBe('local');
    expect(pin.color).toBe('#34d399');
    expect(pin.description).toBe('Um vale misterioso repleto de ruínas dracônicas.');
  });

  it('deve remover pin corretamente', () => {
    const pin = addLorePin({ x: 10, y: 10, title: 'Para remover' });
    expect(getLorePins()).toHaveLength(1);

    removeLorePin(pin.id);
    expect(getLorePins()).toHaveLength(0);
  });
});
