/**
 * baseUrl: which backend to talk to.
 * - "lan": the backend on the computer running Metro, worked out from Expo's
 *   hostUri every launch (the laptop's Wi-Fi address can change).
 * - "custom": an address typed in, such as the class server.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { BACKEND_PORT } from '../constants/config';
import { lanUrlFromHostUri, normalizeServerUrl } from '../utils/serverUrl';

/**
 * The laptop's backend URL, or null when it cannot be worked out (tunnel mode,
 * release build). In a web browser it is the host the page came from.
 */
export function lanBaseUrl() {
  if (Platform.OS === 'web' && globalThis.location?.hostname) {
    return `http://${globalThis.location.hostname}:${BACKEND_PORT}`;
  }
  return lanUrlFromHostUri(Constants.expoConfig?.hostUri);
}

/**
 * @param {'lan' | 'custom'} serverMode
 * @param {string} customUrl
 * @returns {string | null}
 */
export function resolveBaseUrl(serverMode, customUrl) {
  if (serverMode === 'lan') return lanBaseUrl();
  const result = normalizeServerUrl(customUrl);
  return 'url' in result ? result.url : null;
}
