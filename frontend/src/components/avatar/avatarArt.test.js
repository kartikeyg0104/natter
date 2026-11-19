import { avatarTree, initials, swatchFor } from './avatarArt';

describe('initials', () => {
  it.each([
    ['zara', 'ZA'],
    ['Lab partners', 'LP'],
    ['vikram.s', 'VS'],
    ['Ishaan (lab)', 'IL'],
    ['+91 98100', '99'],
    ['', 'NA'],
    ['  ', 'NA'],
  ])('%p -> %s', (name, letters) => expect(initials(name)).toBe(letters));
});

describe('swatchFor', () => {
  it('is stable for a name', () => {
    expect(swatchFor('noor')).toBe(swatchFor('noor'));
  });
});

describe('avatarTree', () => {
  it('returns nothing for the monogram style', () => {
    expect(avatarTree('zara', 'monogram')).toBeNull();
  });
});

describe('presets', () => {
  const { parsePreset, presetTree, PRESET_STYLES, PRESET_SEEDS } = jest.requireActual('./avatarArt');
  it('parses "style:seed" and rejects unknown styles', () => {
    expect(parsePreset('fun-emoji:Kai')).toMatchObject({ style: { id: 'fun-emoji' }, seed: 'Kai' });
    expect(parsePreset('lorelei:Kai')).toBeNull();
    expect(parsePreset('nonsense')).toBeNull();
    expect(parsePreset(null)).toBeNull();
  });
  it('draws every preset in the gallery', () => {
    PRESET_STYLES.forEach((style) => expect(presetTree(`${style.id}:${PRESET_SEEDS[0]}`)).not.toBeNull());
  });
});
