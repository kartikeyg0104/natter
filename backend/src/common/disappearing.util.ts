import { Prisma } from '@prisma/client';

/** Allowed disappearing timers: off, 24 hours, 7 days. */
export const DISAPPEAR_OPTIONS = [0, 86400, 604800] as const;
export type DisappearSeconds = (typeof DISAPPEAR_OPTIONS)[number];

export const DISAPPEAR_LABELS: Record<number, string> = {
  86400: '24 hours',
  604800: '7 days',
};

/** When a message sent at `createdAt` expires, or null when the chat has no timer. */
export function expiresAtFor(disappearSeconds: number | null | undefined, createdAt: Date): Date | null {
  if (!disappearSeconds || disappearSeconds <= 0) return null;
  return new Date(createdAt.getTime() + disappearSeconds * 1000);
}

/**
 * Prisma data for a new message's expiry. Nothing is written when the chat has
 * no timer, so the field stays missing rather than null (Prisma's `lte` on a
 * nullable date also matches null, see FileCleanupService.deleteExpiredMessages).
 */
export function expiryData(disappearSeconds: number | null | undefined, createdAt: Date): { expiresAt?: Date } {
  const expiresAt = expiresAtFor(disappearSeconds, createdAt);
  return expiresAt ? { expiresAt } : {};
}

/**
 * Messages that have not expired. Documents written before the field existed
 * have no expiresAt at all, which negative filters would not match, so both
 * "missing" and "null" are listed explicitly.
 */
export function notExpired(now: Date = new Date()): Prisma.MessageWhereInput {
  return {
    OR: [{ expiresAt: { isSet: false } }, { expiresAt: null }, { expiresAt: { gt: now } }],
  };
}
