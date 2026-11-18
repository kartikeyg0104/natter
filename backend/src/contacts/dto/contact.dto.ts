import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim.transform';

export class CreateContactDto {
  @ApiProperty({ description: 'Name to save the contact under (1 to 60 characters)', example: 'Ishaan (lab)' })
  @Trim()
  @IsString()
  @Length(1, 60)
  name: string;

  @ApiProperty({ description: 'Phone number, 7 to 15 digits, optionally starting with +', example: '+91 98100 00002' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone_number: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional({ example: 'Ishaan' })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 60)
  name?: string;

  @ApiPropertyOptional({ example: '+919810000002' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone_number?: string;
}

export class LookupContactDto {
  @ApiProperty({ description: 'Phone number to look up', example: '+919810000002' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone_number: string;
}

export class ContactResponseDto {
  @ApiProperty({ example: '64b8f9e2c4a3b12d4e5f7001' })
  id: string;

  @ApiProperty({ example: 'Ishaan (lab)' })
  name: string;

  @ApiProperty({ description: 'Normalised number', example: '+919810000002' })
  phoneNumber: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The Natter user with this number, or null when nobody has registered it',
    example: '64b8f9e2c4a3b12d4e5f6790',
  })
  userId: string | null;

  @ApiProperty({ example: '2026-11-22T10:15:00.000Z' })
  createdAt: Date;
}

export class LookupResponseDto {
  @ApiProperty({ description: 'Normalised number', example: '+919810000002' })
  phoneNumber: string;

  @ApiProperty({ type: String, nullable: true, example: '64b8f9e2c4a3b12d4e5f6790' })
  userId: string | null;

  @ApiProperty({ type: String, nullable: true, description: "That user's username", example: 'ishaan' })
  name: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  avatarFileId: string | null;
}
