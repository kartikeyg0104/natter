/**
 * inboxSummary: pure helpers for the Inbox: the unread line under the title,
 * chats ordered by activity, and the filter chips.
 */

/**
 * @param {{ messages: number, chats: number }} total from totalUnread
 * @returns {string}
 */
export function unreadSummary({ messages, chats }) {
  if (!messages) return 'Nothing unread';
  if (chats <= 1) return `${messages} unread`;
  return `${messages} unread across ${chats} chats`;
}

function activityTime(chat, byChat) {
  return Date.parse(byChat[chat.id]?.latest?.createdAt ?? '') || Date.parse(chat.createdAt) || 0;
}

/**
 * Newest activity first: the latest message if the inbox knows it, else when
 * the chat was created. Returns a new array.
 * @param {{ id: string, createdAt: string }[]} chats
 * @param {Record<string, { latest?: { createdAt: string } }>} byChat
 */
export function byActivity(chats, byChat) {
  return [...chats].sort((a, b) => activityTime(b, byChat) - activityTime(a, byChat));
}

export const INBOX_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'direct', label: 'Direct' },
  { value: 'groups', label: 'Groups' },
];

/**
 * @param {{ kind: 'direct' | 'group', unread: number, title: string, preview: string }[]} rows
 * @param {'all' | 'unread' | 'direct' | 'groups'} filter
 * @param {string} [query] matched against title and preview, case-insensitive
 */
export function filterInbox(rows, filter, query = '') {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter === 'unread' && !row.unread) return false;
    if (filter === 'direct' && row.kind !== 'direct') return false;
    if (filter === 'groups' && row.kind !== 'group') return false;
    if (!needle) return true;
    return row.title.toLowerCase().includes(needle) || row.preview.toLowerCase().includes(needle);
  });
}
