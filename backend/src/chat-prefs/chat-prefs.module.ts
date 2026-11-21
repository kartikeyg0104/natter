import { Module } from '@nestjs/common';
import { ChatPrefsController } from './chat-prefs.controller';
import { ChatPrefsService } from './chat-prefs.service';

@Module({
  controllers: [ChatPrefsController],
  providers: [ChatPrefsService],
})
export class ChatPrefsModule {}
