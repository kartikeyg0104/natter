import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { OkResponseDto } from '../common/ok.dto';
import { PresenceResponseDto, TypingDto } from './dto/presence.dto';
import { PresenceService } from './presence.service';

@ApiTags('presence')
@ApiSecurity('basic-auth')
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post('typing')
  @ApiOperation({
    summary: 'Say that you are typing',
    description: 'Call every few seconds while typing. The signal lasts 6 seconds.',
  })
  @ApiBody({ type: TypingDto })
  @ApiResponse({ status: 201, type: OkResponseDto })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  typing(@CurrentUser() user: any, @Body() body: TypingDto) {
    return this.presenceService.setTyping(user.id, body.conversation_id);
  }

  @Get()
  @ApiOperation({
    summary: 'Typing and online status',
    description:
      'Who is typing in each of your conversations, and the online status of everyone you share a conversation with. ' +
      'Online means a request within the last 30 seconds.',
  })
  @ApiResponse({ status: 200, type: PresenceResponseDto })
  getPresence(@CurrentUser() user: any) {
    return this.presenceService.getPresence(user.id);
  }
}
