import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { OkResponseDto } from '../common/ok.dto';
import { ParseObjectIdPipe } from '../common/object-id.pipe';
import { CreateStatusDto, StatusFeedDto, StatusItemDto, StatusViewerDto } from './dto/status.dto';
import { StatusService } from './status.service';

const STATUS_ID_PARAM = { name: 'id', description: 'ObjectId of the status update' };

@ApiTags('status')
@ApiSecurity('basic-auth')
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post()
  @ApiOperation({
    summary: 'Post a status update',
    description: 'Text (with an optional #RRGGBB background) or an image you uploaded. Disappears after 24 hours.',
  })
  @ApiBody({ type: CreateStatusDto })
  @ApiResponse({ status: 201, type: StatusItemDto })
  @ApiResponse({ status: 400, description: 'Needs text or file_id; file must be your image' })
  create(@CurrentUser() user: any, @Body() body: CreateStatusDto) {
    return this.statusService.create(user.id, body);
  }

  @Get()
  @ApiOperation({
    summary: 'Status feed',
    description:
      'Your own updates plus those of people you share a conversation with or saved as contacts, ' +
      'excluding people you blocked.',
  })
  @ApiResponse({ status: 200, type: StatusFeedDto })
  feed(@CurrentUser() user: any) {
    return this.statusService.feed(user.id);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark a status update as viewed' })
  @ApiParam(STATUS_ID_PARAM)
  @ApiResponse({ status: 201, type: OkResponseDto })
  @ApiResponse({ status: 404, description: 'Status not found or expired' })
  view(@CurrentUser() user: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.statusService.view(user.id, id);
  }

  @Get(':id/viewers')
  @ApiOperation({ summary: 'Who viewed my status update' })
  @ApiParam(STATUS_ID_PARAM)
  @ApiResponse({ status: 200, type: [StatusViewerDto] })
  @ApiResponse({ status: 403, description: 'Only the owner can do this' })
  @ApiResponse({ status: 404, description: 'Status not found' })
  viewers(@CurrentUser() user: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.statusService.viewers(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete my status update' })
  @ApiParam(STATUS_ID_PARAM)
  @ApiResponse({ status: 200, type: OkResponseDto })
  @ApiResponse({ status: 403, description: 'Only the owner can do this' })
  @ApiResponse({ status: 404, description: 'Status not found' })
  remove(@CurrentUser() user: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.statusService.remove(user.id, id);
  }
}
