import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { conversationPeerIds } from '../common/conversation-access.util';
import { usersByPhoneKey } from '../contacts/contacts.service';
import { CreateStatusDto, StatusFeedDto, StatusGroupDto, StatusItemDto, StatusViewerDto } from './dto/status.dto';

export const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;

function toStatusItem(status: Status, viewerId: string): StatusItemDto {
  const own = status.userId === viewerId;
  const viewerIds = status.viewerIds ?? [];
  return {
    id: status.id,
    userId: status.userId,
    type: status.type,
    text: status.text ?? null,
    background: status.background ?? null,
    fileId: status.fileId ?? null,
    createdAt: status.createdAt,
    expiresAt: status.expiresAt,
    viewed: own || viewerIds.includes(viewerId),
    viewCount: own ? viewerIds.length : null,
  };
}

@Injectable()
export class StatusService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateStatusDto): Promise<StatusItemDto> {
    const text = dto.text && dto.text.trim() ? dto.text : null;
    if (!text && !dto.file_id) {
      throw new BadRequestException('Status must contain text or file_id');
    }
    if (dto.file_id) {
      const file = await this.prisma.file.findUnique({
        where: { id: dto.file_id },
        select: { kind: true, uploadedBy: true },
      });
      if (!file || file.uploadedBy !== userId || file.kind !== 'IMAGE') {
        throw new BadRequestException('file_id must reference an image you uploaded');
      }
    }

    const createdAt = new Date();
    const status = await this.prisma.status.create({
      data: {
        userId,
        type: dto.file_id ? 'IMAGE' : 'TEXT',
        text,
        background: dto.background ?? null,
        fileId: dto.file_id ?? null,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + STATUS_LIFETIME_MS),
        viewerIds: [],
      },
    });
    return toStatusItem(status, userId);
  }

  async feed(userId: string): Promise<StatusFeedDto> {
    const now = new Date();
    const [peerIds, contacts, blocks] = await Promise.all([
      conversationPeerIds(this.prisma, userId),
      this.prisma.contact.findMany({ where: { ownerId: userId }, select: { phoneKey: true } }),
      this.prisma.block.findMany({ where: { ownerId: userId }, select: { blockedId: true } }),
    ]);
    const contactUsers = await usersByPhoneKey(this.prisma, contacts.map((c) => c.phoneKey));

    const blocked = new Set(blocks.map((b) => b.blockedId));
    const audience = new Set([...peerIds, ...contactUsers.values()]);
    audience.delete(userId);
    for (const id of blocked) audience.delete(id);

    const statuses = await this.prisma.status.findMany({
      where: { userId: { in: [userId, ...audience] }, expiresAt: { gt: now } },
      orderBy: { createdAt: 'asc' },
    });

    const mine: StatusItemDto[] = [];
    const byUser = new Map<string, StatusItemDto[]>();
    for (const status of statuses) {
      const item = toStatusItem(status, userId);
      if (status.userId === userId) {
        mine.push(item);
      } else {
        const items = byUser.get(status.userId) ?? [];
        items.push(item);
        byUser.set(status.userId, items);
      }
    }

    const others: StatusGroupDto[] = [...byUser.entries()].map(([ownerId, items]) => ({
      userId: ownerId,
      items,
      allViewed: items.every((i) => i.viewed),
    }));
    const newest = (g: StatusGroupDto) => g.items[g.items.length - 1].createdAt.getTime();
    others.sort((a, b) => Number(a.allViewed) - Number(b.allViewed) || newest(b) - newest(a));

    return { mine, others };
  }

  async view(userId: string, statusId: string) {
    const status = await this.prisma.status.findUnique({ where: { id: statusId } });
    if (!status || status.expiresAt <= new Date()) {
      throw new NotFoundException(`Status '${statusId}' not found`);
    }
    if (status.userId !== userId && !(status.viewerIds ?? []).includes(userId)) {
      await this.prisma.status.update({ where: { id: statusId }, data: { viewerIds: { push: userId } } });
    }
    return { ok: true };
  }

  async viewers(userId: string, statusId: string): Promise<StatusViewerDto[]> {
    const status = await this.findOwn(userId, statusId);
    const viewerIds = status.viewerIds ?? [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: viewerIds } },
      select: { id: true, name: true },
    });
    const names = new Map(users.map((u) => [u.id, u.name]));
    return viewerIds.filter((id) => names.has(id)).map((id) => ({ userId: id, name: names.get(id) }));
  }

  async remove(userId: string, statusId: string) {
    await this.findOwn(userId, statusId);
    await this.prisma.status.delete({ where: { id: statusId } });
    return { ok: true };
  }

  private async findOwn(userId: string, statusId: string): Promise<Status> {
    const status = await this.prisma.status.findUnique({ where: { id: statusId } });
    if (!status) throw new NotFoundException(`Status '${statusId}' not found`);
    if (status.userId !== userId) throw new ForbiddenException('Only the owner can do this');
    return status;
  }
}
