import { Controller, Get } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiResponse, ApiSecurity, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { StreakDto } from './dto/streak.dto';
import { StreaksService } from './streaks.service';

@ApiTags('streaks')
@ApiSecurity('basic-auth')
@ApiExtraModels(StreakDto)
@Controller('streaks')
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  @Get()
  @ApiOperation({
    summary: 'My DM streaks',
    description:
      'Keyed by conversation id; only DMs with a streak are listed. A UTC day counts when both people sent ' +
      'at least one message (system notices do not count). The count runs back from today, or from yesterday ' +
      'when today does not count yet, in which case expiresSoon is true. DMs where either person blocked the ' +
      'other are left out.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      additionalProperties: { $ref: getSchemaPath(StreakDto) },
      example: { '64b8f9e2c4a3b12d4e5f0001': { count: 4, expiresSoon: false } },
    },
  })
  getStreaks(@CurrentUser() user: any) {
    return this.streaksService.getStreaks(user.id);
  }
}
