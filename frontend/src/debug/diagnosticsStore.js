/**
 * diagnosticsStore: Diagnostics panel's state.
 *   isOpen       the sheet is open
 *   tab          overview | flow | network | logs | tools
 *   requestId    the request open in network's detail view (devtools style)
 *   replayId     the request the flow tab replays step by step
 *   seenLogId    newest app log id the user has seen (the orb's error badge)
 */
import { log } from '../utils/logger';
import { createStore } from '../store/createStore';
import { logStore } from './logStore';

export const DIAGNOSTICS_TABS = ['overview', 'flow', 'network', 'logs', 'tools'];

export const diagnosticsStore = createStore({
  isOpen: false,
  tab: 'overview',
  requestId: null,
  replayId: null,
  seenLogId: 0,
});

function newestLogId() {
  const { entries } = logStore.get();
  return entries.length ? Number(entries[entries.length - 1].id) : 0;
}

/** @param {'shortcut' | 'shake' | 'profile' | 'banner'} via */
export function openDiagnostics(via) {
  if (diagnosticsStore.get().isOpen) return;
  log.nav(`diagnostics opened (${via})`);
  diagnosticsStore.set({ isOpen: true, seenLogId: newestLogId() });
}

export function closeDiagnostics() {
  if (!diagnosticsStore.get().isOpen) return;
  diagnosticsStore.set({ isOpen: false, seenLogId: newestLogId() });
  log.nav('diagnostics closed');
}

/** @param {string} tab */
export function setDiagnosticsTab(tab) {
  if (DIAGNOSTICS_TABS.includes(tab)) diagnosticsStore.set({ tab });
}

/**
 * Opens one request in the network tab's detail view.
 * @param {string} id request id
 */
export function openRequest(id) {
  diagnosticsStore.set({ tab: 'network', requestId: id });
}

export function closeRequest() {
  diagnosticsStore.set({ requestId: null });
}

/**
 * Plays one request step by step in the flow tab (null = pick one there).
 * @param {string | null} id
 */
export function replayInFlow(id) {
  diagnosticsStore.set({ tab: 'flow', replayId: id });
}

export function stopReplay() {
  diagnosticsStore.set({ replayId: null });
}
