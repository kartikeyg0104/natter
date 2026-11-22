import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

export const CAPABILITIES = {
  version: 1,
  features: [
    'profile',
    'people',
    'presence',
    'contacts',
    'blocks',
    'chat-prefs',
    'message-actions',
    'status',
    'group-admin',
    'avatar-presets',
    'snaps',
    'disappearing',
    'screenshots',
    'streaks',
  ],
};

class CapabilitiesResponseDto {
  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ type: [String], example: CAPABILITIES.features })
  features: string[];
}

@ApiTags('capabilities')
@ApiSecurity('basic-auth')
@Controller('capabilities')
export class CapabilitiesController {
  @Get()
  @ApiOperation({
    summary: 'Optional features this server supports',
    description: 'Apps call this to decide which extra features to show. Servers without it support none of them.',
  })
  @ApiResponse({ status: 200, type: CapabilitiesResponseDto })
  getCapabilities() {
    return CAPABILITIES;
  }
}
