/**
 * confirmAction: "Are you sure?" with a destructive button. Uses the native
 * alert on phones and the browser's confirm() on web (where Alert buttons
 * do nothing).
 */
import { Alert, Platform } from 'react-native';

/**
 * @param {string} title
 * @param {string} message
 * @param {string} actionLabel
 * @param {() => void} onConfirm
 */
export function confirmAction(title, message, actionLabel, onConfirm) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
