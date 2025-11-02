import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, body, query, params } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip;

    const now = Date.now();

    // Log incoming request
    this.logger.log(
      `Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
    );

    // Log request details in development
    if (process.env.NODE_ENV === 'development') {
      if (Object.keys(body).length > 0) {
        this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
      }
      if (Object.keys(query).length > 0) {
        this.logger.debug(`Query Params: ${JSON.stringify(query)}`);
      }
      if (Object.keys(params).length > 0) {
        this.logger.debug(`Route Params: ${JSON.stringify(params)}`);
      }
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${response.statusCode} - ${duration}ms`,
          );

          // Log response data in development (but limit size)
          if (process.env.NODE_ENV === 'development' && data) {
            const responseStr = JSON.stringify(data);
            if (responseStr.length < 1000) {
              this.logger.debug(`Response Data: ${responseStr}`);
            } else {
              this.logger.debug(
                `Response Data: [Large response - ${responseStr.length} characters]`,
              );
            }
          }
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `Request Error: ${method} ${url} - ${error.status || 500} - ${duration}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}