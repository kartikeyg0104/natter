/**
 * avatarArt: everything an avatar needs from a username, drawn on the device.
 * The username is the seed, so everyone sees the same avatar for a person on
 * every phone without storing anything.
 *
 * Styles:
 *   monogram  initials on a seeded colour (drawn with Text, no SVG)
 *   shapes    abstract geometric art (DiceBear "shapes", CC0)
 *   thumbs    a friendly blob character (DiceBear "thumbs", CC0)
 *
 * SVG styles are generated and parsed once per (style, name) and cached.
 */
import * as adventurer from '@dicebear/adventurer';
import * as avataaars from '@dicebear/avataaars';
import * as bigSmile from '@dicebear/big-smile';
import * as botttsNeutral from '@dicebear/bottts-neutral';
import { createAvatar } from '@dicebear/core';
import * as funEmoji from '@dicebear/fun-emoji';
import * as micah from '@dicebear/micah';
import * as shapes from '@dicebear/shapes';
import * as thumbs from '@dicebear/thumbs';
import { parse } from 'react-native-svg';
import { swatches } from '../../constants/theme';
import { hashString, pickBySeed } from '../../utils/hash';
import { log } from '../../utils/logger';
import { cleanAvatarSvg } from './cleanSvg';

export const AVATAR_STYLES = [
  { id: 'monogram', label: 'Initials', art: null },
  { id: 'shapes', label: 'Shapes', art: shapes },
  { id: 'thumbs', label: 'Characters', art: thumbs },
];

export const DEFAULT_AVATAR_STYLE = 'monogram';

/** Soft backdrops for the SVG styles. */
const BACKDROPS = ['#DDE3FB', '#FFF0C7', '#D5F0E3', '#FADCE4', '#E6DEFA', '#D3EEF3'];

const FALLBACK_SEED = 'natter';
const MAX_CACHE = 600;
const cache = new Map();

function seedFor(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return trimmed || FALLBACK_SEED;
}

/**
 * Up to two letters: first letters of the first two words, otherwise the
 * first two characters ("zara" -> "ZA", "lab partners" -> "LP").
 * @param {string} name
 */
export function initials(name) {
  // Letters and digits only, so "Ishaan (lab)" -> "IL", not "I(".
  const words = seedFor(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return seedFor(name).slice(0, 1).toUpperCase();
  const letters = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
}

/** @param {string} name */
export function swatchFor(name) {
  return pickBySeed(swatches, seedFor(name));
}

/** @param {string} name */
export function backdropFor(name) {
  return BACKDROPS[hashString(`bg:${seedFor(name)}`) % BACKDROPS.length];
}

/**
 * Parsed SVG tree for an SVG style, or null for monogram / on failure.
 * @param {string} name
 * @param {string} styleId
 */
export function avatarTree(name, styleId) {
  const entry = AVATAR_STYLES.find((item) => item.id === styleId);
  if (!entry?.art) return null;
  const seed = seedFor(name);
  const key = `${entry.id}:${seed}`;
  if (cache.has(key)) return cache.get(key);

  let tree = null;
  try {
    tree = parse(cleanAvatarSvg(createAvatar(entry.art, { seed }).toString()));
  } catch (error) {
    log.warn(`avatar for "${seed}" could not be drawn: ${String(error)}`);
  }
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, tree);
  return tree;
}

/**
 * Preloaded illustrated avatars people can pick as their profile picture.
 * Stored on the server as "<style>:<seed>" and drawn on every phone.
 * Art: DiceBear (MIT); Adventurer, Big Smile, Fun Emoji and Micah styles are CC BY 4.0
 * (see README credits).
 */
export const PRESET_STYLES = [
  { id: 'adventurer', label: 'Explorers', art: adventurer },
  { id: 'big-smile', label: 'Smiles', art: bigSmile },
  { id: 'fun-emoji', label: 'Emoji', art: funEmoji },
  { id: 'micah', label: 'Sketch', art: micah },
  { id: 'avataaars', label: 'Cartoon', art: avataaars },
  { id: 'bottts-neutral', label: 'Robots', art: botttsNeutral },
];

export const PRESET_SEEDS = [
  'Nova', 'Kai', 'Milo', 'Zuri', 'Remy', 'Ivy', 'Juno', 'Ezra', 'Luna', 'Theo', 'Aria', 'Leo',
];

/** @param {string | null | undefined} preset "<style>:<seed>" */
export function parsePreset(preset) {
  if (!preset || typeof preset !== 'string') return null;
  const index = preset.indexOf(':');
  if (index < 1) return null;
  const style = PRESET_STYLES.find((entry) => entry.id === preset.slice(0, index));
  const seed = preset.slice(index + 1);
  return style && seed ? { style, seed } : null;
}

/** Parsed SVG tree for a preset avatar, or null. */
export function presetTree(preset) {
  const parsed = parsePreset(preset);
  if (!parsed) return null;
  const key = `preset:${preset}`;
  if (cache.has(key)) return cache.get(key);
  let tree = null;
  try {
    tree = parse(cleanAvatarSvg(createAvatar(parsed.style.art, { seed: parsed.seed }).toString()));
  } catch (error) {
    log.warn(`preset avatar "${preset}" could not be drawn: ${String(error)}`);
  }
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, tree);
  return tree;
}

/** Test helper. */
export function clearAvatarCache() {
  cache.clear();
}
