import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isMongoId } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { FileResponseDto, FileWithDataResponseDto, UploadFileDto } from './dto/file.dto';
import { resolveUploadContent } from './file-content.util';
import { FILE_META_SELECT, FileMeta, toFileResponse } from './file.mapper';

export interface FileDownload {
  meta: FileMeta;
  bytes: Buffer;
}

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(dto: UploadFileDto, uploaderId: string): Promise<FileResponseDto> {
    const content = resolveUploadContent(dto.data, dto.mime_type);

    const file = await this.prisma.file.create({
      data: {
        name: dto.file_name.trim(),
        mimeType: content.mimeType,
        size: content.bytes.length,
        kind: content.kind,
        data: new Uint8Array(content.bytes),
        uploadedBy: uploaderId,
      },
      select: FILE_META_SELECT,
    });

    return toFileResponse(file);
  }

  async getFile(fileId: string, userId: string): Promise<FileWithDataResponseDto> {
    const { meta, bytes } = await this.loadAccessibleFile(fileId, userId);
    return { ...toFileResponse(meta), data: bytes.toString('base64') };
  }

  download(fileId: string, userId: string): Promise<FileDownload> {
    return this.loadAccessibleFile(fileId, userId);
  }

  /**
   * Loads a file the user may read: they uploaded it, it was sent in a
   * conversation they participate in (forwarded copies included), it is
   * someone's avatar, or it belongs to an unexpired status update.
   * Files sent as a snap are refused to everyone but the uploader.
   */
  private async loadAccessibleFile(fileId: string, userId: string): Promise<FileDownload> {
    if (!isMongoId(fileId)) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    // A snap's photo is only reachable through POST /message/{id}/open (uploader excepted)
    if (file.uploadedBy !== userId && (await this.prisma.message.count({ where: { fileId, viewOnce: true } })) > 0) {
      throw new ForbiddenException('No access to this file');
    }

    const allowed =
      file.uploadedBy === userId ||
      (await this.isPublicImage(fileId)) ||
      (await this.wasSharedWith(fileId, userId));
    if (!allowed) {
      throw new ForbiddenException('No access to this file');
    }

    const { data, ...meta } = file;
    return { meta, bytes: Buffer.from(data) };
  }

  /** Avatars and live status images are visible to every signed-in user. */
  private async isPublicImage(fileId: string): Promise<boolean> {
    const [avatars, statuses] = await Promise.all([
      this.prisma.user.count({ where: { avatarFileId: fileId } }),
      this.prisma.status.count({ where: { fileId, expiresAt: { gt: new Date() } } }),
    ]);
    return avatars > 0 || statuses > 0;
  }

  /** Every message carrying the file is checked, so forwarded copies grant access too. */
  private async wasSharedWith(fileId: string, userId: string): Promise<boolean> {
    const messages = await this.prisma.message.findMany({
      where: { fileId },
      select: { conversationId: true },
    });
    if (messages.length === 0) return false;

    const conversationIds = [...new Set(messages.map((m) => m.conversationId))];
    const shared = await this.prisma.conversation.count({
      where: { id: { in: conversationIds }, participants_ids: { has: userId } },
    });
    return shared > 0;
  }
}
