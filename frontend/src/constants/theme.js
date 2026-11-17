/**
 * Natter design tokens.
 *
 * Palette: cool "paper" greys with cobalt ink as the one action colour and a
 * marigold highlight reserved for unread counts and the brand mark.
 * Type: Bricolage Grotesque for titles, DM Sans for everything you read.
 * Shape: avatars are squircles, cards are softly rounded, message bubbles
 * keep one tight corner pointing at the sender.
 */
import { Platform } from 'react-native';

const light = {
  bg: '#EEF1F6',
  bgSunken: '#E2E7EF',
  card: '#FFFFFF',
  cardPressed: '#F3F5F9',
  line: '#D9DFE9',
  text: '#141A2E',
  textMuted: '#55607A',
  textFaint: '#6B7590',
  accent: '#2F45D8',
  accentPressed: '#2436B3',
  accentSoft: '#E1E6FC',
  onAccent: '#FFFFFF',
  highlight: '#FFC93C',
  onHighlight: '#2A2000',
  success: '#1F9D63',
  warn: '#C77A00',
  danger: '#D2364B',
  dangerSoft: '#FBE4E7',
  incoming: '#FFFFFF',
  outgoing: '#2F45D8',
  onOutgoing: '#FFFFFF',
  panel: '#151B30',
  panelRaised: '#222A45',
  textOnPanel: '#F2F4FB',
  textOnPanelMuted: '#9CA6C4',
  dangerOnPanel: '#FF8A98',
  shadow: '#1A2240',
  scrim: 'rgba(12,17,34,0.45)',
};

const dark = {
  bg: '#0E1221',
  bgSunken: '#090C17',
  card: '#181D31',
  cardPressed: '#20263D',
  line: '#272E48',
  text: '#E9EDF8',
  textMuted: '#A3ACC6',
  textFaint: '#8A93AF',
  accent: '#7D8CFF',
  accentPressed: '#6877F0',
  accentSoft: '#232B55',
  onAccent: '#0B0F22',
  highlight: '#FFD25E',
  onHighlight: '#2A2000',
  success: '#4CCB8D',
  warn: '#F0A93A',
  danger: '#FF6B7E',
  dangerSoft: '#3A1C25',
  incoming: '#1E2440',
  outgoing: '#5466F2',
  onOutgoing: '#FFFFFF',
  panel: '#151A2E',
  panelRaised: '#232A45',
  textOnPanel: '#F2F4FB',
  textOnPanelMuted: '#9CA6C4',
  dangerOnPanel: '#FF8A98',
  shadow: '#000000',
  scrim: 'rgba(0,0,0,0.6)',
};

export const themes = { light, dark };

/** Seeded colours for monogram avatars and group sender names. */
export const swatches = [
  { bg: '#2F45D8', fg: '#FFFFFF' },
  { bg: '#FFC93C', fg: '#2A2000' },
  { bg: '#1F9D63', fg: '#FFFFFF' },
  { bg: '#E2577A', fg: '#FFFFFF' },
  { bg: '#7A4FE0', fg: '#FFFFFF' },
  { bg: '#0E8FA8', fg: '#FFFFFF' },
  { bg: '#C2561A', fg: '#FFFFFF' },
  { bg: '#3B4766', fg: '#FFFFFF' },
];

export const radius = {
  image: 18,
  field: 18,
  bubble: 22,
  bubbleTight: 8,
  card: 26,
  sheet: 32,
  pill: 999,
};

/** Avatars are circles: corner radius is this share of the size. */
export const AVATAR_CORNER = 0.5;

/**
 * The brand gradient: electric blue -> cobalt -> violet. Used on the main
 * button, your own message bubbles, the camera button and story rings.
 */
export const gradients = {
  brand: { colors: ['#4F6BFF', '#2F45D8', '#7A4FE0'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  brandDark: { colors: ['#6B83FF', '#5466F2', '#9A6BFF'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  sunset: { colors: ['#FFC93C', '#FF7A59', '#E2577A'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  /** Story rings: a full colour sweep so the spin is visible. */
  ring: { colors: ['#4F6BFF', '#7A4FE0', '#E2577A', '#FFC93C', '#4F6BFF'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  /** Soft colour washes behind headers. */
  aurora: ['#4F6BFF', '#7A4FE0', '#FFC93C'],
};

/** 4 pt spacing scale. */
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 };

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_700Bold',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
};

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15 },
  chip: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16 },
  micro: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13 },
};

/** Elevation: 1 for resting cards, 2 for floating bars, 3 for menus. */
export function shadow(level, color) {
  const levels = {
    1: { shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, shadowOpacity: 0.06, elevation: 1 },
    2: { shadowOffset: { width: 0, height: 10 }, shadowRadius: 24, shadowOpacity: 0.14, elevation: 8 },
    3: { shadowOffset: { width: 0, height: 18 }, shadowRadius: 40, shadowOpacity: 0.24, elevation: 16 },
  };
  return levels[level] ? { shadowColor: color, ...levels[level] } : {};
}

/** Fixed signal colours for Diagnostics charts and levels (both themes). */
export const signal = { warm: '#FFC93C', mid: '#4CCB8D', cool: '#8C9BFF', violet: '#C9A3FF' };
