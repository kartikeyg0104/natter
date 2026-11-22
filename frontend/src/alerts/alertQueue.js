/**
 * alertQueue: pure rules for the banner stack.
 *
 * An alert: { key, kind, title, detail?, chatId?, tone?, count?, expiresAt?,
 *             createdAt, updatedAt }
 * The same key updates in place, so one chat never shows two banners.
 * Only the most important alert is on screen; the rest wait their turn.
 */

/** Lower shows first. */
export const RANK = {
  failed: 0,
  connection: 1,
  message: 2,
  upload: 3,
  newChat: 4,
  copied: 5,
};

const FALLBACK_RANK = 9;

export function upsertAlert(list, alert, now = Date.now()) {
  const existing = list.find((item) => item.key === alert.key);
  if (!existing) return [...list, { ...alert, createdAt: now, updatedAt: now }];
  return list.map((item) =>
    item.key === alert.key ? { ...item, ...alert, createdAt: item.createdAt, updatedAt: now } : item,
  );
}

export function removeAlert(list, key) {
  return list.filter((item) => item.key !== key);
}

export function expireAlerts(list, now = Date.now()) {
  return list.filter((item) => !item.expiresAt || item.expiresAt > now);
}

export function nextExpiry(list) {
  const times = list.map((item) => item.expiresAt).filter(Boolean);
  return times.length ? Math.min(...times) : null;
}

/** Rank first, then the most recently updated. */
export function sortAlerts(list) {
  const rank = (item) => RANK[item.kind] ?? FALLBACK_RANK;
  return [...list].sort((a, b) => rank(a) - rank(b) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** @returns {{ top: object | null, waiting: number }} */
export function frontAlert(list) {
  const sorted = sortAlerts(list);
  return { top: sorted[0] ?? null, waiting: Math.max(0, sorted.length - 1) };
}
