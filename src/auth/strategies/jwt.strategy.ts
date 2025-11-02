import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';

export interface JwtPayload {
  sub: string; // user id
  email?: string;
  phone?: string;
  userType: string;
  gymId?: string[];
  sessionId?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: userId, sessionId } = payload;

    // Verify user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: {
          include: {
            gym: true,
          },
        },
        staff: {
          include: {
            gym: true,
          },
        },
        ownedGyms: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify session if sessionId is provided
    if (sessionId) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Update last activity
      await this.prisma.userSession.update({
        where: { id: sessionId },
        data: { lastActivity: new Date() },
      });
    }

    // Return user data for request context
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      userType: user.userType,
      status: user.status,
      gymId: user.member?.map(v => v.gymId) || user.staff?.gymId || user.ownedGyms?.[0]?.id,
      member: user.member,
      staff: user.staff,
      ownedGyms: user.ownedGyms,
      sessionId,
    };
  }
}