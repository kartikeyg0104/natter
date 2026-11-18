import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { PersonResponseDto, ProfileResponseDto, UpdateProfileDto } from './dto/profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiSecurity('basic-auth')
@Controller('me')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get my profile', description: 'Your name, phone number, about text and avatar.' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  getMe(@CurrentUser() user: any) {
    return this.profileService.getMe(user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update my profile',
    description:
      'Every field is optional. `phone_number: ""` removes the number and `avatar_file_id: null` removes the avatar. ' +
      'The avatar must be an IMAGE you uploaded with POST /file. `avatar_preset` ("<style>:<seed>") sets an ' +
      'illustrated avatar instead; setting one clears the other.',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid phone number, about too long, avatar not your image, or "Unknown avatar"' })
  @ApiResponse({ status: 409, description: 'This number is already used by another account' })
  updateMe(@CurrentUser() user: any, @Body() body: UpdateProfileDto) {
    return this.profileService.updateMe(user.id, body);
  }
}

@ApiTags('people')
@ApiSecurity('basic-auth')
@Controller('people')
export class PeopleController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'List everyone',
    description: 'Every user with their about text, avatar and presence, sorted by name. Phone numbers are never included.',
  })
  @ApiResponse({ status: 200, type: [PersonResponseDto] })
  listPeople() {
    return this.profileService.listPeople();
  }
}
