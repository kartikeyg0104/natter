import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateBlockDto {
  @ApiProperty({ description: 'User to block', example: '64b8f9e2c4a3b12d4e5f6790' })
  @IsMongoId()
  user_id: string;
}

export class BlocksResponseDto {
  @ApiProperty({ type: [String], description: 'Users you have blocked', example: ['64b8f9e2c4a3b12d4e5f6790'] })
  userIds: string[];
}
