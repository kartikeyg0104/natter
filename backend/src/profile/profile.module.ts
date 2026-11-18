import { Module } from '@nestjs/common';
import { PeopleController, ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  controllers: [ProfileController, PeopleController],
  providers: [ProfileService],
})
export class ProfileModule {}
