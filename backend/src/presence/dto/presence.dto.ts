import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class TypingDto {
  @ApiProperty({ description: 'Conversation you are typing in', example: '64b8f9e2c4a3b12d4e5f0001' })
  @IsMongoId()
  conversation_id: string;
}

export class OnlineEntryDto {
  @ApiProperty({ example: true })
  online: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, example: '2026-11-22T10:15:00.000Z' })
  lastSeenAt: Date | null;
}

export class PresenceResponseDto {
  @ApiProperty({
    description:
      'For every conversation you are in: ids of the other participants who typed there in the last 6 seconds',
    example: { '64b8f9e2c4a3b12d4e5f0001': ['64b8f9e2c4a3b12d4e5f6790'] },
  })
  typing: Record<string, string[]>;

  @ApiProperty({
    description: 'Presence of every user who shares a conversation with you, keyed by user id',
    example: { '64b8f9e2c4a3b12d4e5f6790': { online: true, lastSeenAt: '2026-11-22T10:15:00.000Z' } },
  })
  online: Record<string, OnlineEntryDto>;
}
