import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUser {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  userType: string;
  status: string;
  gymId?: string[];
  member?: any;
  staff?: any;
  ownedGyms?: any[];
  sessionId?: string;
}

export const GetCurrentUser = createParamDecorator(
  (data: keyof CurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    return data ? user?.[data] : user;
  },
);