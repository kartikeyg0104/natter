import { BadRequestException, Injectable } from '@nestjs/common';
import { ChatPref, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { requireParticipant } from '../common/conversation-access.util';
import { ChatPrefResponseDto, UpdateChatPrefDto } from './dto/chat-pref.dto';

export const MAX_PINNED_CHATS = 3;

function toChatPref(pref: ChatPref): ChatPrefResponseDto {
  return {
    conversationId: pref.conversationId,
    pinned: pref.pinned === true,
    archived: pref.archived === true,
    mutedUntil: pref.mutedUntil ?? null,
    clearedAt: pref.clearedAt ?? null,
  };
}

@Injectable()
export class ChatPrefsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ChatPrefResponseDto[]> {
    const prefs = await this.prisma.chatPref.findMany({ where: { userId } });
    return prefs.map(toChatPref);
  }

  async update(userId: string, conversationId: string, dto: UpdateChatPrefDto): Promise<ChatPrefResponseDto> {
    await requireParticipant(this.prisma, conversationId, userId);
    const key = { userId_conversationId: { userId, conversationId } };
    const existing = await this.prisma.chatPref.findUnique({ where: key });
    const wasPinned = existing?.pinned === true;
    const now = new Date();

    const data: Prisma.ChatPrefUpdateInput = {};
    let pinned: boolean | undefined = dto.pinned ?? undefined;
    if (dto.archived !== undefined && dto.archived !== null) {
      data.archived = dto.archived;
      if (dto.archived) pinned = false;
    }

    if (pinned === true && !wasPinned) {
      const pinnedElsewhere = await this.prisma.chatPref.count({
        where: { userId, pinned: true, conversationId: { not: conversationId } },
      });
      if (pinnedElsewhere >= MAX_PINNED_CHATS) {
        throw new BadRequestException(`You can pin up to ${MAX_PINNED_CHATS} chats`);
      }
    }
    if (pinned !== undefined) {
      data.pinned = pinned;
      if (pinned !== wasPinned) data.pinnedAt = pinned ? now : null;
    }

    if (dto.muted_until !== undefined) {
      data.mutedUntil = dto.muted_until === null ? null : new Date(dto.muted_until);
    }
    if (dto.clear === true) data.clearedAt = now;

    const pref = await this.prisma.chatPref.upsert({
      where: key,
      create: {
        userId,
        conversationId,
        pinned: (data.pinned as boolean) ?? false,
        archived: (data.archived as boolean) ?? false,
        mutedUntil: (data.mutedUntil as Date) ?? null,
        clearedAt: (data.clearedAt as Date) ?? null,
        pinnedAt: (data.pinnedAt as Date) ?? null,
      },
      update: data,
    });
    return toChatPref(pref);
  }
}
