import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from '@prisma/client';

export type Role = UserType | 'any';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => {
      if (role === 'any') return true;
      return user.userType === role;
    });

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    // Additional gym-specific checks
    // const gymId = request.params?.gymId || request.body?.gymId;
    // if (gymId && user.userType !== 'super_admin') {
    //   // Check if user belongs to the gym
    //   const userGymId = user.gymId;
    //   if (userGymId !== gymId) {
    //     throw new ForbiddenException('Access denied to this gym');
    //   }
    // }

    return true;
  }
}