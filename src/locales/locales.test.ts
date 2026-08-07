import { describe, expect, it } from 'vitest';
import { enNamespaces, esNamespaces, LOCALE_NAMESPACES, translations } from './index';

describe('locale dictionaries', () => {
  it('keeps every namespace and its English/Spanish key set in sync', () => {
    expect(Object.keys(enNamespaces).sort()).toEqual([...LOCALE_NAMESPACES].sort());
    expect(Object.keys(esNamespaces).sort()).toEqual([...LOCALE_NAMESPACES].sort());

    for (const namespace of LOCALE_NAMESPACES) {
      expect(Object.keys(enNamespaces[namespace]).sort()).toEqual(
        Object.keys(esNamespaces[namespace]).sort(),
      );
    }
  });

  it('contains only string messages', () => {
    expect(Object.values(translations.en).every((message) => typeof message === 'string')).toBe(true);
    expect(Object.values(translations.es).every((message) => typeof message === 'string')).toBe(true);
  });
});
