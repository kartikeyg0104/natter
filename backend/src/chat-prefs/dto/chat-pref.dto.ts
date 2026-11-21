import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

export class UpdateChatPrefDto {
  @ApiPropertyOptional({ description: 'Pin the chat (up to 3)', example: true })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ description: 'Archive the chat. Archiving also unpins it.', example: false })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Mute notifications until this time. null unmutes.',
    example: '2026-11-23T08:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  muted_until?: string | null;

  @ApiPropertyOptional({
    description: 'true clears the chat for you: messages up to now are hidden from your GET /message',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  clear?: boolean;
}

export class ChatPrefResponseDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f0001' })
  conversationId: string;

  @ApiProperty({ example: true })
  pinned: boolean;

  @ApiProperty({ example: false })
  archived: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, example: null })
  mutedUntil: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, example: null })
  clearedAt: Date | null;
}
