import { describe, expect, it } from 'vitest';
import { escapeRegExp, formatWikiConnection } from './wikiConnections';

describe('wiki connections', () => {
  it('formats safe semantic links with optional context', () => {
    expect(formatWikiConnection('Arya\nLobo', { type: 'Aliado de:', description: 'Desde\nHarrenhal' }))
      .toBe('Aliado de:: [[AryaLobo]] — Desde Harrenhal');
    expect(new RegExp(escapeRegExp('Casa (Norte)')).test('Casa (Norte)')).toBe(true);
  });
});
