import { ApiProperty } from '@nestjs/swagger';

export class StreakDto {
  @ApiProperty({ description: 'Consecutive UTC days on which both people sent a message', example: 4 })
  count: number;

  @ApiProperty({ description: 'Nobody has kept it going today yet; it ends at UTC midnight', example: false })
  expiresSoon: boolean;
}
