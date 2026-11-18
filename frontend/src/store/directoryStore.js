/**
 * directoryStore: everyone on the server (GET /user), shared by the Inbox,
 * Contacts and conversations. Loaded once and refreshed on pull-to-refresh,
 * or when a conversation mentions someone new.
 *
 * Each user is shown the way you know them: when you saved their number,
 * `name` is your contact name (the server's name stays in `username`).
 * Their photo, about and presence are merged in from peopleStore.
 */
import { friendlyMessage } from '../api/ApiError';
import { listUsers } from '../api/users';
import { indexById } from '../utils/conversationTitle';
import { log } from '../utils/logger';
import { createStore } from './createStore';
import { sessionStore } from './sessionStore';
import { contactsStore, peopleStore } from './socialStores';

const initialState = { raw: [], users: [], byId: {}, avatarByName: {}, presetByName: {}, status: 'idle', error: '' };

export const directoryStore = createStore(initialState);

let inFlight = null;

/**
 * Loads the user list. Calls made while one is running share it.
 * @param {{ isPoll?: boolean }} [options]
 */
export function loadUsers({ isPoll = false } = {}) {
  if (inFlight) return inFlight;
  if (directoryStore.get().status === 'idle') directoryStore.set({ status: 'loading' });

  inFlight = listUsers({ isPoll })
    .then((users) => {
      directoryStore.set({ raw: users, status: 'ready', error: '' });
      rebuild();
      log.state(`directory: ${users.length} users`, { isPoll, toConsole: !isPoll });
    })
    .catch((error) => {
      directoryStore.set({ status: 'error', error: friendlyMessage(error) });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Applies contact names and profile details to the raw user list. */
function rebuild() {
  const { raw } = directoryStore.get();
  const savedNames = {};
  contactsStore.get().contacts.forEach((contact) => {
    if (contact.userId) savedNames[contact.userId] = contact.name;
  });
  const people = peopleStore.get().byId;
  const users = raw.map((user) => {
    const extra = people[user.id] ?? {};
    return {
      ...user,
      username: user.name,
      name: savedNames[user.id] ?? user.name,
      isSaved: Boolean(savedNames[user.id]),
      about: extra.about ?? user.bio ?? null,
      avatarFileId: extra.avatarFileId ?? null,
      avatarPreset: extra.avatarPreset ?? null,
    };
  });
  const avatarByName = {};
  const presetByName = {};
  users.forEach((user) => {
    if (user.avatarFileId) {
      avatarByName[user.name] = user.avatarFileId;
      avatarByName[user.username] = user.avatarFileId;
    } else if (user.avatarPreset) {
      presetByName[user.name] = user.avatarPreset;
      presetByName[user.username] = user.avatarPreset;
    }
  });
  directoryStore.set({ users, byId: indexById(users), avatarByName, presetByName });
}

let lastContacts = null;
contactsStore.subscribe((state) => {
  if (state.contacts === lastContacts) return;
  lastContacts = state.contacts;
  rebuild();
});
let lastAvatars = '';
peopleStore.subscribe((state) => {
  // presence changes every few seconds; only rebuild when photos or about change
  const key = Object.values(state.byId)
    .map((person) => `${person.id}:${person.avatarFileId ?? ''}:${person.avatarPreset ?? ''}:${person.about ?? ''}`)
    .join('|');
  if (key === lastAvatars) return;
  lastAvatars = key;
  rebuild();
});

/** @param {string[]} ids */
export function hasUnknownUsers(ids) {
  const { byId } = directoryStore.get();
  return ids.some((id) => !byId[id]);
}

sessionStore.subscribe((session) => {
  if (session.status === 'signedOut') directoryStore.reset();
});
