/**
 * useTheme: the colour set for the current appearance. Follows the phone's
 * light/dark setting unless You > Theme picks one.
 */
import { useColorScheme } from 'react-native';
import { themes } from '../constants/theme';
import { settingsStore } from '../store/settingsStore';
import { useStore } from './useStore';

/**
 * @returns {{ colors: typeof themes.light, scheme: 'light' | 'dark', isDark: boolean }}
 */
export function useTheme() {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const appearance = useStore(settingsStore, (state) => state.appearance);
  const scheme = appearance === 'light' || appearance === 'dark' ? appearance : system;
  return { colors: themes[scheme], scheme, isDark: scheme === 'dark' };
}
