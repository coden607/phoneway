import { describe, it, expect } from 'vitest';
import { getVerifyChipWeights, getRecommendedWeights } from '../js/referenceWeights.js';

// Regression test for the verify panel showing three identical "💵 1g" chips:
// same-gram currency entries share an icon and were rendered as duplicates.
// Chips are deduplicated by (icon, grams) and keep their names so the panel
// can tell same-gram weights apart.
describe('getVerifyChipWeights', () => {
  it('never returns two chips with the same icon and grams', () => {
    const chips = getVerifyChipWeights(6);
    const keys = chips.map(w => `${w.icon}|${w.grams}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('respects the limit and keeps every chip named', () => {
    const chips = getVerifyChipWeights(6);
    expect(chips).toHaveLength(6);
    for (const w of chips) {
      expect(typeof w.name).toBe('string');
      expect(w.name.length).toBeGreaterThan(0);
    }
  });

  it('deduplicates the full recommended list, not just the first page', () => {
    const all = getVerifyChipWeights(getRecommendedWeights().length);
    const keys = all.map(w => `${w.icon}|${w.grams}`);
    expect(new Set(keys).size).toBe(keys.length);
    // The old panel's first six contained three identical 💵 1g chips.
    expect(all.filter(w => w.icon === '💵' && w.grams === 1).length).toBeLessThanOrEqual(1);
  });
});
