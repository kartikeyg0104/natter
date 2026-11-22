/**
 * alertStore: what the top banner shows.
 *   alerts   live alerts (see alertQueue)
 *   toast    a short confirmation ("Photo sent") that briefly takes the banner
 * Any module can call these; the Banner component only reads the state.
 */
import { createStore } from '../store/createStore';
import { sessionStore } from '../store/sessionStore';
import { expireAlerts, nextExpiry, removeAlert, upsertAlert } from './alertQueue';

export const TOAST_MS = 1800;

export const alertStore = createStore({ alerts: [], toast: null });

let expiryTimer = null;
let toastTimer = null;

function scheduleExpiry() {
  clearTimeout(expiryTimer);
  const at = nextExpiry(alertStore.get().alerts);
  if (at === null) return;
  expiryTimer = setTimeout(() => {
    alertStore.set((state) => ({ alerts: expireAlerts(state.alerts, Date.now()) }));
    scheduleExpiry();
  }, Math.max(0, at - Date.now()));
}

/**
 * @param {object} alert { key, kind, title, ... }
 * @param {{ ttlMs?: number }} [options]
 */
export function showAlert(alert, { ttlMs } = {}) {
  const now = Date.now();
  const next = ttlMs ? { ...alert, expiresAt: now + ttlMs } : alert;
  alertStore.set((state) => ({ alerts: upsertAlert(state.alerts, next, now) }));
  scheduleExpiry();
}

export function dismissAlert(key) {
  alertStore.set((state) => ({ alerts: removeAlert(state.alerts, key) }));
  scheduleExpiry();
}

/**
 * @param {{ title: string, detail?: string, icon?: string, tone?: string }} toast
 * @param {number} [holdMs]
 */
export function showToast(toast, holdMs = TOAST_MS) {
  clearTimeout(toastTimer);
  alertStore.set({ toast: { tone: 'success', ...toast, id: Date.now() } });
  toastTimer = setTimeout(() => alertStore.set({ toast: null }), holdMs);
}

export function clearToast() {
  clearTimeout(toastTimer);
  alertStore.set({ toast: null });
}

export function resetAlerts() {
  clearTimeout(expiryTimer);
  clearTimeout(toastTimer);
  alertStore.reset();
}

sessionStore.subscribe((session) => {
  if (session.status === 'signedOut' && alertStore.get().alerts.length) resetAlerts();
});
