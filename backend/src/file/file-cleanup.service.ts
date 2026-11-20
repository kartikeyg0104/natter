import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MS_PER_HOUR = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = MS_PER_HOUR;
const DEFAULT_TTL_HOURS = 24;
const BATCH_SIZE = 500;

/** Reads FILE_ORPHAN_TTL_HOURS, falling back to 24 for missing or invalid values. */
export function orphanTtlHours(raw: string | undefined = process.env.FILE_ORPHAN_TTL_HOURS): number {
  const hours = Number(raw);
  return raw && Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_TTL_HOURS;
}

/**
 * Deletes uploads that were never attached to a message (and are not an
 * avatar or a status image), status updates that have expired, messages
 * past their disappearing expiresAt (and their files once nothing else uses
 * them), and the photos of snaps every recipient has opened.
 * Runs once on startup and then every hour.
 */
@Injectable()
export class FileCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('FileCleanup');
  private readonly ttlHours = orphanTtlHours();
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log(
      `Removing uploads not sent in any message (and not an avatar or status) after ${this.ttlHours}h, ` +
        'expired status updates and disappearing messages, and opened snap photos (checked hourly)',
    );
    void this.runSafely();
    this.timer = setInterval(() => void this.runSafely(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private async runSafely() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const expired = await this.deleteExpiredStatuses();
      if (expired > 0) this.logger.log(`Deleted ${expired} expired status update(s)`);
      const expiredMessages = await this.deleteExpiredMessages();
      if (expiredMessages > 0) this.logger.log(`Deleted ${expiredMessages} disappeared message(s)`);
      const snaps = await this.releaseOpenedSnaps();
      if (snaps > 0) this.logger.log(`Removed the photo of ${snaps} fully opened snap(s)`);
      const deleted = await this.deleteOrphans();
      if (deleted > 0) this.logger.log(`Deleted ${deleted} orphaned upload(s)`);
    } catch (err) {
      this.logger.error(`Orphaned upload cleanup failed: ${err?.message ?? err}`);
    } finally {
      this.isRunning = false;
    }
  }

  /** Deletes status updates past their expiresAt. Returns how many were deleted. */
  async deleteExpiredStatuses(now: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.status.deleteMany({ where: { expiresAt: { lte: now } } });
    return count;
  }

  /**
   * Deletes messages whose disappearing timer ran out, then their files when no
   * other message, avatar or status uses them. Returns how many messages were deleted.
   */
  async deleteExpiredMessages(now: Date = new Date()): Promise<number> {
    let deleted = 0;
    for (;;) {
      // A native filter on purpose: Prisma's `expiresAt: { lte }` also matches documents
      // whose expiresAt is null (it compares with $expr, where null sorts before every date).
      const rows = (await this.prisma.message.findRaw({
        filter: { expiresAt: { $type: 'date', $lte: { $date: now.toISOString() } } },
        options: { projection: { _id: 1, fileId: 1 }, limit: BATCH_SIZE },
      })) as unknown as { _id: { $oid: string }; fileId?: { $oid: string } | null }[];
      const batch = rows.map((r) => ({ id: r._id.$oid, fileId: r.fileId?.$oid ?? null }));
      if (batch.length === 0) break;

      const { count } = await this.prisma.message.deleteMany({ where: { id: { in: batch.map((m) => m.id) } } });
      deleted += count;
      const fileIds = [...new Set(batch.map((m) => m.fileId).filter((id): id is string => !!id))];
      if (fileIds.length > 0) await this.deleteUnreferenced(fileIds);
      if (batch.length < BATCH_SIZE) break;
    }
    return deleted;
  }

  /**
   * Once every recipient of a snap has opened it, its photo is no longer needed:
   * the message keeps showing as opened, its fileId is cleared and the file is
   * deleted when nothing else uses it. Recipients are the people who were in the
   * chat when it was sent (its status keys) and still are. Returns how many snaps were released.
   */
  async releaseOpenedSnaps(): Promise<number> {
    const snaps = await this.prisma.message.findMany({
      where: { viewOnce: true, fileId: { not: null } },
      select: { id: true, fileId: true, senderId: true, conversationId: true, status: true, openedBy: true },
    });
    if (snaps.length === 0) return 0;

    const conversations = await this.prisma.conversation.findMany({
      where: { id: { in: [...new Set(snaps.map((s) => s.conversationId))] } },
      select: { id: true, participants_ids: true },
    });
    const participantsById = new Map(conversations.map((c) => [c.id, new Set(c.participants_ids)]));

    const released = snaps.filter((snap) => {
      const participants = participantsById.get(snap.conversationId) ?? new Set<string>();
      const statusKeys =
        snap.status && typeof snap.status === 'object' && !Array.isArray(snap.status)
          ? Object.keys(snap.status)
          : [...participants];
      const opened = new Set(snap.openedBy ?? []);
      return statusKeys
        .filter((id) => id !== snap.senderId && participants.has(id))
        .every((id) => opened.has(id));
    });
    if (released.length === 0) return 0;

    await this.prisma.message.updateMany({
      where: { id: { in: released.map((s) => s.id) } },
      data: { fileId: null },
    });
    await this.deleteUnreferenced([...new Set(released.map((s) => s.fileId))]);
    return released.length;
  }

  /** Deletes files older than the TTL that no message, avatar or status references. Returns how many were deleted. */
  async deleteOrphans(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.ttlHours * MS_PER_HOUR);
    let deleted = 0;
    let lastId: string | undefined;

    for (;;) {
      const batch = await this.prisma.file.findMany({
        where: { createdAt: { lt: cutoff }, ...(lastId ? { id: { gt: lastId } } : {}) },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;

      deleted += await this.deleteUnreferenced(batch.map((f) => f.id));
      if (batch.length < BATCH_SIZE) break;
      lastId = batch[batch.length - 1].id;
    }
    return deleted;
  }

  private async deleteUnreferenced(fileIds: string[]): Promise<number> {
    const [messages, avatars, statuses] = await Promise.all([
      this.prisma.message.findMany({ where: { fileId: { in: fileIds } }, select: { fileId: true } }),
      this.prisma.user.findMany({ where: { avatarFileId: { in: fileIds } }, select: { avatarFileId: true } }),
      this.prisma.status.findMany({ where: { fileId: { in: fileIds } }, select: { fileId: true } }),
    ]);
    const referencedIds = new Set<string>([
      ...messages.map((m) => m.fileId),
      ...avatars.map((u) => u.avatarFileId),
      ...statuses.map((s) => s.fileId),
    ]);
    const orphanIds = fileIds.filter((id) => !referencedIds.has(id));
    if (orphanIds.length === 0) return 0;

    const { count } = await this.prisma.file.deleteMany({ where: { id: { in: orphanIds } } });
    return count;
  }
}
