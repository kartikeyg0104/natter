import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksResponseDto } from './dto/block.dto';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string): Promise<BlocksResponseDto> {
    const blocks = await this.prisma.block.findMany({
      where: { ownerId },
      select: { blockedId: true },
      orderBy: { createdAt: 'asc' },
    });
    return { userIds: blocks.map((b) => b.blockedId) };
  }

  async block(ownerId: string, blockedId: string): Promise<BlocksResponseDto> {
    if (blockedId === ownerId) {
      throw new BadRequestException('You cannot block yourself');
    }
    const target = await this.prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
    if (!target) {
      throw new NotFoundException(`User '${blockedId}' not found`);
    }
    try {
      await this.prisma.block.upsert({
        where: { ownerId_blockedId: { ownerId, blockedId } },
        create: { ownerId, blockedId },
        update: {},
      });
    } catch (err) {
      // Two concurrent blocks of the same user: the other request created it
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }
    return this.list(ownerId);
  }

  async unblock(ownerId: string, blockedId: string): Promise<BlocksResponseDto> {
    await this.prisma.block.deleteMany({ where: { ownerId, blockedId } });
    return this.list(ownerId);
  }
}
