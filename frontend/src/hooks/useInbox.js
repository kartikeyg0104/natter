/**
 * useInbox: one list of every conversation for the Inbox tab, built from the
 * chat list (useConversations) and what the inbox checker knows (latest
 * message, unread). Display-ready rows, newest activity first.
 */
import { byActivity, unreadSummary } from '../inbox/inboxSummary';
import { messagePreview, totalUnread } from '../inbox/inboxLogic';
import { inboxStore } from '../inbox/inboxStore';
import { conversationTitle, memberNames } from '../utils/conversationTitle';
import { formatChatTime } from '../utils/format';
import { useConversations } from './useConversations';
import { useNow } from './useNow';
import { useStore } from './useStore';
import { isMuted, peopleStore, prefsStore, streaksStore } from '../store/socialStores';

/** Times like "9:41 am" and "Yesterday" only need a refresh each minute. */
const CLOCK_TICK_MS = 60000;

function senderLabel(message, myId, usersById) {
  if (!message) return '';
  if (message.senderId === myId) return 'You';
  return usersById[message.senderId]?.name ?? 'Someone';
}

/**
 * @param {{ archived?: boolean }} [options] true lists only archived chats
 */
/** "zara turned on…" with "You" or the name you saved for them. */
function systemLine(message, myId, usersById) {
  const user = usersById[message.senderId];
  const username = user?.username ?? user?.name ?? '';
  const content = message.content ?? '';
  if (!username || !content.startsWith(username)) return content;
  return (message.senderId === myId ? 'You' : user.name) + content.slice(username.length);
}

export function useInbox({ archived = false } = {}) {
  const chats = useConversations();
  const byChat = useStore(inboxStore, (state) => state.byChat);
  const prefs = useStore(prefsStore, (state) => state.byChat);
  const typing = useStore(peopleStore, (state) => state.typing);
  const streaks = useStore(streaksStore, (state) => state.byChat);
  const now = useNow(CLOCK_TICK_MS);
  const { myId, usersById } = chats;

  const all = byActivity([...chats.dms, ...chats.groups], byChat);
  const archivedCount = all.filter((chat) => prefs[chat.id]?.archived).length;
  const rows = all
    .filter((chat) => Boolean(prefs[chat.id]?.archived) === archived)
    .map((chat) => {
    const entry = byChat[chat.id];
    const latest = entry?.latest ?? null;
    const isGroup = chat.type === 'GROUP';
    const text = messagePreview(latest);
    const who = senderLabel(latest, myId, usersById);
    let preview = text;
    if (latest?.type === 'SYSTEM') preview = systemLine(latest, myId, usersById);
    else if (text && isGroup) preview = `${who}: ${text}`;
    else if (text && latest?.senderId === myId) preview = `You: ${text}`;
    const pref = prefs[chat.id];
    const typingIds = typing[chat.id] ?? [];
    const typingText = typingIds.length
      ? isGroup
        ? `${usersById[typingIds[0]]?.name ?? 'Someone'} is typing…`
        : 'typing…'
      : '';
    return {
      id: chat.id,
      pinned: Boolean(pref?.pinned),
      archived: Boolean(pref?.archived),
      streak: streaks[chat.id]?.count ?? 0,
      streakEnding: Boolean(streaks[chat.id]?.expiresSoon),
      isSnap:
        Boolean(latest?.viewOnce) &&
        !latest?.deleted &&
        latest?.senderId !== myId &&
        !(latest?.openedBy ?? []).includes(myId),
      muted: isMuted(pref, now),
      typing: typingText,
      kind: isGroup ? 'group' : 'direct',
      title: conversationTitle(chat, myId, usersById),
      names: isGroup ? memberNames(chat, myId, usersById) : [],
      // Until the first background check reports, say nothing rather than guess "no messages".
      preview: preview || (entry ? (isGroup ? 'No messages yet' : 'Say hello') : ''),
      hasMessages: Boolean(text),
      time: latest ? formatChatTime(latest.createdAt, now) : '',
      unread: entry?.unread ?? 0,
    };
  });

  // Pinned chats stay on top, most recently pinned first.
  rows.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) {
      return (Date.parse(prefs[b.id]?.pinnedAt ?? '') || 0) - (Date.parse(prefs[a.id]?.pinnedAt ?? '') || 0);
    }
    return 0;
  });

  const total = totalUnread(byChat);
  return {
    ...chats,
    rows,
    archivedCount,
    myName: usersById[myId]?.name ?? '',
    summary: unreadSummary(total),
  };
}
