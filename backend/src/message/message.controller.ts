import { Controller, Get, Post, Patch, Delete, Query, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { MessageService } from './message.service';
import {
  GetMessagesDto,
  CreateMessageDto,
  MessageResponseDto,
  PaginatedMessagesResponseDto,
  ReactMessageDto,
  EditMessageDto,
  DeleteMessageQueryDto,
  StarMessageDto,
  ForwardMessageDto,
  SearchMessagesDto,
  ScreenshotDto,
  OpenSnapResponseDto,
} from './dto/message.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { OkResponseDto } from '../common/ok.dto';
import { ParseObjectIdPipe } from '../common/object-id.pipe';

const MESSAGE_ID_PARAM = { name: 'id', description: 'MongoDB ObjectId of the message' };

@ApiTags('messages')
@ApiSecurity('basic-auth')
@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // Static sub-paths first so they are never captured by the /message/:id handlers below.

  @Get('starred')
  @ApiOperation({
    summary: 'My starred messages',
    description: 'Newest first, at most 100. Only messages you can still see.',
  })
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  getStarred(@CurrentUser() user: any) {
    return this.messageService.starred(user.id);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search a conversation',
    description:
      'Case-insensitive text search, newest first, at most 50. Hides the same messages GET /message hides, ' +
      'and messages deleted for everyone.',
  })
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  search(@Query() query: SearchMessagesDto, @CurrentUser() user: any) {
    return this.messageService.search(query.conversation_id, query.q, user.id);
  }

  @Post('forward')
  @ApiOperation({
    summary: 'Forward a message',
    description:
      'Copies the text and attachment into up to 5 conversations you are in. The copies are marked forwarded.',
  })
  @ApiBody({ type: ForwardMessageDto })
  @ApiResponse({ status: 201, type: [MessageResponseDto] })
  @ApiResponse({ status: 400, description: "Deleted messages, snaps and system messages can't be forwarded" })
  @ApiResponse({ status: 403, description: 'Not a participant, or you blocked the other person in a DM' })
  @ApiResponse({ status: 404, description: 'Message or conversation not found' })
  forward(@Body() body: ForwardMessageDto, @CurrentUser() user: any) {
    return this.messageService.forward(body, user.id);
  }

  @Post('screenshot')
  @ApiOperation({
    summary: 'Tell the chat you took a screenshot',
    description:
      'Posts a SYSTEM message (systemKind "screenshot") with content "<username> took a screenshot". ' +
      'It expires like any other message when disappearing messages are on.',
  })
  @ApiBody({ type: ScreenshotDto })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  screenshot(@Body() body: ScreenshotDto, @CurrentUser() user: any) {
    return this.messageService.screenshot(body.conversation_id, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated messages',
    description:
      'Fetches messages for a conversation using cursor-based pagination. ' +
      'First call: omit from_message_cursor. ' +
      'Subsequent calls: pass the returned nextCursor to load older messages.',
  })
  @ApiQuery({
    name: 'conversation_id',
    description: 'MongoDB ObjectId of the target conversation',
    example: '64b8f9e2c4a3b12d4e5f0001',
  })
  @ApiQuery({
    name: 'from_message_cursor',
    required: false,
    description: 'ObjectId of the last fetched message. Omit for the first page.',
    example: '64b8f9e2c4a3b12d4e5f1234',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated messages',
    type: PaginatedMessagesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization header' })
  @ApiResponse({ status: 404, description: 'Cursor message not found' })
  getMessages(@Query() query: GetMessagesDto, @CurrentUser() user: any) {
    return this.messageService.getMessages(
      query.conversation_id,
      query.from_message_cursor,
      user.id,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Send a message',
    description:
      'Creates a new message in the specified conversation. ' +
      'The sender is identified from the `Authorization: Basic <username>:<password>` header — ' +
      'no sender_id needed in the body. ' +
      'Delivery/read status is automatically initialized for all participants.',
  })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message created',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization header' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  createMessage(@Body() body: CreateMessageDto, @CurrentUser() user: any) {
    return this.messageService.createMessage(body, user.id);
  }

  @Post(':id/react')
  @ApiOperation({
    summary: 'React to a message',
    description: 'One reaction per person; sending a new emoji replaces yours and "" removes it.',
  })
  @ApiParam(MESSAGE_ID_PARAM)
  @ApiBody({ type: ReactMessageDto })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'This message was deleted' })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  react(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: ReactMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.messageService.react(id, user.id, body.emoji);
  }

  @Post(':id/open')
  @ApiOperation({
    summary: 'Open a snap (view-once photo)',
    description:
      'Returns the photo as a data URL, once per person. Only other participants can open it; ' +
      'the sender cannot. Adds you to openedBy.',
  })
  @ApiParam(MESSAGE_ID_PARAM)
  @ApiResponse({ status: 201, type: OpenSnapResponseDto })
  @ApiResponse({ status: 400, description: 'This message is not a snap, or it was deleted' })
  @ApiResponse({ status: 403, description: "Not a participant, or you can't open your own snap" })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 410, description: 'Snap already opened, or no longer available' })
  openSnap(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.messageService.openSnap(id, user.id);
  }

  @Post(':id/star')
  @ApiOperation({ summary: 'Star or unstar a message (just for you)' })
  @ApiParam(MESSAGE_ID_PARAM)
  @ApiBody({ type: StarMessageDto })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 403, description: 'You are not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  star(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: StarMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.messageService.star(id, user.id, body.starred);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a message',
    description: 'Only the sender, only within 15 minutes of sending, and not after it was deleted.',
  })
  @ApiParam(MESSAGE_ID_PARAM)
  @ApiBody({ type: EditMessageDto })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Messages can only be edited for 15 minutes, or it was deleted' })
  @ApiResponse({ status: 403, description: 'Only the sender can edit this message' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  edit(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: EditMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.messageService.edit(id, user.id, body.content);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a message',
    description:
      '`scope=me` (default) hides it only for you. `scope=everyone` (sender only) replaces it with a ' +
      '"deleted" placeholder for all participants.',
  })
  @ApiParam(MESSAGE_ID_PARAM)
  @ApiQuery({ name: 'scope', required: false, enum: ['me', 'everyone'] })
  @ApiResponse({ status: 200, type: OkResponseDto })
  @ApiResponse({ status: 403, description: 'Not a participant, or not the sender (scope=everyone)' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: DeleteMessageQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.messageService.remove(id, user.id, query.scope ?? 'me');
  }
}
