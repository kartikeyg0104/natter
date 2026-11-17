import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LAST_SEEN_WRITE_INTERVAL_MS } from '../common/presence.util';

/**
 * Parses the Authorization header in the form:
 *   Authorization: Basic <USERNAME>:<PASSWORD>
 *
 * USERNAME → unique identifier (stored as user.name)
 * PASSWORD → stored as user.phone
 *
 * If no matching user exists with that username, one is created automatically.
 * If user exists, password must match.
 * The resolved user is attached to request.user for downstream use.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger('Auth');

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header. Expected: Basic <username>:<password>',
      );
    }

    // Strip "Basic " prefix
    const credentials = authHeader.slice(6).trim();
    const colonIndex = credentials.indexOf(':');

    if (colonIndex === -1) {
      throw new UnauthorizedException(
        'Invalid Basic auth format. Expected: Basic <username>:<password>',
      );
    }

    const username = credentials.substring(0, colonIndex).trim();
    const password = credentials.substring(colonIndex + 1).trim();

    if (!username || !password) {
      throw new UnauthorizedException('Username and password must not be empty');
    }

    // Find by username (name is the unique user identifier).
    // If not found, create the user automatically.
    let user = await this.prisma.user.findUnique({
      where: { name: username },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: username,
          phone: password,
          conversationIds: [],
        },
      });
      this.logger.log(`New user "${username}" signed up (first request with this username)`);
    } else {
      // If user already exists, verify password
      if (user.phone && user.phone !== password) {
        throw new UnauthorizedException(`Invalid password for user '${username}'`);
      }
    }

    this.touchLastSeen(user.id, user.lastSeenAt);

    // Attach to request for downstream access via @CurrentUser()
    request.user = user;
    return true;
  }

  /** Presence: records the request time at most every 10 s. Fire-and-forget; never fails the request. */
  private touchLastSeen(userId: string, lastSeenAt: Date | null | undefined) {
    const now = new Date();
    if (lastSeenAt && now.getTime() - lastSeenAt.getTime() <= LAST_SEEN_WRITE_INTERVAL_MS) return;
    this.prisma.user
      .update({ where: { id: userId }, data: { lastSeenAt: now } })
      .catch((err) => this.logger.warn(`Could not update lastSeenAt for ${userId}: ${err?.message ?? err}`));
  }
}
