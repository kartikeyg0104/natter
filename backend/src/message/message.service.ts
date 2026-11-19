import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  GoneException,
  Logger,
} from '@nestjs/common';
import { Conversation, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMessageDto,
  ForwardMessageDto,
  MessageResponseDto,
  MessageType,
  OpenSnapResponseDto,
  ReplyPreviewDto,
} from './dto/message.dto';
import { expiryData, notExpired } from '../common/disappearing.util';
import { requireParticipant } from '../common/conversation-access.util';
import { colorizeName } from '../common/color.util';
import { FILE_META_SELECT, FileMeta, toFileResponse } from '../file/file.mapper';
import { markReceipts } from '../common/receipts.util';

const PAGE_SIZE = 20;
const STARRED_LIMIT = 100;
const SEARCH_LIMIT = 50;
const EDIT_WINDOW_MS = 15 * 60 * 1000;

export const BLOCKED_SEND_MESSAGE = 'Unblock this contact to send a message';
export const EDIT_WINDOW_MESSAGE = 'Messages can only be edited for 15 minutes';
const DELETED_MESSAGE = 'This message was deleted';
export const SNAP_NEEDS_PHOTO_MESSAGE = 'A snap needs a photo';
export const SNAP_OWN_MESSAGE = "You can't open your own snap";
export const SNAP_OPENED_MESSAGE = 'Snap already opened';
const DEFAULT_VIEW_SECONDS = 10;

const MESSAGE_SELECT = {
  id: true,
  content: true,
  type: true,
  fileId: true,
  createdAt: true,
  senderId: true,
  conversationId: true,
  status: true,
  replyToId: true,
  editedAt: true,
  deletedForEveryone: true,
  reactions: true,
  starredBy: true,
  forwarded: true,
  systemKind: true,
  expiresAt: true,
  viewOnce: true,
  viewSeconds: true,
  openedBy: true,
} as const;

/** Missing booleans (documents written before the field existed) count as false. */
const NOT_DELETED_FOR_EVERYONE: Prisma.MessageWhereInput = {
  OR: [{ deletedForEveryone: { isSet: false } }, { deletedForEveryone: { not: true } }],
};

interface StoredMessage {
  id: string;
  content: string;
  type: string;
  fileId: string | null;
  createdAt: Date;
  senderId: string;
  conversationId: string;
  status: unknown;
  replyToId: string | null;
  editedAt: Date | null;
  deletedForEveryone: boolean | null;
  reactions: unknown;
  starredBy: string[];
  forwarded: boolean | null;
  systemKind: string | null;
  expiresAt: Date | null;
  viewOnce: boolean | null;
  viewSeconds: number | null;
  openedBy: string[];
}

const REPLY_TARGET_SELECT = {
  id: true,
  senderId: true,
  content: true,
  type: true,
  deletedForEveryone: true,
} as const;

interface ReplyTarget {
  id: string;
  senderId: string;
  content: string;
  type: string;
  deletedForEveryone: boolean | null;
}

interface ConversationInfo {
  type: string;
  name: string | null;
  participants_ids: string[];
}

function readReactions(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const reactions: Record<string, string> = {};
  for (const [userId, emoji] of Object.entries(value)) {
    if (typeof emoji === 'string' && emoji) reactions[userId] = emoji;
  }
  return reactions;
}

function toReplyPreview(target: ReplyTarget | undefined): ReplyPreviewDto | null {
  if (!target) return null;
  const deleted = target.deletedForEveryone === true;
  return {
    id: target.id,
    senderId: target.senderId,
    content: deleted ? '' : target.content,
    type: target.type as MessageType,
    deleted,
  };
}

function toMessageResponse(
  message: StoredMessage,
  file: FileMeta | undefined,
  viewerId: string,
  replyTarget?: ReplyTarget,
): MessageResponseDto {
  const deleted = message.deletedForEveryone === true;
  const viewOnce = message.viewOnce === true;
  // A snap's photo is only reachable through POST /message/{id}/open, for everyone (the sender too)
  const hideFile = deleted || viewOnce;
  return {
    id: message.id,
    content: deleted ? '' : message.content,
    type: message.type as MessageType,
    fileId: hideFile ? null : message.fileId,
    file: file && !hideFile ? toFileResponse(file) : null,
    createdAt: message.createdAt,
    senderId: message.senderId,
    conversationId: message.conversationId,
    status: message.status as MessageResponseDto['status'],
    replyTo: toReplyPreview(replyTarget),
    reactions: deleted ? {} : readReactions(message.reactions),
    editedAt: message.editedAt ?? null,
    deleted,
    forwarded: message.forwarded === true,
    starred: (message.starredBy ?? []).includes(viewerId),
    systemKind: message.systemKind ?? null,
    expiresAt: message.expiresAt ?? null,
    viewOnce,
    viewSeconds: viewOnce ? (message.viewSeconds ?? DEFAULT_VIEW_SECONDS) : (message.viewSeconds ?? null),
    openedBy: message.openedBy ?? [],
  };
}

/** Delivery/read status for a new message: sender = delivered+read, everyone else = false. */
function initialStatus(participantIds: string[], senderId: string) {
  const status: Record<string, { delivered: boolean; read: boolean }> = {};
  for (const participantId of participantIds) {
    const isSender = participantId === senderId;
    status[participantId] = { delivered: isSender, read: isSender };
  }
  return status;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger('Chat');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch messages for a conversation using cursor-based pagination.
   * - No cursor  → 20 most-recent messages.
   * - With cursor → 20 messages older than the cursor message.
   * Returned oldest-first within the page (natural chat order).
   * Opening a conversation counts as reading it, so the reader's unread
   * messages in it are marked read before the page is loaded.
   */
  async getMessages(conversationId: string, fromMessageCursor: string | undefined, readerId: string) {
    await this.markRead(conversationId, readerId);

    const where: Prisma.MessageWhereInput[] = await this.readerFilters(conversationId, readerId);

    if (fromMessageCursor) {
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: fromMessageCursor },
        select: { id: true, createdAt: true },
      });
      if (!cursorMessage) {
        throw new NotFoundException(`Cursor message '${fromMessageCursor}' not found`);
      }
      // Strictly older than the cursor. Done by hand (not Prisma's cursor) so it keeps
      // working when the cursor message itself is hidden by the reader filters.
      where.push({
        OR: [
          { createdAt: { lt: cursorMessage.createdAt } },
          { createdAt: cursorMessage.createdAt, id: { lt: cursorMessage.id } },
        ],
      });
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId, AND: where },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE,
      select: MESSAGE_SELECT,
    });

    const data = await this.toResponses([...messages].reverse(), readerId);

    return {
      data,
      nextCursor: messages.length === PAGE_SIZE ? messages[messages.length - 1].id : null,
      count: data.length,
    };
  }

  /**
   * Create a new message.
   * senderId comes from the authenticated user, not the request body.
   * An attachment must be a file the sender uploaded via POST /file.
   * Builds default status JSON: sender = delivered+read, others = false.
   */
  async createMessage(dto: CreateMessageDto, senderId: string): Promise<MessageResponseDto> {
    if (!dto.content && !dto.file_id) {
      throw new BadRequestException('Message must contain content or file_id');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversation_id },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation '${dto.conversation_id}' not found`);
    }
    await this.assertNotBlockingDm(conversation, senderId);

    const file = dto.file_id ? await this.loadOwnFile(dto.file_id, senderId) : undefined;
    const viewOnce = dto.view_once === true;
    if (viewOnce && file?.kind !== 'IMAGE') {
      throw new BadRequestException(SNAP_NEEDS_PHOTO_MESSAGE);
    }

    let replyTarget: ReplyTarget | undefined;
    if (dto.reply_to_id) {
      const { conversationId: replyConversationId, ...target } =
        (await this.prisma.message.findUnique({
          where: { id: dto.reply_to_id },
          select: { ...REPLY_TARGET_SELECT, conversationId: true },
        })) ?? { conversationId: null };
      if (replyConversationId !== dto.conversation_id) {
        throw new BadRequestException('reply_to_id must reference a message in the same conversation');
      }
      replyTarget = target as ReplyTarget;
    }

    const createdAt = new Date();
    const message = await this.prisma.message.create({
      data: {
        content: dto.content ?? '',
        type: file ? file.kind : 'TEXT',
        fileId: file?.id ?? null,
        senderId,
        conversationId: dto.conversation_id,
        status: initialStatus(conversation.participants_ids, senderId),
        replyToId: replyTarget?.id ?? null,
        deletedFor: [],
        starredBy: [],
        createdAt,
        ...expiryData(conversation.disappearSeconds, createdAt),
        ...(viewOnce ? { viewOnce: true, viewSeconds: dto.view_seconds ?? DEFAULT_VIEW_SECONDS, openedBy: [] } : {}),
      },
      select: MESSAGE_SELECT,
    });

    await this.logMessage(conversation, senderId, message.content, file);
    return toMessageResponse(message, file, senderId, replyTarget);
  }

  // ─── Message actions ────────────────────────────────────────────────────────

  async react(messageId: string, userId: string, emoji: string): Promise<MessageResponseDto> {
    const message = await this.loadForParticipant(messageId, userId);
    if (message.deletedForEveryone) throw new BadRequestException(DELETED_MESSAGE);

    const reactions = readReactions(message.reactions);
    if (emoji === '') delete reactions[userId];
    else reactions[userId] = emoji;

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { reactions },
      select: MESSAGE_SELECT,
    });
    return this.toResponse(updated, userId);
  }

  async edit(messageId: string, userId: string, content: string): Promise<MessageResponseDto> {
    const message = await this.loadForParticipant(messageId, userId);
    if (message.senderId !== userId) throw new ForbiddenException('Only the sender can edit this message');
    if (message.deletedForEveryone) throw new BadRequestException(DELETED_MESSAGE);
    if (message.viewOnce) throw new BadRequestException("Snaps can't be edited");
    if (message.type === 'SYSTEM') throw new BadRequestException("System messages can't be edited");
    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
      throw new BadRequestException(EDIT_WINDOW_MESSAGE);
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      select: MESSAGE_SELECT,
    });
    return this.toResponse(updated, userId);
  }

  async remove(messageId: string, userId: string, scope: 'me' | 'everyone') {
    const message = await this.loadForParticipant(messageId, userId);

    if (scope === 'everyone') {
      if (message.senderId !== userId) {
        throw new ForbiddenException('Only the sender can delete this message for everyone');
      }
      if (message.type === 'SYSTEM') {
        throw new BadRequestException("System messages can't be deleted for everyone");
      }
      await this.prisma.message.update({
        where: { id: messageId },
        data: { deletedForEveryone: true, content: '', fileId: null, reactions: {} },
      });
      this.logger.log(`Message ${messageId} deleted for everyone by ${userId}`);
    } else {
      const alreadyHidden = await this.prisma.message.count({
        where: { id: messageId, deletedFor: { has: userId } },
      });
      if (!alreadyHidden) {
        await this.prisma.message.update({
          where: { id: messageId },
          data: { deletedFor: { push: userId } },
        });
      }
    }
    return { ok: true };
  }

  async star(messageId: string, userId: string, starred: boolean): Promise<MessageResponseDto> {
    const message = await this.loadForParticipant(messageId, userId);
    const starredBy = new Set(message.starredBy ?? []);
    if (starred) starredBy.add(userId);
    else starredBy.delete(userId);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { starredBy: [...starredBy] },
      select: MESSAGE_SELECT,
    });
    return this.toResponse(updated, userId);
  }

  /** Messages the user starred and can still see, newest first. */
  async starred(userId: string): Promise<MessageResponseDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants_ids: { has: userId } },
      select: { id: true },
    });
    const conversationIds = conversations.map((c) => c.id);
    if (conversationIds.length === 0) return [];

    const hidden = await this.prisma.message.findMany({
      where: { starredBy: { has: userId }, deletedFor: { has: userId } },
      select: { id: true },
    });
    const messages = await this.prisma.message.findMany({
      where: {
        starredBy: { has: userId },
        conversationId: { in: conversationIds },
        AND: [
          NOT_DELETED_FOR_EVERYONE,
          notExpired(),
          ...(hidden.length ? [{ id: { notIn: hidden.map((m) => m.id) } }] : []),
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: STARRED_LIMIT,
      select: MESSAGE_SELECT,
    });
    return this.toResponses(messages, userId);
  }

  async forward(dto: ForwardMessageDto, userId: string): Promise<MessageResponseDto[]> {
    const source = await this.loadForParticipant(dto.message_id, userId);
    const hiddenForCaller = await this.prisma.message.count({
      where: { id: source.id, deletedFor: { has: userId } },
    });
    if (source.deletedForEveryone || hiddenForCaller) {
      throw new BadRequestException('Deleted messages cannot be forwarded');
    }
    if (source.viewOnce) throw new BadRequestException("Snaps can't be forwarded");
    if (source.type === 'SYSTEM') throw new BadRequestException("System messages can't be forwarded");

    const targetIds = [...new Set(dto.conversation_ids)];
    const targets: Conversation[] = [];
    for (const id of targetIds) {
      const conversation = await requireParticipant(this.prisma, id, userId);
      await this.assertNotBlockingDm(conversation, userId);
      targets.push(conversation);
    }

    const file = source.fileId ? (await this.loadFileMeta([source.fileId])).get(source.fileId) : undefined;
    const results: MessageResponseDto[] = [];
    for (const conversation of targets) {
      const createdAt = new Date();
      const message = await this.prisma.message.create({
        data: {
          createdAt,
          ...expiryData(conversation.disappearSeconds, createdAt),
          content: source.content,
          type: source.type,
          fileId: source.fileId ?? null,
          senderId: userId,
          conversationId: conversation.id,
          status: initialStatus(conversation.participants_ids, userId),
          forwarded: true,
          deletedFor: [],
          starredBy: [],
        },
        select: MESSAGE_SELECT,
      });
      await this.logMessage(conversation, userId, message.content, file);
      results.push(toMessageResponse(message, file, userId));
    }
    return results;
  }

  async search(conversationId: string, q: string, readerId: string): Promise<MessageResponseDto[]> {
    await requireParticipant(this.prisma, conversationId, readerId);
    const filters = await this.readerFilters(conversationId, readerId);
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        content: { contains: q, mode: 'insensitive' },
        AND: [...filters, NOT_DELETED_FOR_EVERYONE],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: SEARCH_LIMIT,
      select: MESSAGE_SELECT,
    });
    return this.toResponses(messages, readerId);
  }

  // ─── Screenshots and snaps ──────────────────────────────────────────────────

  /** Posts a SYSTEM message "<username> took a screenshot" in the conversation. */
  async screenshot(conversationId: string, userId: string): Promise<MessageResponseDto> {
    const conversation = await requireParticipant(this.prisma, conversationId, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const createdAt = new Date();
    const message = await this.prisma.message.create({
      data: {
        content: `${user?.name ?? 'Someone'} took a screenshot`,
        type: 'SYSTEM',
        systemKind: 'screenshot',
        senderId: userId,
        conversationId,
        status: initialStatus(conversation.participants_ids, userId),
        deletedFor: [],
        starredBy: [],
        createdAt,
        ...expiryData(conversation.disappearSeconds, createdAt),
      },
      select: MESSAGE_SELECT,
    });
    this.logger.log(`[SYSTEM] ${message.content} in ${conversationId}`);
    return toMessageResponse(message, undefined, userId);
  }

  /**
   * Opens a snap once: returns the photo as a data URL and records the caller in openedBy.
   * Only other participants can open it, and each only once.
   */
  async openSnap(messageId: string, userId: string): Promise<OpenSnapResponseDto> {
    const message = await this.loadForParticipant(messageId, userId);
    if (!message.viewOnce) throw new BadRequestException('This message is not a snap');
    if (message.senderId === userId) throw new ForbiddenException(SNAP_OWN_MESSAGE);
    if ((message.openedBy ?? []).includes(userId)) throw new GoneException(SNAP_OPENED_MESSAGE);
    if (message.deletedForEveryone) throw new BadRequestException(DELETED_MESSAGE);
    if (message.expiresAt && message.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('This snap has disappeared');
    }

    const file = message.fileId
      ? await this.prisma.file.findUnique({ where: { id: message.fileId }, select: { mimeType: true, data: true } })
      : null;
    if (!file) throw new GoneException('This snap is no longer available');

    // Atomic "add if absent" so two concurrent opens cannot both succeed.
    // $ne also matches documents without openedBy, which Prisma filters would not.
    const result = await this.prisma.$runCommandRaw({
      update: 'messages',
      updates: [
        {
          q: { _id: { $oid: messageId }, openedBy: { $ne: { $oid: userId } } },
          u: { $addToSet: { openedBy: { $oid: userId } } },
        },
      ],
    });
    if (Number(result.nModified ?? 0) === 0) throw new GoneException(SNAP_OPENED_MESSAGE);

    this.logger.log(`Snap ${messageId} opened by ${userId}`);
    return {
      id: message.id,
      data: `data:${file.mimeType};base64,${Buffer.from(file.data).toString('base64')}`,
      content: message.content,
      viewSeconds: message.viewSeconds ?? DEFAULT_VIEW_SECONDS,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * What a reader must not see in a conversation: messages they deleted for
   * themselves, messages up to when they cleared the chat, and messages from
   * people they blocked sent after the block.
   */
  private async readerFilters(conversationId: string, readerId: string): Promise<Prisma.MessageWhereInput[]> {
    const [pref, blocks, hidden] = await Promise.all([
      this.prisma.chatPref.findUnique({
        where: { userId_conversationId: { userId: readerId, conversationId } },
        select: { clearedAt: true },
      }),
      this.prisma.block.findMany({ where: { ownerId: readerId }, select: { blockedId: true, createdAt: true } }),
      // Prisma cannot negate `has` on documents that lack the list, so exclude by id instead
      this.prisma.message.findMany({
        where: { conversationId, deletedFor: { has: readerId } },
        select: { id: true },
      }),
    ]);

    const filters: Prisma.MessageWhereInput[] = [notExpired()];
    if (hidden.length > 0) filters.push({ id: { notIn: hidden.map((m) => m.id) } });
    if (pref?.clearedAt) filters.push({ createdAt: { gt: pref.clearedAt } });
    for (const block of blocks) {
      filters.push({ NOT: { senderId: block.blockedId, createdAt: { gte: block.createdAt } } });
    }
    return filters;
  }

  /** 404 when the message does not exist, 403 when the user is not in its conversation. */
  private async loadForParticipant(messageId: string, userId: string): Promise<StoredMessage> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId }, select: MESSAGE_SELECT });
    if (!message) throw new NotFoundException(`Message '${messageId}' not found`);
    await requireParticipant(this.prisma, message.conversationId, userId);
    return message;
  }

  /** In a DM, a sender who blocked the other person must unblock them first. */
  private async assertNotBlockingDm(conversation: Conversation, senderId: string) {
    if (conversation.type !== 'DM') return;
    const otherId = conversation.participants_ids.find((id) => id !== senderId);
    if (!otherId) return;
    const block = await this.prisma.block.findFirst({
      where: { ownerId: senderId, blockedId: otherId },
      select: { id: true },
    });
    if (block) throw new ForbiddenException(BLOCKED_SEND_MESSAGE);
  }

  private async toResponse(message: StoredMessage, viewerId: string): Promise<MessageResponseDto> {
    const [response] = await this.toResponses([message], viewerId);
    return response;
  }

  /** Maps messages to responses, loading attachment metadata and reply previews in bulk. */
  private async toResponses(messages: StoredMessage[], viewerId: string): Promise<MessageResponseDto[]> {
    const replyIds = [...new Set(messages.map((m) => m.replyToId).filter((id): id is string => !!id))];
    const [filesById, replies] = await Promise.all([
      this.loadFileMeta(messages.filter((m) => !m.deletedForEveryone && !m.viewOnce).map((m) => m.fileId)),
      replyIds.length
        ? this.prisma.message.findMany({
            where: { id: { in: replyIds } },
            select: REPLY_TARGET_SELECT,
          })
        : Promise.resolve([] as ReplyTarget[]),
    ]);
    const repliesById = new Map(replies.map((r) => [r.id, r]));
    return messages.map((m) =>
      toMessageResponse(
        m,
        m.fileId ? filesById.get(m.fileId) : undefined,
        viewerId,
        m.replyToId ? repliesById.get(m.replyToId) : undefined,
      ),
    );
  }

  /** Receipts are a side effect; a failure is logged and never fails the request. */
  private async markRead(conversationId: string, readerId: string) {
    try {
      const count = await markReceipts(this.prisma, readerId, 'read', conversationId);
      if (count > 0) this.logger.log(`${count} message(s) read by user ${readerId} in ${conversationId}`);
    } catch (err) {
      this.logger.warn(`Could not mark messages read for ${readerId}: ${err?.message ?? err}`);
    }
  }

  private async loadOwnFile(fileId: string, senderId: string): Promise<FileMeta> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: FILE_META_SELECT,
    });
    if (!file || file.uploadedBy !== senderId) {
      throw new BadRequestException('file_id must reference a file uploaded by the sender');
    }
    return file;
  }

  private async loadFileMeta(fileIds: (string | null)[]): Promise<Map<string, FileMeta>> {
    const ids = [...new Set(fileIds.filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map();

    const files = await this.prisma.file.findMany({
      where: { id: { in: ids } },
      select: FILE_META_SELECT,
    });
    return new Map(files.map((f) => [f.id, f]));
  }

  // ─── Interactive Console Logging ────────────────────────────────────────────
  private async logMessage(
    conversation: ConversationInfo,
    senderId: string,
    content: string,
    file: FileMeta | undefined,
  ) {
    // Fetch participant names explicitly — Prisma MongoDB relation joins are unreliable
    const participants = await this.prisma.user.findMany({
      where: { id: { in: conversation.participants_ids } },
      select: { id: true, name: true },
    });

    // Fetch sender separately — sender may not appear in participants lookup if IDs mismatch
    const senderUser =
      participants.find((u) => u.id === senderId) ??
      (await this.prisma.user.findUnique({ where: { id: senderId }, select: { id: true, name: true } }));

    const senderName = senderUser?.name ?? `id:${senderId}`;
    const resolvedSenderId = senderUser?.id ?? senderId;
    const receiverUsers = participants.filter((u) => u.id !== resolvedSenderId);

    const participantNames = participants.map((u) => colorizeName(u.name)).join(', ');
    const convLabel =
      conversation.type === 'DM'
        ? `DM [${participantNames}]`
        : conversation.name
          ? `Group "${conversation.name}"`
          : `Group [${participantNames}]`;

    const coloredReceivers =
      receiverUsers.length > 0 ? receiverUsers.map((u) => colorizeName(u.name)).join(', ') : 'None';

    // Log a [IMAGE]/[FILE] tag instead of file contents
    const textLabel = content ? `\x1b[37m${content}\x1b[0m` : '';
    const fileLabel = file ? `\x1b[35m[${file.kind}]\x1b[0m` : '';
    const contentLabel = [textLabel, fileLabel].filter(Boolean).join(' + ');

    this.logger.log(
      `\x1b[36m[MSG]\x1b[0m \x1b[1m${convLabel}\x1b[0m │ ${colorizeName(senderName)} \x1b[33m➔\x1b[0m ${coloredReceivers} │ "${contentLabel}"`,
    );
  }
}
