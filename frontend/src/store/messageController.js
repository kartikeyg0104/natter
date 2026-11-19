/**
 * createMessageController: everything one open chat needs, in plain JS so
 * it is testable without React.
 *   loadInitial()  newest page
 *   poll()         newest page again, merged by id (new messages, new receipts)
 *   loadOlder()    the page before the oldest one shown (cursor)
 *   send(text)     optimistic: shows at once, confirmed or marked failed
 *   sendImage(p)   upload (POST /file) then send with file_id; same optimistic flow
 *   sendFile(f)    a document or voice note, same flow as an image
 *   retry(id)      resend a failed message (an uploaded file is not uploaded twice)
 *   replace(m)     put the server's copy of a message in place (after react / edit / star / delete)
 *   remove(id)     drop a message from this phone's view (delete for me)
 * Its state lives in a createStore store, read with useStore.
 */
import { friendlyMessage } from '../api/ApiError';
import { uploadFile } from '../api/files';
import { listMessages, sendMessage } from '../api/messages';
import {
  addLocal,
  confirmLocal,
  localId,
  mergeMessages,
  setLocalState,
} from '../hooks/messageList';
import { isTooLarge, toDataUri } from '../utils/fileData';
import { log } from '../utils/logger';
import { createRequestId } from '../utils/requestId';
import { createStore } from './createStore';
import { primeImage } from './imageCache';

const initialState = {
  messages: [], // newest first
  status: 'loading', // loading | ready | error
  error: '',
  nextCursor: null,
  isLoadingOlder: false,
  isLive: true, // last request to the server worked
  unseen: 0, // messages from others that arrived since markSeen()
};

/** @param {string} id */
const short = (id) => id.slice(-6);

/** The part of a message a reply quote needs. */
function replyRef(message) {
  if (!message) return null;
  return {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    type: message.type,
    deleted: Boolean(message.deleted),
  };
}

/**
 * @param {{ conversationId: string, myId: string }} options
 */
export function createMessageController({ conversationId, myId }) {
  const store = createStore(initialState);
  const tag = `chat ${short(conversationId)}`;

  function apply({ list, added }) {
    const fromOthers = added.filter((message) => message.senderId !== myId).length;
    const fresh = added.map((message) => ({ ...message, isFresh: true }));
    const freshIds = new Set(fresh.map((message) => message.id));
    store.set((state) => ({
      messages: list.map((message) =>
        freshIds.has(message.id) ? fresh.find((item) => item.id === message.id) : message,
      ),
      unseen: state.unseen + fromOthers,
      isLive: true,
    }));
    return added.length;
  }

  async function loadInitial() {
    try {
      const page = await listMessages(conversationId);
      const { list } = mergeMessages([], page.data);
      store.set({
        messages: list,
        nextCursor: page.nextCursor ?? null,
        status: 'ready',
        error: '',
      });
      log.state(`${tag}: ${list.length} messages`);
    } catch (error) {
      store.set({ status: 'error', error: friendlyMessage(error), isLive: false });
    }
  }

  async function poll() {
    try {
      const page = await listMessages(conversationId, { isPoll: true });
      const count = apply(mergeMessages(store.get().messages, page.data));
      if (count) log.state(`${tag}: ${count} new ${count === 1 ? 'message' : 'messages'}`);
      if (store.get().status !== 'ready') store.set({ status: 'ready', error: '' });
    } catch {
      store.set({ isLive: false });
    }
  }

  async function loadOlder() {
    const { nextCursor, isLoadingOlder } = store.get();
    if (!nextCursor || isLoadingOlder) return;
    store.set({ isLoadingOlder: true });
    try {
      const page = await listMessages(conversationId, { cursor: nextCursor });
      const { list } = mergeMessages(store.get().messages, page.data);
      store.set({ messages: list, nextCursor: page.nextCursor ?? null });
      log.state(`${tag}: loaded ${page.data.length} older`);
    } catch (error) {
      log.warn(`${tag}: older messages failed: ${friendlyMessage(error)}`);
    } finally {
      store.set({ isLoadingOlder: false });
    }
  }

  function patchLocal(tempId, patch) {
    store.set((state) => ({
      messages: state.messages.map((message) =>
        message.id === tempId ? { ...message, ...patch } : message,
      ),
    }));
  }

  /** Uploads a local image once and remembers the file id for retries. */
  async function ensureUploaded(local) {
    if (local.fileId || !local.upload) return local.fileId;
    patchLocal(local.id, { uploadStage: 'uploading' });
    const file = await uploadFile(local.upload);
    if (local.type === 'IMAGE') primeImage(file.id, toDataUri(local.upload.mimeType, local.upload.data));
    patchLocal(local.id, { fileId: file.id, uploadStage: 'sending' });
    log.state(`${tag}: uploaded ${file.name} (${file.size} bytes)`);
    return file.id;
  }

  async function deliver(tempId) {
    const local = store.get().messages.find((message) => message.id === tempId);
    try {
      const fileId = await ensureUploaded(local);
      const saved = await sendMessage({
        conversationId,
        content: local.content || undefined,
        fileId,
        replyToId: local.replyTo?.id,
      });
      store.set((state) => ({ messages: confirmLocal(state.messages, tempId, saved) }));
      return true;
    } catch (error) {
      store.set((state) => ({ messages: setLocalState(state.messages, tempId, 'failed') }));
      log.warn(`${tag}: send failed: ${friendlyMessage(error)}`);
      return false;
    }
  }

  function addLocalMessage(fields) {
    const local = {
      id: localId(createRequestId()),
      content: '',
      type: 'TEXT',
      senderId: myId,
      conversationId,
      createdAt: new Date().toISOString(),
      status: {},
      localState: 'sending',
      isFresh: true,
      ...fields,
    };
    store.set((state) => ({ messages: addLocal(state.messages, local) }));
    return local.id;
  }

  /**
   * @param {string} text
   * @param {object | null} [replyTo] the message being answered
   * @returns {Promise<boolean>} whether the server accepted it
   */
  function send(text, replyTo = null) {
    const content = text.trim();
    if (!content) return Promise.resolve(false);
    return deliver(addLocalMessage({ content, replyTo: replyRef(replyTo) }));
  }

  /**
   * A document or voice note.
   * @param {{ uri?: string, data: string, mimeType: string, fileName: string, size?: number }} file
   * @param {object | null} [replyTo]
   */
  async function sendFile({ data, mimeType, fileName, size }, replyTo = null) {
    if (isTooLarge(data)) return { ok: false, error: 'That file is larger than 10 MB.' };
    const tempId = addLocalMessage({
      type: 'FILE',
      upload: { fileName, mimeType, data },
      file: { name: fileName, mimeType, size: size ?? 0 },
      uploadStage: 'uploading',
      replyTo: replyRef(replyTo),
    });
    return { ok: await deliver(tempId) };
  }

  /** @param {object} saved the server's copy after an action */
  function replace(saved) {
    if (!saved?.id) return;
    store.set((state) => ({
      messages: state.messages.map((message) => (message.id === saved.id ? { ...message, ...saved, isFresh: false } : message)),
    }));
  }

  /** @param {string} id */
  function remove(id) {
    store.set((state) => ({ messages: state.messages.filter((message) => message.id !== id) }));
  }

  /**
   * @param {{ uri: string, data: string, mimeType: string, fileName: string }} photo
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  async function sendImage({ uri, data, mimeType, fileName }, replyTo = null) {
    if (isTooLarge(data)) return { ok: false, error: 'That photo is larger than 10 MB.' };
    const tempId = addLocalMessage({
      type: 'IMAGE',
      localUri: uri,
      upload: { fileName, mimeType, data },
      uploadStage: 'uploading',
      replyTo: replyRef(replyTo),
    });
    return { ok: await deliver(tempId) };
  }

  /** @param {string} tempId a failed local message */
  function retry(tempId) {
    const message = store.get().messages.find((item) => item.id === tempId);
    if (!message || message.localState !== 'failed') return Promise.resolve(false);
    store.set((state) => ({ messages: setLocalState(state.messages, tempId, 'sending') }));
    return deliver(tempId);
  }

  function markSeen() {
    if (store.get().unseen) store.set({ unseen: 0 });
  }

  return {
    store,
    loadInitial,
    poll,
    loadOlder,
    send,
    sendImage,
    sendFile,
    retry,
    markSeen,
    replace,
    remove,
  };
}
