/**
 * Endpoints that only the Natter server has (contacts, profile, presence,
 * message actions, chat settings, blocks, status). The app asks
 * GET /capabilities first and only calls these when the server lists them,
 * so it still works against a server that only has the basic routes.
 */
import { request } from './client';

const enc = encodeURIComponent;

export const getCapabilities = () => request('/capabilities');

// Profile
export const getMe = () => request('/me');
/** @param {{ phone_number?: string, about?: string, avatar_file_id?: string | null }} patch */
export const updateMe = (patch) => request('/me', { method: 'PATCH', body: patch });

// People and presence
export const listPeople = ({ isPoll = false } = {}) => request('/people', { isPoll });
export const getPresence = ({ isPoll = true } = {}) => request('/presence', { isPoll });
export const sendTyping = (conversationId) =>
  request('/presence/typing', { method: 'POST', body: { conversation_id: conversationId }, isPoll: true });

// Contacts
export const listContacts = () => request('/contacts');
export const addContact = ({ name, phoneNumber }) =>
  request('/contacts', { method: 'POST', body: { name, phone_number: phoneNumber } });
export const editContact = (id, { name, phoneNumber }) =>
  request(`/contacts/${enc(id)}`, { method: 'PATCH', body: { name, phone_number: phoneNumber } });
export const removeContact = (id) => request(`/contacts/${enc(id)}`, { method: 'DELETE' });
export const lookupNumber = (phoneNumber) =>
  request('/contacts/lookup', { query: { phone_number: phoneNumber } });

// Blocks
export const listBlocks = () => request('/blocks');
export const blockUser = (userId) => request('/blocks', { method: 'POST', body: { user_id: userId } });
export const unblockUser = (userId) => request(`/blocks/${enc(userId)}`, { method: 'DELETE' });

// Chat settings
export const listChatPrefs = ({ isPoll = false } = {}) => request('/chat-prefs', { isPoll });
/** @param {{ pinned?: boolean, archived?: boolean, muted_until?: string | null, clear?: boolean }} patch */
export const updateChatPref = (conversationId, patch) =>
  request(`/chat-prefs/${enc(conversationId)}`, { method: 'PATCH', body: patch });

// Groups
export const renameGroup = (id, name) =>
  request(`/conversation/${enc(id)}`, { method: 'PATCH', body: { name } });
export const addMembers = (id, userIds) =>
  request(`/conversation/${enc(id)}/members`, { method: 'POST', body: { user_ids: userIds } });
export const leaveGroup = (id) => request(`/conversation/${enc(id)}/leave`, { method: 'POST' });

// Message actions
export const reactToMessage = (id, emoji) =>
  request(`/message/${enc(id)}/react`, { method: 'POST', body: { emoji } });
export const editMessage = (id, content) =>
  request(`/message/${enc(id)}`, { method: 'PATCH', body: { content } });
/** @param {'me' | 'everyone'} scope */
export const deleteMessage = (id, scope) =>
  request(`/message/${enc(id)}`, { method: 'DELETE', query: { scope } });
export const starMessage = (id, starred) =>
  request(`/message/${enc(id)}/star`, { method: 'POST', body: { starred } });
export const listStarred = () => request('/message/starred');
export const forwardMessage = (messageId, conversationIds) =>
  request('/message/forward', {
    method: 'POST',
    body: { message_id: messageId, conversation_ids: conversationIds },
  });
export const searchMessages = (conversationId, q) =>
  request('/message/search', { query: { conversation_id: conversationId, q } });

// Status
export const listStatus = ({ isPoll = false } = {}) => request('/status', { isPoll });
/** @param {{ text?: string, background?: string, file_id?: string }} body */
export const postStatus = (body) => request('/status', { method: 'POST', body });
export const viewStatus = (id) => request(`/status/${enc(id)}/view`, { method: 'POST', isPoll: true });
export const statusViewers = (id) => request(`/status/${enc(id)}/viewers`);
export const deleteStatus = (id) => request(`/status/${enc(id)}`, { method: 'DELETE' });

// Snaps, disappearing messages, screenshots, streaks
/** @param {{ conversationId: string, fileId: string, caption?: string, seconds: number }} snap */
export const sendSnap = ({ conversationId, fileId, caption, seconds }) =>
  request('/message', {
    method: 'POST',
    body: {
      conversation_id: conversationId,
      file_id: fileId,
      content: caption || undefined,
      view_once: true,
      view_seconds: seconds,
    },
  });
export const openSnap = (id) => request(`/message/${enc(id)}/open`, { method: 'POST' });
export const reportScreenshot = (conversationId) =>
  request('/message/screenshot', { method: 'POST', body: { conversation_id: conversationId } });
/** @param {0 | 86400 | 604800} seconds */
export const setDisappearing = (conversationId, seconds) =>
  request(`/conversation/${enc(conversationId)}/disappearing`, { method: 'PATCH', body: { seconds } });
export const listStreaks = ({ isPoll = false } = {}) => request('/streaks', { isPoll });
