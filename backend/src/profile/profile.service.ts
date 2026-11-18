import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalisePhone } from '../common/phone.util';
import { isOnline } from '../common/presence.util';
import { PersonResponseDto, ProfileResponseDto, UpdateProfileDto } from './dto/profile.dto';

export const PHONE_TAKEN_MESSAGE = 'This number is already used by another account';
export const UNKNOWN_AVATAR_MESSAGE = 'Unknown avatar';
export const AVATAR_STYLES = ['adventurer', 'big-smile', 'fun-emoji', 'micah', 'bottts-neutral', 'avataaars'];
const AVATAR_PRESET = new RegExp(`^(${AVATAR_STYLES.join('|')}):[A-Za-z0-9 _-]{1,40}$`);

type ProfileFields = Pick<User, 'id' | 'name' | 'phoneNumber' | 'about' | 'avatarFileId' | 'avatarPreset'>;

function toProfile(user: ProfileFields): ProfileResponseDto {
  return {
    id: user.id,
    name: user.name,
    phoneNumber: user.phoneNumber ?? null,
    about: user.about ?? null,
    avatarFileId: user.avatarFileId ?? null,
    avatarPreset: user.avatarPreset ?? null,
  };
}

const PROFILE_SELECT = {
  id: true,
  name: true,
  phoneNumber: true,
  about: true,
  avatarFileId: true,
  avatarPreset: true,
} as const;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
    return toProfile(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const data: Prisma.UserUpdateInput = {};

    if (dto.phone_number !== undefined) {
      if (dto.phone_number === null || dto.phone_number.trim() === '') {
        data.phoneNumber = null;
        data.phoneKey = null;
      } else {
        const phone = normalisePhone(dto.phone_number);
        const taken = await this.prisma.user.findFirst({
          where: { phoneKey: phone.phoneKey, id: { not: userId } },
          select: { id: true },
        });
        if (taken) throw new ConflictException(PHONE_TAKEN_MESSAGE);
        data.phoneNumber = phone.phoneNumber;
        data.phoneKey = phone.phoneKey;
      }
    }

    if (dto.about !== undefined) {
      data.about = dto.about ? dto.about : null;
    }

    if (dto.avatar_file_id !== undefined) {
      if (dto.avatar_file_id === null) {
        data.avatarFileId = null;
      } else {
        const file = await this.prisma.file.findUnique({
          where: { id: dto.avatar_file_id },
          select: { kind: true, uploadedBy: true },
        });
        if (!file || file.uploadedBy !== userId || file.kind !== 'IMAGE') {
          throw new BadRequestException('avatar_file_id must reference an image you uploaded');
        }
        data.avatarFileId = dto.avatar_file_id;
        // A photo replaces an illustrated avatar
        data.avatarPreset = null;
      }
    }

    if (dto.avatar_preset !== undefined) {
      if (dto.avatar_preset === null) {
        data.avatarPreset = null;
      } else {
        if (!AVATAR_PRESET.test(dto.avatar_preset)) throw new BadRequestException(UNKNOWN_AVATAR_MESSAGE);
        if (dto.avatar_file_id) {
          throw new BadRequestException('Send either avatar_file_id or avatar_preset, not both');
        }
        data.avatarPreset = dto.avatar_preset;
        // An illustrated avatar replaces a photo
        data.avatarFileId = null;
      }
    }

    const user = await this.prisma.user.update({ where: { id: userId }, data, select: PROFILE_SELECT });
    return toProfile(user);
  }

  async listPeople(): Promise<PersonResponseDto[]> {
    const users = await this.prisma.user.findMany({
      select: { id: true, name: true, about: true, avatarFileId: true, avatarPreset: true, lastSeenAt: true },
      orderBy: { name: 'asc' },
    });
    const now = Date.now();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      about: u.about ?? null,
      avatarFileId: u.avatarFileId ?? null,
      avatarPreset: u.avatarPreset ?? null,
      lastSeenAt: u.lastSeenAt ?? null,
      online: isOnline(u.lastSeenAt, now),
    }));
  }
}
