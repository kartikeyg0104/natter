/**
 * useScreenshotAlert: calls `onScreenshot` when the user takes a screenshot
 * while this screen is open. Phones only: browsers can't detect screenshots,
 * so on web it does nothing.
 */
import { addScreenshotListener } from 'expo-screen-capture';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { log } from '../utils/logger';

/** @param {() => void} onScreenshot */
export function useScreenshotAlert(onScreenshot) {
  const latest = useRef(onScreenshot);
  useEffect(() => {
    latest.current = onScreenshot;
  });

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let subscription;
    try {
      subscription = addScreenshotListener(() => latest.current());
    } catch (error) {
      log.warn(`screenshot alerts unavailable: ${error?.message ?? error}`);
    }
    return () => subscription?.remove?.();
  }, []);
}
