import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsMongoId,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Length,
  IsInt,
} from 'class-validator';
import { DISAPPEAR_OPTIONS } from '../../common/disappearing.util';
import { Trim } from '../../common/trim.transform';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Conversation type: DM or GROUP. Defaults to DM for single participant, GROUP for multiple.',
    enum: ['DM', 'GROUP'],
    example: 'DM',
  })
  @IsOptional()
  @IsIn(['DM', 'GROUP'])
  type?: 'DM' | 'GROUP';

  @ApiPropertyOptional({
    description: 'Name of the conversation. Optional for DM, recommended for GROUP.',
    example: 'Project Alpha',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Array of participant user ObjectIds (caller is added automatically).',
    example: ['64b8f9e2c4a3b12d4e5f6790'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  participants_ids?: string[];
}

export class RenameConversationDto {
  @ApiProperty({ description: 'New group name (1 to 60 characters)', example: 'Lab partners 2.0' })
  @Trim()
  @IsString()
  @Length(1, 60)
  name: string;
}

export class AddMembersDto {
  @ApiProperty({
    description: 'Users to add (1 to 50). People already in the group are ignored.',
    type: [String],
    example: ['64b8f9e2c4a3b12d4e5f6791'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsMongoId({ each: true })
  user_ids: string[];
}

export class SetDisappearingDto {
  @ApiProperty({
    description: 'Timer for new messages: 0 (off), 86400 (24 hours) or 604800 (7 days)',
    enum: DISAPPEAR_OPTIONS,
    example: 86400,
  })
  @IsInt()
  @IsIn([...DISAPPEAR_OPTIONS], { message: 'seconds must be 0, 86400 or 604800' })
  seconds: number;
}

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Unique MongoDB ObjectId of the conversation',
    example: '64b8f9e2c4a3b12d4e5f0001',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Name of the conversation. Null for DM conversations.',
    example: 'Study Group',
  })
  name?: string | null;

  @ApiProperty({
    description: 'Type of conversation: DM (direct message) or GROUP',
    example: 'DM',
    enum: ['DM', 'GROUP'],
  })
  type: string;

  @ApiProperty({
    description: 'ISO timestamp when the conversation was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'MongoDB ObjectId of the user who created this conversation',
    example: '64b8f9e2c4a3b12d4e5f6789',
  })
  createdBy: string;

  @ApiProperty({
    description: 'List of participant user ObjectIds (including creator)',
    example: ['64b8f9e2c4a3b12d4e5f6789', '64b8f9e2c4a3b12d4e5f6790'],
    type: [String],
  })
  participants_ids: string[];

  @ApiProperty({
    description: 'Disappearing messages timer in seconds: 0 (off), 86400 (24 hours) or 604800 (7 days)',
    example: 0,
  })
  disappearSeconds: number;
}
