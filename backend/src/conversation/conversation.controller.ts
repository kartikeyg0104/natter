import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import {
  AddMembersDto,
  ConversationResponseDto,
  CreateConversationDto,
  RenameConversationDto,
  SetDisappearingDto,
} from './dto/conversation.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { OkResponseDto } from '../common/ok.dto';
import { ParseObjectIdPipe } from '../common/object-id.pipe';

const CONVERSATION_ID_PARAM = { name: 'id', description: 'MongoDB ObjectId of a group conversation you are in' };

@ApiTags('conversations')
@ApiSecurity('basic-auth')
@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  @ApiOperation({
    summary: 'List my conversations',
    description:
      'Returns all conversations the authenticated user participates in, ' +
      'sorted by createdAt descending (newest first). ' +
      'User is identified from the `Authorization: Basic <username>:<password>` header.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of conversations returned successfully',
    type: [ConversationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization header' })
  getConversations(@CurrentUser() user: any) {
    return this.conversationService.getUserConversations(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create or find a conversation',
    description:
      'Creates a new DM or Group conversation. The caller is automatically added to participants. ' +
      'For DMs, if a conversation between the two users already exists, it is returned instead of creating a duplicate.',
  })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({
    status: 201,
    description: 'Conversation created or found',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error or invalid participants' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization header' })
  @ApiResponse({ status: 404, description: 'Recipient user not found' })
  createConversation(
    @Body() body: CreateConversationDto,
    @CurrentUser() user: any,
  ) {
    return this.conversationService.createConversation(body, user.id);
  }

  @Patch(':id/disappearing')
  @ApiOperation({
    summary: 'Turn disappearing messages on or off',
    description:
      'Any participant, DMs and groups. New messages then expire after the chosen time and are hidden from ' +
      'GET /message, search and starred. Posts a SYSTEM message (systemKind "disappearing") saying who changed it.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of a conversation you are in' })
  @ApiBody({ type: SetDisappearingDto })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({ status: 400, description: 'seconds must be 0, 86400 or 604800' })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  setDisappearing(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: SetDisappearingDto,
    @CurrentUser() user: any,
  ) {
    return this.conversationService.setDisappearing(id, user.id, body.seconds);
  }

  // ─── Group admin (any participant; groups only) ────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a group' })
  @ApiParam(CONVERSATION_ID_PARAM)
  @ApiBody({ type: RenameConversationDto })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid name, or the conversation is a DM' })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  rename(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: RenameConversationDto,
    @CurrentUser() user: any,
  ) {
    return this.conversationService.renameGroup(id, user.id, body.name);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add people to a group' })
  @ApiParam(CONVERSATION_ID_PARAM)
  @ApiBody({ type: AddMembersDto })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error, or the conversation is a DM' })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation or user not found' })
  addMembers(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: AddMembersDto,
    @CurrentUser() user: any,
  ) {
    return this.conversationService.addMembers(id, user.id, body.user_ids);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a group' })
  @ApiParam(CONVERSATION_ID_PARAM)
  @ApiResponse({ status: 201, type: OkResponseDto })
  @ApiResponse({ status: 400, description: 'The conversation is a DM' })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  leave(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.conversationService.leaveGroup(id, user.id);
  }
}
