import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireParticipant } from '../common/conversation-access.util';
import { isOnline, TYPING_WINDOW_MS } from '../common/presence.util';
import { OnlineEntryDto, PresenceResponseDto } from './dto/presence.dto';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async setTyping(userId: string, conversationId: string) {
    await requireParticipant(this.prisma, conversationId, userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { typingConversationId: conversationId, typingAt: new Date() },
    });
    return { ok: true };
  }

  async getPresence(userId: string): Promise<PresenceResponseDto> {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants_ids: { has: userId } },
      select: { id: true, participants_ids: true },
    });

    const peerIds = new Set<string>();
    for (const c of conversations) for (const id of c.participants_ids) peerIds.add(id);
    peerIds.delete(userId);

    const peers = await this.prisma.user.findMany({
      where: { id: { in: [...peerIds] } },
      select: { id: true, lastSeenAt: true, typingConversationId: true, typingAt: true },
    });
    const now = Date.now();
    const peersById = new Map(peers.map((p) => [p.id, p]));

    const typing: Record<string, string[]> = {};
    for (const c of conversations) {
      typing[c.id] = c.participants_ids.filter((id) => {
        const peer = id !== userId ? peersById.get(id) : undefined;
        return (
          !!peer &&
          peer.typingConversationId === c.id &&
          !!peer.typingAt &&
          now - peer.typingAt.getTime() <= TYPING_WINDOW_MS
        );
      });
    }

    const online: Record<string, OnlineEntryDto> = {};
    for (const peer of peers) {
      online[peer.id] = { online: isOnline(peer.lastSeenAt, now), lastSeenAt: peer.lastSeenAt ?? null };
    }

    return { typing, online };
  }
}
