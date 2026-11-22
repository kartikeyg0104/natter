/**
 * notify: one named call per moment the banner reacts to, so screens stay
 * one line: `notifyCopied()`, `notifyPhotoDone(true)`. Haptics fire here.
 */
import { AccessibilityInfo } from 'react-native';
import { haptics } from '../utils/haptics';
import { dismissAlert, showAlert, showToast } from './alertStore';

const COPIED_MS = 1200;
const RESTORED_MS = 1500;
const MESSAGE_MS = 4500;
const NEW_CHAT_MS = 5000;
const UPLOAD_KEY = 'upload';

export function notifyCopied() {
  showToast({ title: 'Copied', icon: 'copy' }, COPIED_MS);
}

/** @param {string} chatId */
export function notifyPhotoStarted(chatId) {
  showAlert({ key: UPLOAD_KEY, kind: 'upload', title: 'Sending photo…', chatId });
}

/** @param {boolean} isOk */
export function notifyPhotoDone(isOk) {
  dismissAlert(UPLOAD_KEY);
  if (isOk) {
    haptics.success();
    showToast({ title: 'Photo sent', icon: 'image' });
  }
}

/**
 * @param {string} chatId
 * @param {number} count failed messages in that chat; 0 clears it
 * @param {() => void} [onRetry]
 */
export function notifyFailed(chatId, count, onRetry) {
  const key = `failed:${chatId}`;
  if (!count) {
    dismissAlert(key);
    return;
  }
  haptics.error();
  showAlert({
    key,
    kind: 'failed',
    tone: 'danger',
    title: count === 1 ? '1 message not sent' : `${count} messages not sent`,
    detail: 'Tap to send again',
    onPress: onRetry,
  });
}

/** @param {'online' | 'reconnecting' | 'restored'} state */
export function notifyConnection(state) {
  if (state === 'reconnecting') {
    showAlert({ key: 'connection', kind: 'connection', tone: 'warn', title: 'Connection lost', detail: 'Trying again…' });
  } else if (state === 'restored') {
    showAlert({ key: 'connection', kind: 'connection', tone: 'success', title: 'Back online' }, { ttlMs: RESTORED_MS });
  } else {
    dismissAlert('connection');
  }
}

/**
 * @param {{ chatId: string, title: string, sender: string, preview: string,
 *           count: number, isGroup: boolean, previousCount?: number }} news
 */
export function notifyMessage({ chatId, title, sender, preview, count, isGroup, previousCount = 0 }) {
  const total = previousCount + count;
  haptics.tap();
  showAlert(
    {
      key: `msg:${chatId}`,
      kind: 'message',
      chatId,
      title,
      sender,
      isGroup,
      count: total,
      detail: isGroup ? `${sender}: ${preview}` : preview,
    },
    { ttlMs: MESSAGE_MS },
  );
  AccessibilityInfo.announceForAccessibility?.(
    `New message from ${isGroup ? `${sender} in ${title}` : title}: ${preview}`,
  );
}

/** @param {{ chatId: string, title: string, by: string }} chat */
export function notifyNewChat({ chatId, title, by }) {
  showAlert(
    {
      key: `new:${chatId}`,
      kind: 'newChat',
      chatId,
      title,
      detail: by ? `${by} started this chat with you` : 'New chat',
    },
    { ttlMs: NEW_CHAT_MS },
  );
}

/** @param {string} name */
export function notifySignedIn(name) {
  showToast({ title: `Signed in as ${name}`, icon: 'user' });
}

/** @param {string} name */
export function notifyGroupCreated(name) {
  showToast({ title: 'Group created', detail: name, icon: 'group' });
}
