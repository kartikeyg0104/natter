import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Conversation } from '@prisma/client';
import { isMongoId } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export const NOT_PARTICIPANT_MESSAGE = 'You are not a participant of this conversation';

/** Loads a conversation the user belongs to: 404 when it does not exist, 403 when they are not in it. */
export async function requireParticipant(
  prisma: PrismaService,
  conversationId: string,
  userId: string,
): Promise<Conversation> {
  const conversation = isMongoId(conversationId)
    ? await prisma.conversation.findUnique({ where: { id: conversationId } })
    : null;
  if (!conversation) {
    throw new NotFoundException(`Conversation '${conversationId}' not found`);
  }
  if (!conversation.participants_ids.includes(userId)) {
    throw new ForbiddenException(NOT_PARTICIPANT_MESSAGE);
  }
  return conversation;
}

/** Ids of every user who shares at least one conversation with `userId` (excluding them). */
export async function conversationPeerIds(prisma: PrismaService, userId: string): Promise<string[]> {
  const conversations = await prisma.conversation.findMany({
    where: { participants_ids: { has: userId } },
    select: { participants_ids: true },
  });
  const ids = new Set<string>();
  for (const c of conversations) for (const id of c.participants_ids) ids.add(id);
  ids.delete(userId);
  return [...ids];
}
