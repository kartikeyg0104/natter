import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim.transform';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description:
      'Your phone number. Spaces, dashes and brackets are ignored; 7 to 15 digits, optionally starting with +. ' +
      'An empty string removes it.',
    example: '+91 98100 00001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone_number?: string;

  @ApiPropertyOptional({ description: 'Short "about" text (max 140 characters). Empty removes it.', example: 'Hey there!' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(140)
  about?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'ObjectId of an IMAGE you uploaded with POST /file. null removes the avatar.',
    example: '64b8f9e2c4a3b12d4e5f9001',
  })
  @IsOptional()
  @IsMongoId()
  avatar_file_id?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Illustrated avatar as "<style>:<seed>". style is one of ' +
      'adventurer, big-smile, fun-emoji, micah, bottts-neutral, avataaars; seed is 1 to 40 characters of ' +
      'letters, digits, space, _ or -. Setting it removes avatar_file_id (and setting avatar_file_id removes it). ' +
      'null removes it.',
    example: 'adventurer:zara',
  })
  @IsOptional()
  @IsString({ message: 'Unknown avatar' })
  avatar_preset?: string | null;
}

export class ProfileResponseDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f6789' })
  id: string;

  @ApiProperty({ description: 'Username', example: 'zara' })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: '+919810000001' })
  phoneNumber: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Physics, coffee, repeat' })
  about: string | null;

  @ApiProperty({ type: String, nullable: true, example: '64b8f9e2c4a3b12d4e5f9001' })
  avatarFileId: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Illustrated avatar "<style>:<seed>"', example: null })
  avatarPreset: string | null;
}

export class PersonResponseDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f6789' })
  id: string;

  @ApiProperty({ example: 'ishaan' })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: 'Building circuits' })
  about: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  avatarFileId: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Illustrated avatar "<style>:<seed>"', example: 'fun-emoji:ishaan' })
  avatarPreset: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, example: '2026-11-22T10:15:00.000Z' })
  lastSeenAt: Date | null;

  @ApiProperty({ description: 'Last request within the last 30 seconds', example: true })
  online: boolean;
}
