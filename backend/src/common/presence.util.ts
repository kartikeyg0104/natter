/** A user counts as online when their last request was within this window. */
export const ONLINE_WINDOW_MS = 30_000;
/** A typing signal stays valid for this long. */
export const TYPING_WINDOW_MS = 6_000;
/** AuthGuard only rewrites lastSeenAt when it is older than this. */
export const LAST_SEEN_WRITE_INTERVAL_MS = 10_000;

export function isOnline(lastSeenAt: Date | null | undefined, now: number = Date.now()): boolean {
  return !!lastSeenAt && now - lastSeenAt.getTime() <= ONLINE_WINDOW_MS;
}
