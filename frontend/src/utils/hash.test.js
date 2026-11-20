import { hashString, pickBySeed } from './hash';

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('zara')).toBe(hashString('zara'));
  });

  it('differs for different inputs', () => {
    expect(hashString('zara')).not.toBe(hashString('ishaan'));
  });

  it('returns a non-negative integer, also for an empty string', () => {
    for (const text of ['', 'a', 'noor', 'a much longer name with spaces']) {
      const value = hashString(text);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('pickBySeed', () => {
  const items = ['a', 'b', 'c'];

  it('always picks the same item for the same seed', () => {
    expect(pickBySeed(items, 'vikram')).toBe(pickBySeed(items, 'vikram'));
  });

  it('always returns an item from the list', () => {
    for (const seed of ['zara', 'ishaan', 'noor', 'vikram', 'tara', '']) {
      expect(items).toContain(pickBySeed(items, seed));
    }
  });
});
