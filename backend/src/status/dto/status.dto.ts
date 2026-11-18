import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateStatusDto {
  @ApiPropertyOptional({ description: 'Text of the update, or the caption of an image (max 700)', example: 'Lab results are in!' })
  @IsOptional()
  @IsString()
  @MaxLength(700)
  text?: string;

  @ApiPropertyOptional({ description: 'Background colour of a text update, #RRGGBB', example: '#1F7A5C' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'background must be a colour like #1F7A5C' })
  background?: string;

  @ApiPropertyOptional({ description: 'ObjectId of an IMAGE you uploaded with POST /file', example: '64b8f9e2c4a3b12d4e5f9001' })
  @IsOptional()
  @IsMongoId()
  file_id?: string;
}

export class StatusItemDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f8001' })
  id: string;

  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f6789' })
  userId: string;

  @ApiProperty({ enum: ['TEXT', 'IMAGE'], example: 'TEXT' })
  type: string;

  @ApiProperty({ type: String, nullable: true, example: 'Lab results are in!' })
  text: string | null;

  @ApiProperty({ type: String, nullable: true, example: '#1F7A5C' })
  background: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  fileId: string | null;

  @ApiProperty({ example: '2026-11-22T10:15:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'createdAt + 24 hours', example: '2026-11-23T10:15:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ description: 'You have viewed it (always true for your own)', example: false })
  viewed: boolean;

  @ApiProperty({ type: Number, nullable: true, description: 'How many people viewed it; only for your own items', example: null })
  viewCount: number | null;
}

export class StatusGroupDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f6790' })
  userId: string;

  @ApiProperty({ type: [StatusItemDto], description: 'Oldest first' })
  items: StatusItemDto[];

  @ApiProperty({ example: false })
  allViewed: boolean;
}

export class StatusFeedDto {
  @ApiProperty({ type: [StatusItemDto], description: 'Your unexpired updates, oldest first' })
  mine: StatusItemDto[];

  @ApiProperty({
    type: [StatusGroupDto],
    description: 'Updates from people you chat with or saved as contacts; unviewed first, then newest first',
  })
  others: StatusGroupDto[];
}

export class StatusViewerDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f6790' })
  userId: string;

  @ApiProperty({ example: 'ishaan' })
  name: string;
}
