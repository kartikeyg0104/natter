/**
 * Stores for the Natter-only features. Each is a small createStore plus the
 * actions that change it, so screens stay thin.
 *
 *   featuresStore  what the server supports (GET /capabilities)
 *   meStore        your phone number, about and photo
 *   peopleStore    everyone's about, photo and presence; who is typing where
 *   contactsStore  your saved contacts
 *   blocksStore    who you blocked
 *   prefsStore     per-chat pin / mute / archive / cleared
 *   statusStore    24-hour updates
 *
 * Everything resets on sign out.
 */
import { friendlyMessage } from '../api/ApiError';
import * as api from '../api/social';
import { log } from '../utils/logger';
import { createStore } from './createStore';
import { sessionStore } from './sessionStore';

// ─── Features ──────────────────────────────────────────────────────────────
export const featuresStore = createStore({ status: 'idle', features: [] });

export async function loadFeatures() {
  try {
    const result = await api.getCapabilities();
    featuresStore.set({ status: 'ready', features: result?.features ?? [] });
    log.state(`features: ${(result?.features ?? []).join(', ') || 'none'}`);
  } catch {
    // A server without /capabilities only has the basic routes.
    featuresStore.set({ status: 'ready', features: [] });
    log.state('features: basic server');
  }
}

/** @param {string} name */
export function hasFeature(name) {
  return featuresStore.get().features.includes(name);
}

// ─── Me ────────────────────────────────────────────────────────────────────
export const meStore = createStore({ status: 'idle', me: null });

export async function loadMe() {
  if (!hasFeature('profile')) return;
  try {
    meStore.set({ status: 'ready', me: await api.getMe() });
  } catch (error) {
    log.warn(`profile: ${friendlyMessage(error)}`);
  }
}

/** @param {{ phone_number?: string, about?: string, avatar_file_id?: string | null }} patch */
export async function saveMe(patch) {
  const me = await api.updateMe(patch);
  meStore.set({ status: 'ready', me });
  log.state(`profile: saved ${Object.keys(patch).join(', ')}`);
  loadPeople();
  return me;
}

// ─── People and presence ──────────────────────────────────────────────────
export const peopleStore = createStore({
  byId: {}, // id -> { about, avatarFileId, lastSeenAt, online }
  typing: {}, // conversationId -> userIds
});

export async function loadPeople({ isPoll = false } = {}) {
  if (!hasFeature('people')) return;
  try {
    const people = await api.listPeople({ isPoll });
    const byId = Object.fromEntries(people.map((person) => [person.id, person]));
    peopleStore.set({ byId });
  } catch {
    // presence is a nice-to-have; the next poll tries again
  }
}

export async function pollPresence() {
  if (!hasFeature('presence')) return;
  try {
    const { typing, online } = await api.getPresence();
    peopleStore.set((state) => {
      const byId = { ...state.byId };
      Object.entries(online ?? {}).forEach(([id, value]) => {
        byId[id] = { ...(byId[id] ?? { id }), ...value };
      });
      return { byId, typing: typing ?? {} };
    });
  } catch {
    // ignored: the next poll tries again
  }
}

let lastTypingSent = 0;
/** Tells the server you're typing; at most every 3 s. */
export function reportTyping(conversationId) {
  if (!hasFeature('presence')) return;
  const now = Date.now();
  if (now - lastTypingSent < 3000) return;
  lastTypingSent = now;
  api.sendTyping(conversationId).catch(() => {});
}

// ─── Contacts ─────────────────────────────────────────────────────────────
export const contactsStore = createStore({ status: 'idle', contacts: [], error: '' });

export async function loadContacts() {
  if (!hasFeature('contacts')) return;
  if (contactsStore.get().status === 'idle') contactsStore.set({ status: 'loading' });
  try {
    contactsStore.set({ status: 'ready', contacts: await api.listContacts(), error: '' });
  } catch (error) {
    contactsStore.set({ status: 'error', error: friendlyMessage(error) });
  }
}

export async function saveContact({ id, name, phoneNumber }) {
  const saved = id
    ? await api.editContact(id, { name, phoneNumber })
    : await api.addContact({ name, phoneNumber });
  await loadContacts();
  log.state(`contacts: ${id ? 'edited' : 'saved'} ${saved.name}`);
  return saved;
}

export async function deleteContact(id) {
  await api.removeContact(id);
  await loadContacts();
}

/** @param {string} userId */
export function contactForUser(userId) {
  return contactsStore.get().contacts.find((contact) => contact.userId === userId) ?? null;
}

// ─── Blocks ───────────────────────────────────────────────────────────────
export const blocksStore = createStore({ userIds: [] });

export async function loadBlocks() {
  if (!hasFeature('blocks')) return;
  try {
    blocksStore.set({ userIds: (await api.listBlocks()).userIds ?? [] });
  } catch {
    // keep what we had
  }
}

export async function setBlocked(userId, blocked) {
  const result = blocked ? await api.blockUser(userId) : await api.unblockUser(userId);
  blocksStore.set({ userIds: result.userIds ?? [] });
  log.state(`blocks: ${blocked ? 'blocked' : 'unblocked'} ${userId}`);
}

// ─── Chat prefs ───────────────────────────────────────────────────────────
export const prefsStore = createStore({ byChat: {} });

export async function loadPrefs({ isPoll = false } = {}) {
  if (!hasFeature('chat-prefs')) return;
  try {
    const prefs = await api.listChatPrefs({ isPoll });
    prefsStore.set({ byChat: Object.fromEntries(prefs.map((pref) => [pref.conversationId, pref])) });
  } catch {
    // keep what we had
  }
}

/**
 * @param {string} conversationId
 * @param {{ pinned?: boolean, archived?: boolean, muted_until?: string | null, clear?: boolean }} patch
 */
export async function updatePref(conversationId, patch) {
  const pref = await api.updateChatPref(conversationId, patch);
  prefsStore.set((state) => ({ byChat: { ...state.byChat, [conversationId]: pref } }));
  log.state(`chat ${conversationId.slice(-6)}: ${Object.keys(patch).join(', ')}`);
  return pref;
}

/** @param {{ mutedUntil?: string | null } | undefined} pref */
export function isMuted(pref, now = Date.now()) {
  return Boolean(pref?.mutedUntil) && Date.parse(pref.mutedUntil) > now;
}

// ─── Status ───────────────────────────────────────────────────────────────
export const statusStore = createStore({ status: 'idle', mine: [], others: [] });

export async function loadStatus({ isPoll = false } = {}) {
  if (!hasFeature('status')) return;
  if (statusStore.get().status === 'idle') statusStore.set({ status: 'loading' });
  try {
    const { mine, others } = await api.listStatus({ isPoll });
    statusStore.set({ status: 'ready', mine: mine ?? [], others: others ?? [] });
  } catch {
    if (statusStore.get().status === 'loading') statusStore.set({ status: 'ready' });
  }
}

/** Marks one item seen locally and on the server. */
export function markStatusViewed(item) {
  if (item.viewed) return;
  api.viewStatus(item.id).catch(() => {});
  statusStore.set((state) => ({
    others: state.others.map((group) => {
      const items = group.items.map((entry) => (entry.id === item.id ? { ...entry, viewed: true } : entry));
      return { ...group, items, allViewed: items.every((entry) => entry.viewed) };
    }),
  }));
}

// ─── Streaks ──────────────────────────────────────────────────────────────
export const streaksStore = createStore({ byChat: {} });

export async function loadStreaks({ isPoll = false } = {}) {
  if (!hasFeature('streaks')) return;
  try {
    streaksStore.set({ byChat: (await api.listStreaks({ isPoll })) ?? {} });
  } catch {
    // keep what we had
  }
}

// ─── Screenshots ──────────────────────────────────────────────────────────
let lastScreenshotAt = 0;
/** Tells the chat someone took a screenshot (at most once every 3 s). */
export function reportScreenshot(conversationId) {
  if (!hasFeature('screenshots') || !conversationId) return;
  const now = Date.now();
  if (now - lastScreenshotAt < 3000) return;
  lastScreenshotAt = now;
  api.reportScreenshot(conversationId).catch(() => {});
  log.app(`screenshot reported in ${conversationId.slice(-6)}`);
}

// ─── Lifecycle ────────────────────────────────────────────────────────────
/** Everything the Natter extras need after sign in. */
export async function loadSocial() {
  await loadFeatures();
  await Promise.all([loadMe(), loadPeople(), loadContacts(), loadBlocks(), loadPrefs(), loadStatus(), loadStreaks()]);
}

sessionStore.subscribe((session) => {
  if (session.status !== 'signedOut') return;
  [featuresStore, meStore, peopleStore, contactsStore, blocksStore, prefsStore, statusStore, streaksStore].forEach(
    (store) => store.reset(),
  );
});
