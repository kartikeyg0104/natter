/**
 * Seeds demo users, conversations and messages for local testing, plus
 * phone numbers, about texts, illustrated avatars, contacts, a reply, reactions,
 * status updates, a 4-day streak between zara and ishaan and an unopened snap
 * from noor to zara.
 *
 *   docker exec natter_api npm run seed
 *
 * Safe to run repeatedly: existing users and conversations are reused,
 * messages are only added to conversations that have none yet, and the
 * extras are only added when they are missing.
 */
import { deflateSync } from 'zlib';
import { PrismaClient } from '@prisma/client';

const DEMO_PASSWORD = 'natter123';
const DEMO_USERS = ['zara', 'ishaan', 'noor', 'vikram', 'tara'];
const MINUTES_BETWEEN_MESSAGES = 3;
const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;

const PROFILES: Record<string, { phone: string; about: string; avatar: string }> = {
  zara: { phone: '+919810000001', about: 'Physics, cinnamon rolls, repeat', avatar: 'adventurer:zara' },
  ishaan: { phone: '+919810000002', about: 'Probably soldering something', avatar: 'fun-emoji:ishaan' },
  noor: { phone: '+919810000003', about: 'At the library', avatar: 'big-smile:noor' },
  vikram: { phone: '+919810000004', about: 'Will trade coffee for calculators', avatar: 'micah:vikram' },
  tara: { phone: '+919810000005', about: 'Weekend hikes only', avatar: 'avataaars:tara' },
};

/** One message from each of zara and ishaan per day, oldest day first (3 days ago .. today). */
const STREAK_DAYS: { zara: string; ishaan: string }[] = [
  { zara: 'Lab report submitted, finally', ishaan: 'Nice, mine goes in tonight' },
  { zara: 'The library printer is fixed', ishaan: 'Best news all week' },
  { zara: 'Bring the multimeter tomorrow?', ishaan: 'Already in my bag' },
  { zara: 'Coffee before the lab?', ishaan: 'Yes, see you at 9' },
];

const SNAP = { from: 'noor', to: 'zara', caption: 'Guess where I am', viewSeconds: 5, fileName: 'snap.png' };

const ZARA_CONTACTS = [
  { name: 'Ishaan (lab)', phone: '+919810000002' },
  { name: 'Noor', phone: '+919810000003' },
  { name: 'Mom', phone: '+919810009999' },
];

const STATUSES = [
  { from: 'ishaan', text: 'The circuit finally works', background: '#1F7A5C' },
  { from: 'noor', text: 'Library until 9 tonight, come say hi', background: '#5B3FA0' },
  { from: 'zara', text: 'Cinnamon roll Sunday', background: '#C2185B' },
];

const THUMBS_UP = '\u{1F44D}';
const PARTY = '\u{1F389}';
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

// 1x1 PNG so image messages can be tested without real photos
const PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

type SeedMessage = { from: string; text?: string; image?: string };

interface SeedConversation {
  type: 'DM' | 'GROUP';
  name: string | null;
  members: string[];
  messages: SeedMessage[];
}

const CONVERSATIONS: SeedConversation[] = [
  {
    type: 'DM',
    name: null,
    members: ['zara', 'ishaan'],
    messages: [
      { from: 'ishaan', text: 'Did you get the bus pass renewed?' },
      { from: 'zara', text: 'Not yet, the counter closes at 4 and I keep missing it' },
      { from: 'ishaan', text: 'You can do it online now, takes two minutes' },
      { from: 'zara', text: 'Oh nice, doing it right now' },
    ],
  },
  {
    type: 'DM',
    name: null,
    members: ['noor', 'vikram'],
    messages: [
      { from: 'vikram', text: 'Can I borrow your calculator for the morning?' },
      { from: 'noor', text: 'Sure, I will leave it at the library desk' },
      { from: 'vikram', text: 'Lifesaver. Coffee is on me' },
    ],
  },
  {
    type: 'DM',
    name: null,
    members: ['tara', 'zara'],
    messages: [
      { from: 'tara', text: 'Is the new bakery near the station any good?' },
      { from: 'zara', text: 'The cinnamon rolls are worth the queue' },
    ],
  },
  {
    type: 'GROUP',
    name: 'Lab partners',
    members: ['zara', 'ishaan', 'noor'],
    messages: [
      { from: 'noor', text: 'Readings from this afternoon are in the shared sheet' },
      { from: 'ishaan', text: 'Here is the circuit we ended up with', image: 'circuit-sketch.png' },
      { from: 'zara', text: 'The second resistor looks swapped, can you double check?' },
      { from: 'ishaan', text: 'Good catch, I will redo that bit tomorrow' },
    ],
  },
  {
    type: 'GROUP',
    name: 'Weekend plans',
    members: ['zara', 'ishaan', 'noor', 'vikram', 'tara'],
    messages: [
      { from: 'tara', text: 'Anyone up for a hike on Saturday?' },
      { from: 'vikram', text: 'Yes, as long as we start after 8' },
      { from: 'noor', text: 'I can bring snacks' },
      { from: 'zara', text: 'Count me in, I will check the weather' },
      { from: 'ishaan', text: 'Meet at the north gate then?' },
    ],
  },
  {
    type: 'GROUP',
    name: 'Exam prep',
    members: ['ishaan', 'vikram', 'tara'],
    messages: [
      { from: 'vikram', text: 'Should we split the past papers between us?' },
      { from: 'tara', text: 'I will take 2023 and 2024' },
      { from: 'ishaan', text: 'Then I have 2022. Call on Sunday evening to compare?' },
    ],
  },
];

const prisma = new PrismaClient();

async function ensureUser(name: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing) {
    if (existing.phone !== DEMO_PASSWORD) {
      console.warn(`  ! ${name} already exists with a different password; left unchanged`);
    }
    return existing.id;
  }
  const user = await prisma.user.create({
    data: { name, phone: DEMO_PASSWORD, conversationIds: [] },
  });
  return user.id;
}

async function ensureConversation(seed: SeedConversation, ids: string[]): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: {
      type: seed.type,
      participants_ids: { hasEvery: ids },
      ...(seed.type === 'GROUP' ? { name: seed.name } : {}),
    },
  });
  if (existing) return existing.id;

  const conversation = await prisma.conversation.create({
    data: { type: seed.type, name: seed.name, createdBy: ids[0], participants_ids: ids },
  });
  await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { conversationIds: { push: conversation.id } },
  });
  return conversation.id;
}

/** Everyone has read every message except the last one in each conversation. */
function buildStatus(memberIds: string[], senderId: string, isLast: boolean) {
  const status: Record<string, { delivered: boolean; read: boolean }> = {};
  for (const id of memberIds) {
    const isSender = id === senderId;
    status[id] = { delivered: true, read: isSender || !isLast };
  }
  return status;
}

// ─── A small real PNG for the snap (64x64 sky-to-sand gradient) ───────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function gradientPng(size = 64): Buffer {
  const top = [86, 170, 230];
  const bottom = [240, 214, 160];
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const pixel = top.map((c, i) => Math.round(c + (bottom[i] - c) * t));
    const row = Buffer.alloc(1 + size * 3); // filter byte 0, then RGB
    for (let x = 0; x < size; x++) row.set(pixel, 1 + x * 3);
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function uploadImage(fileName: string, uploaderId: string, png?: Buffer): Promise<string> {
  const bytes = png ?? Buffer.from(PIXEL_PNG_BASE64, 'base64');
  const file = await prisma.file.create({
    data: {
      name: fileName,
      mimeType: 'image/png',
      size: bytes.length,
      kind: 'IMAGE',
      data: new Uint8Array(bytes),
      uploadedBy: uploaderId,
    },
  });
  return file.id;
}

async function seedMessages(
  seed: SeedConversation,
  conversationId: string,
  idsByName: Map<string, string>,
): Promise<number> {
  const alreadySeeded = await prisma.message.count({ where: { conversationId } });
  if (alreadySeeded > 0) return 0;

  const memberIds = seed.members.map((m) => idsByName.get(m));
  const start = Date.now() - seed.messages.length * MINUTES_BETWEEN_MESSAGES * MS_PER_MINUTE;

  for (const [index, message] of seed.messages.entries()) {
    const senderId = idsByName.get(message.from);
    const fileId = message.image ? await uploadImage(message.image, senderId) : null;
    await prisma.message.create({
      data: {
        content: message.text ?? '',
        type: fileId ? 'IMAGE' : 'TEXT',
        fileId,
        senderId,
        conversationId,
        createdAt: new Date(start + index * MINUTES_BETWEEN_MESSAGES * MS_PER_MINUTE),
        status: buildStatus(memberIds, senderId, index === seed.messages.length - 1),
      },
    });
  }
  return seed.messages.length;
}

/** Same rules as the server: digits plus an optional leading '+'; key = last 10 digits. */
function phoneParts(input: string) {
  const digits = input.replace(/\D/g, '');
  return { phoneNumber: (input.trim().startsWith('+') ? '+' : '') + digits, phoneKey: digits.slice(-10) };
}

async function seedProfiles(idsByName: Map<string, string>) {
  for (const [name, profile] of Object.entries(PROFILES)) {
    const id = idsByName.get(name);
    const { phoneNumber, phoneKey } = phoneParts(profile.phone);
    const owner = await prisma.user.findFirst({ where: { phoneKey, id: { not: id } }, select: { name: true } });
    if (owner) {
      console.warn(`  ! ${profile.phone} already belongs to ${owner.name}; ${name}'s number left unchanged`);
      await prisma.user.update({ where: { id }, data: { about: profile.about } });
      continue;
    }
    await prisma.user.update({ where: { id }, data: { phoneNumber, phoneKey, about: profile.about } });
  }
}

/** Illustrated avatars. Like the server, a preset replaces a photo avatar. */
async function seedAvatars(idsByName: Map<string, string>) {
  for (const [name, profile] of Object.entries(PROFILES)) {
    await prisma.user.update({
      where: { id: idsByName.get(name) },
      data: { avatarPreset: profile.avatar, avatarFileId: null },
    });
  }
}

async function findDm(a: string, b: string) {
  return prisma.conversation.findFirst({ where: { type: 'DM', participants_ids: { hasEvery: [a, b] } } });
}

/**
 * Makes sure zara and ishaan both sent a message on each of the last 4 UTC days
 * (3 days ago to today), so they have a 4-day streak. Days that already have a
 * message from someone are left alone. Returns how many messages were added.
 */
async function seedStreak(idsByName: Map<string, string>): Promise<number> {
  const zara = idsByName.get('zara');
  const ishaan = idsByName.get('ishaan');
  const dm = await findDm(zara, ishaan);
  if (!dm) return 0;

  const now = new Date();
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let added = 0;

  for (const [index, lines] of STREAK_DAYS.entries()) {
    const daysAgo = STREAK_DAYS.length - 1 - index;
    const dayStart = todayStart - daysAgo * MS_PER_DAY;
    // Past days: mid-morning. Today: a little before now, but never before midnight UTC.
    const base = daysAgo === 0 ? Math.max(dayStart, now.getTime() - 30 * MS_PER_MINUTE) : dayStart + 9 * 60 * MS_PER_MINUTE;

    for (const [offset, from] of (['zara', 'ishaan'] as const).entries()) {
      const senderId = idsByName.get(from);
      const exists = await prisma.message.findFirst({
        where: {
          conversationId: dm.id,
          senderId,
          type: { in: ['TEXT', 'IMAGE', 'FILE'] },
          createdAt: { gte: new Date(dayStart), lt: new Date(dayStart + MS_PER_DAY) },
        },
        select: { id: true },
      });
      if (exists) continue;
      const createdAt = new Date(Math.min(base + offset * MS_PER_MINUTE, now.getTime()));
      await prisma.message.create({
        data: {
          content: lines[from],
          type: 'TEXT',
          senderId,
          conversationId: dm.id,
          createdAt,
          status: buildStatus(dm.participants_ids, senderId, false),
        },
      });
      added++;
    }
  }
  return added;
}

/** One unopened snap from noor to zara in their DM (created if missing). Returns 1 when added. */
async function seedSnap(idsByName: Map<string, string>): Promise<number> {
  const senderId = idsByName.get(SNAP.from);
  const recipientId = idsByName.get(SNAP.to);
  const conversationId = await ensureConversation(
    { type: 'DM', name: null, members: [SNAP.from, SNAP.to], messages: [] },
    [senderId, recipientId],
  );

  const snaps = await prisma.message.findMany({
    where: { conversationId, senderId, viewOnce: true, content: SNAP.caption },
    select: { openedBy: true, fileId: true, deletedForEveryone: true },
  });
  const unopened = snaps.some(
    (m) => m.fileId && !m.deletedForEveryone && !(m.openedBy ?? []).includes(recipientId),
  );
  if (unopened) return 0;

  const fileId = await uploadImage(SNAP.fileName, senderId, gradientPng());
  await prisma.message.create({
    data: {
      content: SNAP.caption,
      type: 'IMAGE',
      fileId,
      senderId,
      conversationId,
      status: buildStatus([senderId, recipientId], senderId, true),
      viewOnce: true,
      viewSeconds: SNAP.viewSeconds,
      openedBy: [],
    },
  });
  return 1;
}

async function seedContacts(ownerId: string): Promise<number> {
  let added = 0;
  for (const contact of ZARA_CONTACTS) {
    const { phoneNumber, phoneKey } = phoneParts(contact.phone);
    const existing = await prisma.contact.findFirst({ where: { ownerId, phoneKey } });
    if (existing) continue;
    await prisma.contact.create({ data: { ownerId, name: contact.name, phoneNumber, phoneKey } });
    added++;
  }
  return added;
}

async function findGroupMessage(groupName: string, content: string) {
  const group = await prisma.conversation.findFirst({ where: { type: 'GROUP', name: groupName } });
  if (!group) return null;
  return prisma.message.findFirst({ where: { conversationId: group.id, content } });
}

/** A reply in "Lab partners" and two reactions in "Weekend plans". */
async function seedReplyAndReactions(idsByName: Map<string, string>) {
  const original = await findGroupMessage('Lab partners', 'The second resistor looks swapped, can you double check?');
  const reply = await findGroupMessage('Lab partners', 'Good catch, I will redo that bit tomorrow');
  if (original && reply && reply.replyToId !== original.id) {
    await prisma.message.update({ where: { id: reply.id }, data: { replyToId: original.id } });
  }

  const hike = await findGroupMessage('Weekend plans', 'Anyone up for a hike on Saturday?');
  if (hike) {
    const current = hike.reactions && typeof hike.reactions === 'object' && !Array.isArray(hike.reactions)
      ? (hike.reactions as Record<string, string>)
      : {};
    const reactions = { ...current, [idsByName.get('zara')]: THUMBS_UP, [idsByName.get('noor')]: PARTY };
    await prisma.message.update({ where: { id: hike.id }, data: { reactions } });
  }
}

async function seedStatuses(idsByName: Map<string, string>): Promise<number> {
  let added = 0;
  const now = new Date();
  for (const status of STATUSES) {
    const userId = idsByName.get(status.from);
    const live = await prisma.status.findFirst({
      where: { userId, text: status.text, expiresAt: { gt: now } },
    });
    if (live) continue;
    await prisma.status.create({
      data: {
        userId,
        type: 'TEXT',
        text: status.text,
        background: status.background,
        createdAt: now,
        expiresAt: new Date(now.getTime() + STATUS_LIFETIME_MS),
        viewerIds: [],
      },
    });
    added++;
  }
  return added;
}

async function main() {
  const idsByName = new Map<string, string>();
  for (const name of DEMO_USERS) {
    idsByName.set(name, await ensureUser(name));
  }

  let messageCount = 0;
  for (const seed of CONVERSATIONS) {
    const ids = seed.members.map((m) => idsByName.get(m));
    const conversationId = await ensureConversation(seed, ids);
    messageCount += await seedMessages(seed, conversationId, idsByName);
  }

  await seedProfiles(idsByName);
  const contactCount = await seedContacts(idsByName.get('zara'));
  await seedReplyAndReactions(idsByName);
  const statusCount = await seedStatuses(idsByName);
  await seedAvatars(idsByName);
  const streakCount = await seedStreak(idsByName);
  const snapCount = await seedSnap(idsByName);

  console.log(`Seeded ${DEMO_USERS.length} users, ${CONVERSATIONS.length} conversations, ${messageCount} new messages`);
  console.log(`Profiles updated; ${contactCount} new contact(s) for zara; ${statusCount} new status update(s)`);
  console.log(`Avatars set; ${streakCount} new streak message(s) for zara and ishaan; ${snapCount} new snap from noor`);
  console.log(`Log in as any of: ${DEMO_USERS.join(', ')}  (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
