import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { markReceipts } from '../common/receipts.util';
import { requireParticipant } from '../common/conversation-access.util';
import { CreateConversationDto } from './dto/conversation.dto';
import { CONVERSATION_SELECT, toConversationResponse } from './conversation.mapper';
import { DISAPPEAR_LABELS } from '../common/disappearing.util';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger('Receipts');
  private readonly chatLogger = new Logger('Chat');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all conversations the user is a participant in,
   * sorted by createdAt descending (newest first).
   * Fetching the list counts as the user's app receiving their messages,
   * so their undelivered messages are marked delivered.
   */
  async getUserConversations(userId: string) {
    await this.markDelivered(userId);
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants_ids: {
          has: userId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: CONVERSATION_SELECT,
    });
    return conversations.map(toConversationResponse);
  }

  /** Receipts are a side effect; a failure is logged and never fails the request. */
  private async markDelivered(userId: string) {
    try {
      const count = await markReceipts(this.prisma, userId, 'delivered');
      if (count > 0) this.logger.log(`${count} message(s) delivered to user ${userId}`);
    } catch (err) {
      this.logger.warn(`Could not mark messages delivered for ${userId}: ${err?.message ?? err}`);
    }
  }

  /**
   * Creates a new conversation (DM or GROUP), or returns an existing DM.
   * The authenticated caller is automatically added as creator and participant.
   */
  async createConversation(dto: CreateConversationDto, callerId: string) {
    const participantIds = new Set<string>();
    if (dto.participants_ids) {
      for (const id of dto.participants_ids) participantIds.add(id);
    }

    // Remove caller if caller passed their own ID in participants
    participantIds.delete(callerId);

    if (participantIds.size === 0) {
      throw new BadRequestException('At least one other participant is required');
    }

    const participantsArray = Array.from(participantIds);

    // Verify all participants exist
    const foundUsers = await this.prisma.user.findMany({
      where: { id: { in: participantsArray } },
      select: { id: true, name: true },
    });

    if (foundUsers.length !== participantsArray.length) {
      throw new NotFoundException('One or more participant users not found');
    }

    const type = dto.type ?? (participantsArray.length > 1 ? 'GROUP' : 'DM');

    // For DMs: return existing conversation if one already exists between caller and recipient
    if (type === 'DM' && participantsArray.length === 1) {
      const otherId = participantsArray[0];
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: 'DM',
          participants_ids: {
            hasEvery: [callerId, otherId],
          },
        },
      });

      if (existing) {
        return toConversationResponse(existing);
      }
    }

    // Always include caller in participants_ids
    const allParticipantIds = [callerId, ...participantsArray];

    // DMs have no name; clients show the other participant's name instead
    const conversationName = type === 'DM' ? null : (dto.name ?? null);

    const conversation = await this.prisma.conversation.create({
      data: {
        type,
        name: conversationName,
        createdBy: callerId,
        participants_ids: allParticipantIds,
      },
    });

    // Update conversationIds for all participants
    await this.prisma.user.updateMany({
      where: { id: { in: allParticipantIds } },
      data: {
        conversationIds: {
          push: conversation.id,
        },
      },
    });

    return toConversationResponse(conversation);
  }

  // ─── Disappearing messages ────────────────────────────────────────────────

  /**
   * Sets the chat's disappearing timer (0 turns it off) and posts a SYSTEM
   * message saying who changed it. That message never expires.
   */
  async setDisappearing(conversationId: string, callerId: string, seconds: number) {
    const conversation = await requireParticipant(this.prisma, conversationId, callerId);
    const caller = await this.prisma.user.findUnique({ where: { id: callerId }, select: { name: true } });
    const name = caller?.name ?? 'Someone';
    const content =
      seconds > 0
        ? `${name} turned on disappearing messages: ${DISAPPEAR_LABELS[seconds]}`
        : `${name} turned off disappearing messages`;

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { disappearSeconds: seconds },
      select: CONVERSATION_SELECT,
    });

    const status: Record<string, { delivered: boolean; read: boolean }> = {};
    for (const id of conversation.participants_ids) {
      status[id] = { delivered: id === callerId, read: id === callerId };
    }
    await this.prisma.message.create({
      data: {
        content,
        type: 'SYSTEM',
        systemKind: 'disappearing',
        senderId: callerId,
        conversationId,
        status,
        // never expires: expiresAt is left unset
      },
    });
    this.chatLogger.log(`Disappearing messages in ${conversationId} set to ${seconds}s by ${name}`);
    return toConversationResponse(updated);
  }

  // ─── Group admin ────────────────────────────────────────────────────────────

  async renameGroup(conversationId: string, callerId: string, name: string) {
    await this.requireGroupMember(conversationId, callerId);
    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { name },
      select: CONVERSATION_SELECT,
    });
    return toConversationResponse(updated);
  }

  async addMembers(conversationId: string, callerId: string, userIds: string[]) {
    const conversation = await this.requireGroupMember(conversationId, callerId);
    const newIds = [...new Set(userIds)].filter((id) => !conversation.participants_ids.includes(id));
    if (newIds.length === 0) {
      return toConversationResponse(
        await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: CONVERSATION_SELECT }),
      );
    }

    const found = await this.prisma.user.count({ where: { id: { in: newIds } } });
    if (found !== newIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { participants_ids: { push: newIds } },
      select: CONVERSATION_SELECT,
    });
    // Keep User.conversationIds in step, as createConversation does (without duplicating the id)
    const alreadyLinked = await this.prisma.user.findMany({
      where: { id: { in: newIds }, conversationIds: { has: conversationId } },
      select: { id: true },
    });
    const linkedIds = new Set(alreadyLinked.map((u) => u.id));
    const toLink = newIds.filter((id) => !linkedIds.has(id));
    if (toLink.length > 0) {
      await this.prisma.user.updateMany({
        where: { id: { in: toLink } },
        data: { conversationIds: { push: conversationId } },
      });
    }
    return toConversationResponse(updated);
  }

  async leaveGroup(conversationId: string, callerId: string) {
    const conversation = await this.requireGroupMember(conversationId, callerId);
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { participants_ids: conversation.participants_ids.filter((id) => id !== callerId) },
    });

    const caller = await this.prisma.user.findUnique({
      where: { id: callerId },
      select: { conversationIds: true },
    });
    await this.prisma.user.update({
      where: { id: callerId },
      data: { conversationIds: (caller?.conversationIds ?? []).filter((id) => id !== conversationId) },
    });
    // A chat you left no longer counts towards your pinned limit
    await this.prisma.chatPref.updateMany({
      where: { userId: callerId, conversationId },
      data: { pinned: false, pinnedAt: null },
    });
    return { ok: true };
  }

  private async requireGroupMember(conversationId: string, callerId: string) {
    const conversation = await requireParticipant(this.prisma, conversationId, callerId);
    if (conversation.type === 'DM') {
      throw new BadRequestException('This only works for group chats');
    }
    return conversation;
  }
}
