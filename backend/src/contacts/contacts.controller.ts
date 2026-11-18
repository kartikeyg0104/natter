import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { OkResponseDto } from '../common/ok.dto';
import { ParseObjectIdPipe } from '../common/object-id.pipe';
import { ContactsService } from './contacts.service';
import {
  ContactResponseDto,
  CreateContactDto,
  LookupContactDto,
  LookupResponseDto,
  UpdateContactDto,
} from './dto/contact.dto';

const CONTACT_ID_PARAM = { name: 'id', description: 'ObjectId of one of your contacts' };

@ApiTags('contacts')
@ApiSecurity('basic-auth')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({
    summary: 'List my contacts',
    description: 'Sorted by name. `userId` is the Natter user who registered that number, or null.',
  })
  @ApiResponse({ status: 200, type: [ContactResponseDto] })
  list(@CurrentUser() user: any) {
    return this.contactsService.list(user.id);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Find the user who registered a phone number' })
  @ApiResponse({ status: 200, type: LookupResponseDto })
  @ApiResponse({ status: 400, description: 'Enter a valid phone number (7 to 15 digits)' })
  lookup(@Query() query: LookupContactDto) {
    return this.contactsService.lookup(query.phone_number);
  }

  @Post()
  @ApiOperation({ summary: 'Save a contact' })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ status: 201, type: ContactResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid name or phone number' })
  @ApiResponse({ status: 409, description: 'Already in your contacts as <name>' })
  create(@CurrentUser() user: any, @Body() body: CreateContactDto) {
    return this.contactsService.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a contact or change their number' })
  @ApiParam(CONTACT_ID_PARAM)
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({ status: 200, type: ContactResponseDto })
  @ApiResponse({ status: 404, description: 'Not one of your contacts' })
  @ApiResponse({ status: 409, description: 'Already in your contacts as <name>' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateContactDto,
  ) {
    return this.contactsService.update(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiParam(CONTACT_ID_PARAM)
  @ApiResponse({ status: 200, type: OkResponseDto })
  @ApiResponse({ status: 404, description: 'Not one of your contacts' })
  remove(@CurrentUser() user: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.contactsService.remove(user.id, id);
  }
}
