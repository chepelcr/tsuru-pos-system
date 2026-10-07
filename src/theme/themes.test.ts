import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, normalizeThemeId, THEMES } from './themes';

describe('saved theme migration', () => {
  it.each([['jmarkets', 'tsuru'], ['jmarkets-demo', 'tsuru-demo'], ['tech-gadgets', 'tech-gadgets']])('migrates %s to %s', (saved, expected) => {
    expect(normalizeThemeId(saved)).toBe(expected);
    expect(THEMES[expected]).toBeDefined();
  });
  it.each([null, undefined, '', 'unknown'])('uses the Tsuru default for %s', saved => {
    expect(normalizeThemeId(saved)).toBe(DEFAULT_THEME_ID);
  });
});
