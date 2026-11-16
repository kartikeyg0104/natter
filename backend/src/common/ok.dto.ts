import { ApiProperty } from '@nestjs/swagger';

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;
}

export const OK = { ok: true } as const;
