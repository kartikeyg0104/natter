import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { ParseObjectIdPipe } from '../common/object-id.pipe';
import { BlocksService } from './blocks.service';
import { BlocksResponseDto, CreateBlockDto } from './dto/block.dto';

@ApiTags('blocks')
@ApiSecurity('basic-auth')
@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get()
  @ApiOperation({ summary: 'List the users I blocked' })
  @ApiResponse({ status: 200, type: BlocksResponseDto })
  list(@CurrentUser() user: any) {
    return this.blocksService.list(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Block a user',
    description:
      'Idempotent. You stop seeing their new messages and status updates, and cannot message them in a DM until you unblock.',
  })
  @ApiBody({ type: CreateBlockDto })
  @ApiResponse({ status: 201, type: BlocksResponseDto })
  @ApiResponse({ status: 400, description: 'You cannot block yourself' })
  @ApiResponse({ status: 404, description: 'User not found' })
  block(@CurrentUser() user: any, @Body() body: CreateBlockDto) {
    return this.blocksService.block(user.id, body.user_id);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'userId', description: 'ObjectId of the blocked user' })
  @ApiResponse({ status: 200, type: BlocksResponseDto })
  unblock(@CurrentUser() user: any, @Param('userId', ParseObjectIdPipe) userId: string) {
    return this.blocksService.unblock(user.id, userId);
  }
}
