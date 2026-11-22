/**
 * settingsStore: device preferences that survive sign out:
 * avatar style, appearance, and Diagnostics' developer toggles.
 * Saved in SecureStore; unknown or broken saved values fall back to defaults.
 */
import { Appearance } from 'react-native';
import { AVATAR_STYLES, DEFAULT_AVATAR_STYLE } from '../components/avatar/avatarArt';
import { STORAGE_PREFIX } from '../constants/brand';
import { log } from '../utils/logger';
import { createStore } from './createStore';
import { loadJson, saveJson } from './persist';

const STORAGE_KEY = `${STORAGE_PREFIX}.settings`;
const APPEARANCES = ['auto', 'light', 'dark'];

export const DEFAULT_SETTINGS = {
  avatarStyle: DEFAULT_AVATAR_STYLE,
  appearance: 'auto',
  showOrb: false,
  shakeToOpen: true,
};

export const settingsStore = createStore(DEFAULT_SETTINGS);

/**
 * Keeps only known keys with valid values.
 * @param {unknown} saved
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function normalizeSettings(saved) {
  const value = saved && typeof saved === 'object' ? saved : {};
  const styleIds = AVATAR_STYLES.map((style) => style.id);
  return {
    avatarStyle: styleIds.includes(value.avatarStyle)
      ? value.avatarStyle
      : DEFAULT_SETTINGS.avatarStyle,
    appearance: APPEARANCES.includes(value.appearance)
      ? value.appearance
      : DEFAULT_SETTINGS.appearance,
    showOrb: typeof value.showOrb === 'boolean' ? value.showOrb : DEFAULT_SETTINGS.showOrb,
    shakeToOpen:
      typeof value.shakeToOpen === 'boolean' ? value.shakeToOpen : DEFAULT_SETTINGS.shakeToOpen,
  };
}

/** Native only: keeps system UI (keyboard, alerts) in step. useTheme reads the setting itself. */
function applyAppearance(appearance) {
  if (typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(appearance === 'auto' ? 'unspecified' : appearance);
}

export async function restoreSettings() {
  const settings = normalizeSettings(await loadJson(STORAGE_KEY));
  settingsStore.set(settings);
  applyAppearance(settings.appearance);
}

/**
 * @param {Partial<typeof DEFAULT_SETTINGS>} patch
 */
export async function updateSettings(patch) {
  const next = normalizeSettings({ ...settingsStore.get(), ...patch });
  settingsStore.set(next);
  if ('appearance' in patch) applyAppearance(next.appearance);
  log.state(
    `settings: ${Object.entries(patch)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')}`,
  );
  await saveJson(STORAGE_KEY, next);
}
