import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  Max,
  Min,
  IsString,
  IsOptional,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FileResponseDto } from '../../file/dto/file.dto';

// ─── Query DTO ────────────────────────────────────────────────────────────────

export class GetMessagesDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the conversation to fetch messages from',
    example: '64b8f9e2c4a3b12d4e5f0001',
  })
  @IsMongoId()
  conversation_id: string;

  @ApiPropertyOptional({
    description:
      'Cursor for pagination — the ObjectId of the last fetched message. ' +
      'Omit on the first request; pass the oldest message ID received to load the previous page.',
    example: '64b8f9e2c4a3b12d4e5f1234',
  })
  @IsOptional()
  @IsMongoId()
  from_message_cursor?: string;
}

// ─── Request Body DTO ─────────────────────────────────────────────────────────

export class CreateMessageDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the conversation this message belongs to',
    example: '64b8f9e2c4a3b12d4e5f0001',
  })
  @IsMongoId()
  conversation_id: string;

  @ApiPropertyOptional({
    description:
      'Text content of the message. Required for text messages; optional (a caption) when file_id is given.',
    example: 'Hey, are we meeting tomorrow?',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({
    description:
      'ObjectId of an image or file uploaded with POST /file. It must have been uploaded by the sender.',
    example: '64b8f9e2c4a3b12d4e5f9001',
  })
  @IsOptional()
  @IsMongoId()
  file_id?: string;

  @ApiPropertyOptional({
    description: 'ObjectId of the message this one replies to. It must be in the same conversation.',
    example: '64b8f9e2c4a3b12d4e5f1234',
  })
  @IsOptional()
  @IsMongoId()
  reply_to_id?: string;

  @ApiPropertyOptional({
    description:
      'Send the photo as a snap: each other participant can open it once with POST /message/{id}/open. ' +
      'Needs file_id of an IMAGE; content is an optional caption.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  view_once?: boolean;

  @ApiPropertyOptional({
    description: 'Snaps only: how many seconds the photo stays on screen once opened (1 to 30, default 10)',
    minimum: 1,
    maximum: 30,
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  view_seconds?: number;
}

export class ScreenshotDto {
  @ApiProperty({ description: 'Conversation where the screenshot was taken', example: '64b8f9e2c4a3b12d4e5f0001' })
  @IsMongoId()
  conversation_id: string;
}

export class ReactMessageDto {
  @ApiProperty({
    description: 'Emoji to react with (max 16 characters). An empty string removes your reaction.',
    example: '\u{1F44D}',
  })
  @IsString()
  @MaxLength(16)
  emoji: string;
}

export class EditMessageDto {
  @ApiProperty({ description: 'New text (1 to 4000 characters)', example: 'See you at 7 instead' })
  @IsString()
  @Length(1, 4000)
  content: string;
}

export class DeleteMessageQueryDto {
  @ApiPropertyOptional({
    description: '`me` hides it only for you (default); `everyone` deletes it for all participants (sender only)',
    enum: ['me', 'everyone'],
    example: 'me',
  })
  @IsOptional()
  @IsIn(['me', 'everyone'])
  scope?: 'me' | 'everyone';
}

export class StarMessageDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  starred: boolean;
}

export class ForwardMessageDto {
  @ApiProperty({ description: 'Message to forward', example: '64b8f9e2c4a3b12d4e5f1234' })
  @IsMongoId()
  message_id: string;

  @ApiProperty({
    description: 'Conversations to forward it to (1 to 5)',
    type: [String],
    example: ['64b8f9e2c4a3b12d4e5f0002'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsMongoId({ each: true })
  conversation_ids: string[];
}

export class SearchMessagesDto {
  @ApiProperty({ description: 'Conversation to search', example: '64b8f9e2c4a3b12d4e5f0001' })
  @IsMongoId()
  conversation_id: string;

  @ApiProperty({ description: 'Text to find (1 to 100 characters, case-insensitive)', example: 'hike' })
  @IsString()
  @Length(1, 100)
  q: string;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
const MESSAGE_TYPES = ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'];

export class ReplyPreviewDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f1200' })
  id: string;

  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f6790' })
  senderId: string;

  @ApiProperty({ description: 'Empty when the original was deleted', example: 'Anyone up for a hike?' })
  content: string;

  @ApiProperty({ enum: MESSAGE_TYPES, example: 'TEXT' })
  type: MessageType;

  @ApiProperty({ description: 'The original was deleted for everyone', example: false })
  deleted: boolean;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Unique MongoDB ObjectId of the message',
    example: '64b8f9e2c4a3b12d4e5f1234',
  })
  id: string;

  @ApiProperty({
    description:
      'Text content of the message (empty string for an attachment sent without a caption)',
    example: 'Hey, are we meeting tomorrow?',
  })
  content: string;

  @ApiProperty({
    description:
      'TEXT, IMAGE / FILE when the message has an attachment, or SYSTEM for a notice ' +
      '(content is the sentence, senderId the user it is about)',
    enum: MESSAGE_TYPES,
    example: 'TEXT',
  })
  type: MessageType;

  @ApiPropertyOptional({
    type: String,
    description: 'ObjectId of the attached file, or null. Always null for snaps (viewOnce).',
    example: null,
    nullable: true,
  })
  fileId?: string | null;

  @ApiPropertyOptional({
    type: () => FileResponseDto,
    description:
      'Metadata of the attached file (without its contents), or null. Fetch the contents with GET /file/{id}.',
    nullable: true,
  })
  file?: FileResponseDto | null;

  @ApiProperty({
    description: 'ISO timestamp when the message was created',
    example: '2024-01-15T10:35:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'MongoDB ObjectId of the message sender (from auth header)',
    example: '64b8f9e2c4a3b12d4e5f6789',
  })
  senderId: string;

  @ApiProperty({
    description: 'MongoDB ObjectId of the conversation this message belongs to',
    example: '64b8f9e2c4a3b12d4e5f0001',
  })
  conversationId: string;

  @ApiProperty({
    description:
      'Delivery/read status keyed by participant user IDs. ' +
      'Sender starts as delivered+read=true; all others default to false.',
    example: {
      '64b8f9e2c4a3b12d4e5f6789': { delivered: true, read: true },
      '64b8f9e2c4a3b12d4e5f6790': { delivered: false, read: false },
    },
  })
  status: Record<string, { delivered: boolean; read: boolean }>;

  @ApiProperty({
    type: () => ReplyPreviewDto,
    nullable: true,
    description: 'The message this one replies to, or null',
  })
  replyTo: ReplyPreviewDto | null;

  @ApiProperty({
    description: 'Reactions keyed by user id ({} when none)',
    example: { '64b8f9e2c4a3b12d4e5f6790': '\u{1F44D}' },
  })
  reactions: Record<string, string>;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'When the text was last edited', example: null })
  editedAt: Date | null;

  @ApiProperty({
    description: 'Deleted for everyone. content is then "", fileId and file are null.',
    example: false,
  })
  deleted: boolean;

  @ApiProperty({ description: 'Forwarded from another chat', example: false })
  forwarded: boolean;

  @ApiProperty({ description: 'You starred this message', example: false })
  starred: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['screenshot', 'disappearing'],
    description: 'For SYSTEM messages: what the notice is about. null otherwise.',
    example: null,
  })
  systemKind: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the message disappears (sent while disappearing messages were on), or null',
    example: null,
  })
  expiresAt: Date | null;

  @ApiProperty({ description: 'A snap: the photo can be opened once with POST /message/{id}/open', example: false })
  viewOnce: boolean;

  @ApiProperty({ type: Number, nullable: true, description: 'Snaps: seconds the photo stays on screen', example: null })
  viewSeconds: number | null;

  @ApiProperty({ type: [String], description: 'Snaps: users who already opened it', example: [] })
  openedBy: string[];
}

export class OpenSnapResponseDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f1234' })
  id: string;

  @ApiProperty({ description: 'The photo as a data URL', example: 'data:image/png;base64,iVBORw0KGgo...' })
  data: string;

  @ApiProperty({ description: 'Caption (may be empty)', example: 'Guess where I am' })
  content: string;

  @ApiProperty({ description: 'Seconds to show the photo', example: 10 })
  viewSeconds: number;
}

export class PaginatedMessagesResponseDto {
  @ApiProperty({
    description: 'Messages for this page (oldest to newest within the page)',
    type: [MessageResponseDto],
  })
  data: MessageResponseDto[];

  @ApiPropertyOptional({
    description:
      'Pass this as from_message_cursor on the next request to load older messages. Null = no more pages.',
    example: '64b8f9e2c4a3b12d4e5f1111',
  })
  nextCursor?: string | null;

  @ApiProperty({ description: 'Items returned in this page', example: 20 })
  count: number;
}
