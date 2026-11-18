/**
 * persist: saves small JSON values in expo-secure-store (the iOS Keychain /
 * Android Keystore). Used for the session, which includes the password
 * because the backend wants it on every request. The web build (used for
 * testing in a browser) has no secure store, so it falls back to
 * localStorage there.
 * Failures are logged and reported as "nothing saved"; they never crash.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { log } from '../utils/logger';

const webStore = {
  getItemAsync: async (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItemAsync: async (key, value) => globalThis.localStorage?.setItem(key, value),
  deleteItemAsync: async (key) => globalThis.localStorage?.removeItem(key),
};

const store = Platform.OS === 'web' ? webStore : SecureStore;

/**
 * @param {string} key
 * @returns {Promise<any | null>} the saved value, or null when missing or unreadable
 */
export async function loadJson(key) {
  try {
    const text = await store.getItemAsync(key);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    log.warn(`persist: could not read "${key}": ${error?.message ?? error}`);
    return null;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<boolean>} true when saved
 */
export async function saveJson(key, value) {
  try {
    await store.setItemAsync(key, JSON.stringify(value));
    return true;
  } catch (error) {
    log.warn(`persist: could not save "${key}": ${error?.message ?? error}`);
    return false;
  }
}

/** @param {string} key */
export async function removeKey(key) {
  try {
    await store.deleteItemAsync(key);
  } catch (error) {
    log.warn(`persist: could not delete "${key}": ${error?.message ?? error}`);
  }
}
