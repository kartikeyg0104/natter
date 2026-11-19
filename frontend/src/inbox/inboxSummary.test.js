import { byActivity, filterInbox, unreadSummary } from './inboxSummary';

describe('unreadSummary', () => {
  it.each([
    [{ messages: 0, chats: 0 }, 'Nothing unread'],
    [{ messages: 1, chats: 1 }, '1 unread'],
    [{ messages: 4, chats: 1 }, '4 unread'],
    [{ messages: 3, chats: 2 }, '3 unread across 2 chats'],
  ])('%j -> %s', (total, text) => expect(unreadSummary(total)).toBe(text));
});

const at = (minute) => new Date(2026, 10, 10, 12, minute).toISOString();

describe('byActivity', () => {
  const chats = [
    { id: 'a', createdAt: at(1) },
    { id: 'b', createdAt: at(2) },
    { id: 'c', createdAt: at(3) },
  ];
  it('puts the chat with the newest message first, then newest created', () => {
    const byChat = { a: { latest: { createdAt: at(50) } }, b: { latest: { createdAt: at(10) } } };
    expect(byActivity(chats, byChat).map((chat) => chat.id)).toEqual(['a', 'b', 'c']);
  });
  it('does not change the input array', () => {
    const copy = [...chats];
    byActivity(chats, {});
    expect(chats).toEqual(copy);
  });
});

describe('filterInbox', () => {
  const rows = [
    { id: '1', kind: 'direct', unread: 2, title: 'zara', preview: 'see you at lab' },
    { id: '2', kind: 'group', unread: 0, title: 'Exam prep', preview: 'tara: notes uploaded' },
    { id: '3', kind: 'direct', unread: 0, title: 'noor', preview: 'ok' },
  ];
  const ids = (list) => list.map((row) => row.id);
  it('filters by kind and unread', () => {
    expect(ids(filterInbox(rows, 'all'))).toEqual(['1', '2', '3']);
    expect(ids(filterInbox(rows, 'unread'))).toEqual(['1']);
    expect(ids(filterInbox(rows, 'direct'))).toEqual(['1', '3']);
    expect(ids(filterInbox(rows, 'groups'))).toEqual(['2']);
  });
  it('searches titles and previews', () => {
    expect(ids(filterInbox(rows, 'all', 'NOTES'))).toEqual(['2']);
    expect(ids(filterInbox(rows, 'direct', 'noo'))).toEqual(['3']);
  });
});
