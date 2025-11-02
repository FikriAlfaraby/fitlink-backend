import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { RATE_LIMIT } from './constants/app.constants';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT.GLOBAL.TTL,
        limit: RATE_LIMIT.GLOBAL.LIMIT,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: [ThrottlerModule],
})
export class CommonModule {}
