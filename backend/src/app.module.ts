import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConversationModule } from './conversation/conversation.module';
import { MessageModule } from './message/message.module';
import { BotModule } from './bot/bot.module';
import { FileModule } from './file/file.module';
import { DebugModule } from './debug/debug.module';
import { CapabilitiesModule } from './capabilities/capabilities.module';
import { ProfileModule } from './profile/profile.module';
import { PresenceModule } from './presence/presence.module';
import { ContactsModule } from './contacts/contacts.module';
import { BlocksModule } from './blocks/blocks.module';
import { ChatPrefsModule } from './chat-prefs/chat-prefs.module';
import { StatusModule } from './status/status.module';
import { StreaksModule } from './streaks/streaks.module';

const isBotMode = process.env.BOT_MODE === 'true';
const isDebugLogs = process.env.DEBUG_LOGS === 'true';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    ConversationModule,
    MessageModule,
    FileModule,
    CapabilitiesModule,
    ProfileModule,
    PresenceModule,
    ContactsModule,
    BlocksModule,
    ChatPrefsModule,
    StatusModule,
    StreaksModule,
    // BotModule only loaded when BOT_MODE=true
    ...(isBotMode ? [BotModule] : []),
    // DebugModule (GET /debug/logs for the app's Diagnostics panel) only when DEBUG_LOGS=true
    ...(isDebugLogs ? [DebugModule] : []),
  ],
})
export class AppModule {}
