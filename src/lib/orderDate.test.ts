import { describe, it, expect } from 'vitest';
import { formatOrderDate } from './orderDate';

/**
 * Expectations are written longhand from the calendar, never from what the
 * function returns: the whole point of the fix is that the obvious reading —
 * "the 20th is the 20th" — was not what the code did.
 *
 * `en-CA` is the assertion locale so the expected strings stay short and the
 * day number is visible on its own — a one-day slip is the whole failure mode
 * under test, and it must not be able to hide inside a longer rendering.
 */
describe('formatOrderDate', () => {
  const locale = 'en-CA';

  it('reads a YYYY-MM-DD pedido date as that calendar day, not UTC midnight', () => {
    // The regression: `new Date('2026-09-20')` is UTC midnight, which is
    // 2026-09-19 18:00 in Costa Rica, so this rendered as the 19th.
    expect(formatOrderDate('2026-09-20', locale)).toBe('Sep 20, 2026');
  });

  it('reads a DD/MM/YYYY imported date as that calendar day', () => {
    expect(formatOrderDate('07/09/2026', locale)).toBe('Sep 7, 2026');
  });

  it('does not confuse the two formats: 07/09 is September, not July', () => {
    expect(formatOrderDate('07/09/2026', locale)).not.toContain('Jul');
  });

  it('keeps the first of the month on the first, where an off-by-one crosses months', () => {
    expect(formatOrderDate('2026-09-01', locale)).toBe('Sep 1, 2026');
  });

  it('keeps New Year on the first, where an off-by-one crosses years', () => {
    expect(formatOrderDate('2026-01-01', locale)).toBe('Jan 1, 2026');
  });

  it('returns the input unchanged when it is not a date', () => {
    expect(formatOrderDate('not a date', locale)).toBe('not a date');
  });

  it('returns empty for a missing date rather than "Invalid Date"', () => {
    expect(formatOrderDate(undefined, locale)).toBe('');
  });

  it('spells the month out only when asked', () => {
    expect(formatOrderDate('2026-09-20', 'es-CR', 'long')).toContain('septiembre');
    expect(formatOrderDate('2026-09-20', 'es-CR', 'short')).not.toContain('septiembre');
  });
});
