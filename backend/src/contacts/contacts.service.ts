import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalisePhone } from '../common/phone.util';
import {
  ContactResponseDto,
  CreateContactDto,
  LookupResponseDto,
  UpdateContactDto,
} from './dto/contact.dto';

/** Maps phone keys to the id of the user who registered that number. */
export async function usersByPhoneKey(prisma: PrismaService, keys: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { phoneKey: { in: unique } },
    select: { id: true, phoneKey: true },
  });
  const map = new Map<string, string>();
  for (const u of users) if (u.phoneKey && !map.has(u.phoneKey)) map.set(u.phoneKey, u.id);
  return map;
}

function toContact(contact: Contact, userId: string | undefined): ContactResponseDto {
  return {
    id: contact.id,
    name: contact.name,
    phoneNumber: contact.phoneNumber,
    userId: userId ?? null,
    createdAt: contact.createdAt,
  };
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string): Promise<ContactResponseDto[]> {
    const contacts = await this.prisma.contact.findMany({ where: { ownerId } });
    const users = await usersByPhoneKey(this.prisma, contacts.map((c) => c.phoneKey));
    return contacts
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((c) => toContact(c, users.get(c.phoneKey)));
  }

  async create(ownerId: string, dto: CreateContactDto): Promise<ContactResponseDto> {
    const phone = normalisePhone(dto.phone_number);
    await this.assertNotSaved(ownerId, phone.phoneKey);
    const contact = await this.prisma.contact.create({
      data: { ownerId, name: dto.name, phoneNumber: phone.phoneNumber, phoneKey: phone.phoneKey },
    });
    return this.resolveOne(contact);
  }

  async update(ownerId: string, id: string, dto: UpdateContactDto): Promise<ContactResponseDto> {
    const existing = await this.findOwn(ownerId, id);
    const data: { name?: string; phoneNumber?: string; phoneKey?: string } = {};
    if (dto.name !== undefined && dto.name !== null) data.name = dto.name;
    if (dto.phone_number !== undefined && dto.phone_number !== null) {
      const phone = normalisePhone(dto.phone_number);
      if (phone.phoneKey !== existing.phoneKey) await this.assertNotSaved(ownerId, phone.phoneKey);
      data.phoneNumber = phone.phoneNumber;
      data.phoneKey = phone.phoneKey;
    }
    const contact = await this.prisma.contact.update({ where: { id }, data });
    return this.resolveOne(contact);
  }

  async remove(ownerId: string, id: string) {
    await this.findOwn(ownerId, id);
    await this.prisma.contact.delete({ where: { id } });
    return { ok: true };
  }

  async lookup(phoneNumber: string): Promise<LookupResponseDto> {
    const phone = normalisePhone(phoneNumber);
    const user = await this.prisma.user.findFirst({
      where: { phoneKey: phone.phoneKey },
      select: { id: true, name: true, avatarFileId: true },
    });
    return {
      phoneNumber: phone.phoneNumber,
      userId: user?.id ?? null,
      name: user?.name ?? null,
      avatarFileId: user?.avatarFileId ?? null,
    };
  }

  private async findOwn(ownerId: string, id: string): Promise<Contact> {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.ownerId !== ownerId) {
      throw new NotFoundException(`Contact '${id}' not found`);
    }
    return contact;
  }

  private async assertNotSaved(ownerId: string, phoneKey: string) {
    const duplicate = await this.prisma.contact.findFirst({ where: { ownerId, phoneKey } });
    if (duplicate) {
      throw new ConflictException(`Already in your contacts as ${duplicate.name}`);
    }
  }

  private async resolveOne(contact: Contact): Promise<ContactResponseDto> {
    const users = await usersByPhoneKey(this.prisma, [contact.phoneKey]);
    return toContact(contact, users.get(contact.phoneKey));
  }
}
