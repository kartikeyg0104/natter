/**
 * Small text-formatting helpers shared by components. Pure functions, so
 * they are covered by unit tests.
 */

const MAX_BADGE_COUNT = 9;

/**
 * Text for a count badge: nothing for zero, "9+" above nine.
 * @param {number} count
 * @returns {string}
 */
export function formatBadgeCount(count) {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(Math.floor(count));
}

/**
 * Clock time, e.g. "7:55 PM". Formatted by
 * hand because Hermes' Intl support differs between iOS and Android.
 * @param {string | number | Date} value
 * @returns {string} '' for an invalid date
 */
export function formatClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

/**
 * Full timestamp for message details, e.g. "12 Mar 2026, 7:55 PM".
 * @param {string | number | Date} value
 */
export function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${formatClock(date)}`;
}

/**
 * 24-hour time with seconds for log rows, e.g. "09:04:31".
 * @param {string | number | Date} value
 * @returns {string} '' for an invalid date
 */
export function formatLogTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const JUST_NOW_MS = 5 * SECOND;
const WEEK_DAYS = 7;

/**
 * Relative age for log rows, e.g. "now", "12 s ago", "3 min ago".
 * @param {number} time epoch ms
 * @param {number} [now]
 * @returns {string}
 */
export function formatAgo(time, now = Date.now()) {
  const age = Math.max(0, now - time);
  if (age < JUST_NOW_MS) return 'now';
  if (age < MINUTE) return `${Math.floor(age / SECOND)} s ago`;
  if (age < HOUR) return `${Math.floor(age / MINUTE)} min ago`;
  if (age < DAY) return `${Math.floor(age / HOUR)} h ago`;
  return formatClock(time);
}

/**
 * Time beside a chat row: the clock today, "yesterday", a weekday this week,
 * otherwise "12 mar".
 * @param {string | number | Date} value
 * @param {number} [now]
 * @returns {string} '' for an invalid date
 */
export function formatChatTime(value, now = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const daysAgo = Math.ceil((startOfToday.getTime() - date.getTime()) / DAY);
  if (daysAgo <= 0) return formatClock(date);
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < WEEK_DAYS) return 'Sun Mon Tue Wed Thu Fri Sat'.split(' ')[date.getDay()];
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

/**
 * Day heading in a conversation: "Today", "Yesterday", or "Mon 10 Nov".
 * @param {string | number | Date} value
 * @param {number} [now]
 */
export function formatDay(value, now = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const daysAgo = Math.ceil((start.getTime() - date.getTime()) / DAY);
  if (daysAgo <= 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const days = 'Sun Mon Tue Wed Thu Fri Sat'.split(' ');
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  const year = date.getFullYear() === new Date(now).getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}${year}`;
}

/**
 * Presence line under a name: "online", "last seen today at 9:41 AM",
 * "last seen yesterday at 6:02 PM", "last seen 12 Nov", or '' when unknown.
 * @param {{ online?: boolean, lastSeenAt?: string | null } | undefined} presence
 * @param {number} [now]
 */
export function formatPresence(presence, now = Date.now()) {
  if (!presence) return '';
  if (presence.online) return 'online';
  if (!presence.lastSeenAt) return '';
  const day = formatDay(presence.lastSeenAt, now);
  const time = formatClock(presence.lastSeenAt);
  if (day === 'Today') return `last seen today at ${time}`;
  if (day === 'Yesterday') return `last seen yesterday at ${time}`;
  return `last seen ${day.replace(/^\w+ /, '')}`;
}
