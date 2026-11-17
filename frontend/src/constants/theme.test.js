/**
 * Theme tokens: both appearances define the same colours, every value is a
 * colour React Native understands, and reading text passes WCAG contrast.
 */
import { shadow, swatches, themes } from './theme';

const COLOUR = /^(#[0-9A-F]{6}|rgba\(\d{1,3},\d{1,3},\d{1,3},(0|1|0?\.\d+)\))$/i;

describe('theme tokens', () => {
  it('defines the same colour names in light and dark', () => {
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });

  it.each(['light', 'dark'])('uses valid colour values in %s', (scheme) => {
    Object.values(themes[scheme]).forEach((value) => expect(value).toMatch(COLOUR));
  });

  it('has avatar swatches with a background and a foreground', () => {
    swatches.forEach((swatch) => {
      expect(swatch.bg).toMatch(COLOUR);
      expect(swatch.fg).toMatch(COLOUR);
    });
  });
});

describe('shadow', () => {
  it('returns nothing for a flat surface', () => {
    expect(shadow(0, '#000000')).toEqual({});
  });

  it('gets stronger with each level', () => {
    const opacities = [1, 2, 3].map((level) => shadow(level, '#000000').shadowOpacity);
    expect(opacities).toEqual([...opacities].sort((a, b) => a - b));
  });
});

describe('contrast (WCAG)', () => {
  const { contrastRatio } = jest.requireActual('../utils/contrast');
  const RULES = [
    { text: 'text', on: ['bg', 'card'], min: 4.5 },
    { text: 'textMuted', on: ['bg', 'card'], min: 4.5 },
    { text: 'textFaint', on: ['bg', 'card'], min: 3.5 },
    { text: 'onAccent', on: ['accent'], min: 4.5 },
    { text: 'onOutgoing', on: ['outgoing'], min: 4.5 },
    { text: 'text', on: ['incoming'], min: 4.5 },
    { text: 'onHighlight', on: ['highlight'], min: 4.5 },
    { text: 'textOnPanel', on: ['panel', 'panelRaised'], min: 4.5 },
    { text: 'textOnPanelMuted', on: ['panel', 'panelRaised'], min: 3.5 },
  ];

  it.each(['light', 'dark'])('%s passes every text rule', (scheme) => {
    const colors = themes[scheme];
    RULES.forEach(({ text, on, min }) => {
      on.forEach((surface) => {
        expect({ pair: `${text} on ${surface}`, ok: contrastRatio(colors[text], colors[surface]) >= min }).toEqual({
          pair: `${text} on ${surface}`,
          ok: true,
        });
      });
    });
  });

  it('every monogram swatch is readable', () => {
    swatches.forEach(({ bg, fg }) => expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3));
  });
});
