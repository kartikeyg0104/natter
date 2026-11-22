/**
 * useAlertFeeds: connects the app's live sources to the top banner:
 * - the inbox checker's new messages  -> "zara: are you coming?"
 * - a chat that appears in the list   -> "ishaan started this chat with you"
 * - the chats poll's connection state -> "Connection lost" / "Back online"
 * Mounted once, by the Banner. Plain subscriptions, no rendering.
 */
import { useEffect } from 'react';
import { messagePreview } from '../inbox/inboxLogic';
import { onInboxNews } from '../inbox/inboxStore';
import { notifyConnection, notifyMessage, notifyNewChat } from '../alerts/notify';
import { alertStore } from '../alerts/alertStore';
import { chatsStore } from '../store/chatsStore';
import { directoryStore } from '../store/directoryStore';
import { sessionStore } from '../store/sessionStore';
import { conversationTitle } from '../utils/conversationTitle';
import { isMuted, prefsStore } from '../store/socialStores';

function nameOf(userId) {
  return directoryStore.get().byId[userId]?.name ?? 'someone';
}

function handleNews({ chatId, messages }) {
  const chat = chatsStore.get().conversations.find((item) => item.id === chatId);
  if (!chat) return;
  if (isMuted(prefsStore.get().byChat[chatId])) return; // muted: no banner, the unread count still shows
  const myId = sessionStore.get().user?.id ?? '';
  const latest = messages.at(-1);
  const isGroup = chat.type === 'GROUP';
  const previous = alertStore.get().alerts.find((item) => item.key === `msg:${chatId}`);
  notifyMessage({
    chatId,
    title: conversationTitle(chat, myId, directoryStore.get().byId),
    sender: nameOf(latest.senderId),
    preview: messagePreview(latest),
    count: messages.length,
    isGroup,
    previousCount: previous?.count ?? 0,
  });
}


export function useAlertFeeds() {
  useEffect(() => onInboxNews(handleNews), []);

  useEffect(() => {
    let knownIds = null;
    let lastConnection = chatsStore.get().connection;

    return chatsStore.subscribe((state) => {
      if (state.connection !== lastConnection) {
        lastConnection = state.connection;
        notifyConnection(state.connection);
      }
      if (state.status === 'idle') knownIds = null; // signed out: the next user starts fresh
      if (state.status !== 'ready') return;

      const ids = state.conversations.map((chat) => chat.id);
      if (knownIds === null) {
        knownIds = new Set(ids); // first load: everything is already known
        return;
      }
      const myId = sessionStore.get().user?.id ?? '';
      state.conversations
        .filter((chat) => !knownIds.has(chat.id) && chat.createdBy !== myId)
        .forEach((chat) =>
          notifyNewChat({
            chatId: chat.id,
            title: conversationTitle(chat, myId, directoryStore.get().byId),
            by: chat.createdBy ? nameOf(chat.createdBy) : '',
          }),
        );
      knownIds = new Set(ids);
    });
  }, []);
}
