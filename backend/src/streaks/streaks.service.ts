import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StreakDto } from './dto/streak.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 400;

/** "YYYY-MM-DD" of a UTC calendar day. */
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Extended JSON ({ $oid }) or a plain string, as aggregateRaw may return either. */
function readId(value: unknown): string {
  if (value && typeof value === 'object' && '$oid' in value) return String((value as { $oid: string }).$oid);
  return String(value);
}

@Injectable()
export class StreaksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Streaks for the caller's DMs. A UTC day counts when both people sent at
   * least one non-SYSTEM message that day. The streak is the run of counting
   * days ending today, or yesterday when today does not count yet (then
   * expiresSoon is true). DMs where either person blocked the other are left out.
   */
  async getStreaks(userId: string): Promise<Record<string, StreakDto>> {
    const dms = await this.prisma.conversation.findMany({
      where: { type: 'DM', participants_ids: { has: userId } },
      select: { id: true, participants_ids: true },
    });
    const pairs = dms
      .map((c) => ({ id: c.id, members: [...new Set(c.participants_ids)] }))
      .filter((c) => c.members.length === 2);
    if (pairs.length === 0) return {};

    const otherIds = pairs.map((c) => c.members.find((id) => id !== userId));
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [
          { ownerId: userId, blockedId: { in: otherIds } },
          { ownerId: { in: otherIds }, blockedId: userId },
        ],
      },
      select: { ownerId: true, blockedId: true },
    });
    const blockedPeers = new Set(blocks.map((b) => (b.ownerId === userId ? b.blockedId : b.ownerId)));
    const active = pairs.filter((c) => !blockedPeers.has(c.members.find((id) => id !== userId)));
    if (active.length === 0) return {};

    const now = new Date();
    const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const since = new Date(todayStart - LOOKBACK_DAYS * MS_PER_DAY);

    // One query for every DM: the distinct (conversation, sender, UTC day) triples.
    const rows = (await this.prisma.message.aggregateRaw({
      pipeline: [
        {
          $match: {
            conversationId: { $in: active.map((c) => ({ $oid: c.id })) },
            createdAt: { $gte: { $date: since.toISOString() } },
            type: { $ne: 'SYSTEM' },
          },
        },
        {
          $group: {
            _id: {
              c: '$conversationId',
              s: '$senderId',
              d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            },
          },
        },
      ],
    })) as unknown as { _id: { c: unknown; s: unknown; d: string } }[];

    // conversationId -> senderId -> set of days
    const days = new Map<string, Map<string, Set<string>>>();
    for (const row of rows) {
      const conversationId = readId(row._id.c);
      const senderId = readId(row._id.s);
      const bySender = days.get(conversationId) ?? new Map<string, Set<string>>();
      const set = bySender.get(senderId) ?? new Set<string>();
      set.add(row._id.d);
      bySender.set(senderId, set);
      days.set(conversationId, bySender);
    }

    const today = utcDay(new Date(todayStart));
    const result: Record<string, StreakDto> = {};
    for (const dm of active) {
      const bySender = days.get(dm.id);
      if (!bySender) continue;
      const [a, b] = dm.members.map((id) => bySender.get(id) ?? new Set<string>());
      const counts = (day: string) => a.has(day) && b.has(day);

      const todayCounts = counts(today);
      let cursor = todayCounts ? todayStart : todayStart - MS_PER_DAY;
      let count = 0;
      while (count <= LOOKBACK_DAYS && counts(utcDay(new Date(cursor)))) {
        count++;
        cursor -= MS_PER_DAY;
      }
      if (count > 0) result[dm.id] = { count, expiresSoon: !todayCounts };
    }
    return result;
  }
}
