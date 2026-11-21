import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { ParseObjectIdPipe } from '../common/object-id.pipe';
import { ChatPrefsService } from './chat-prefs.service';
import { ChatPrefResponseDto, UpdateChatPrefDto } from './dto/chat-pref.dto';

@ApiTags('chat-prefs')
@ApiSecurity('basic-auth')
@Controller('chat-prefs')
export class ChatPrefsController {
  constructor(private readonly chatPrefsService: ChatPrefsService) {}

  @Get()
  @ApiOperation({
    summary: 'My per-chat settings',
    description: 'Pinned, archived, muted and cleared state. Only chats you have changed are listed.',
  })
  @ApiResponse({ status: 200, type: [ChatPrefResponseDto] })
  list(@CurrentUser() user: any) {
    return this.chatPrefsService.list(user.id);
  }

  @Patch(':conversationId')
  @ApiOperation({ summary: 'Pin, archive, mute or clear a chat' })
  @ApiParam({ name: 'conversationId', description: 'ObjectId of a conversation you are in' })
  @ApiBody({ type: UpdateChatPrefDto })
  @ApiResponse({ status: 200, type: ChatPrefResponseDto })
  @ApiResponse({ status: 400, description: 'You can pin up to 3 chats' })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  update(
    @CurrentUser() user: any,
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @Body() body: UpdateChatPrefDto,
  ) {
    return this.chatPrefsService.update(user.id, conversationId, body);
  }
}
