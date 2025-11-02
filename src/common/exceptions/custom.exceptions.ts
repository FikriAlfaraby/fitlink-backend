import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception for business logic violations
 */
export class BusinessLogicException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        statusCode,
        message,
        error: 'Business Logic Error',
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

/**
 * Exception for resource conflicts
 */
export class ResourceConflictException extends HttpException {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' already exists`
      : `${resource} already exists`;

    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Resource Conflict',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception for resource not found
 */
export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message,
        error: 'Resource Not Found',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception for invalid operations
 */
export class InvalidOperationException extends HttpException {
  constructor(operation: string, reason?: string) {
    const message = reason
      ? `Cannot perform operation '${operation}': ${reason}`
      : `Invalid operation: ${operation}`;

    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Invalid Operation',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception for insufficient permissions
 */
export class InsufficientPermissionsException extends HttpException {
  constructor(action: string, resource?: string) {
    const message = resource
      ? `Insufficient permissions to ${action} ${resource}`
      : `Insufficient permissions to ${action}`;

    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Insufficient Permissions',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Exception for expired resources
 */
export class ResourceExpiredException extends HttpException {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' has expired`
      : `${resource} has expired`;

    super(
      {
        statusCode: HttpStatus.GONE,
        message,
        error: 'Resource Expired',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.GONE,
    );
  }
}

/**
 * Exception for rate limiting
 */
export class RateLimitExceededException extends HttpException {
  constructor(limit: number, windowMs: number) {
    const windowMinutes = Math.ceil(windowMs / 60000);
    const message = `Rate limit exceeded. Maximum ${limit} requests per ${windowMinutes} minute(s)`;

    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        error: 'Rate Limit Exceeded',
        timestamp: new Date().toISOString(),
        retryAfter: windowMs,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Exception for external service errors
 */
export class ExternalServiceException extends HttpException {
  constructor(service: string, operation: string, originalError?: string) {
    const message = originalError
      ? `External service '${service}' failed during '${operation}': ${originalError}`
      : `External service '${service}' failed during '${operation}'`;

    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message,
        error: 'External Service Error',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

/**
 * Exception for membership-related errors
 */
export class MembershipException extends BusinessLogicException {
  constructor(message: string) {
    super(`Membership Error: ${message}`);
  }
}

/**
 * Exception for payment-related errors
 */
export class PaymentException extends BusinessLogicException {
  constructor(message: string) {
    super(`Payment Error: ${message}`);
  }
}

/**
 * Exception for wallet-related errors
 */
export class WalletException extends BusinessLogicException {
  constructor(message: string) {
    super(`Wallet Error: ${message}`);
  }
}

/**
 * Exception for QR code-related errors
 */
export class QRCodeException extends BusinessLogicException {
  constructor(message: string) {
    super(`QR Code Error: ${message}`);
  }
}