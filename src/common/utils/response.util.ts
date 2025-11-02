import { HttpStatus } from '@nestjs/common';

export interface ApiSuccessResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class ResponseUtil {
  /**
   * Create a success response
   */
  static success<T>(
    data: T,
    message: string = 'Operation successful',
    statusCode: number = HttpStatus.OK,
  ): ApiSuccessResponse<T> {
    return {
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Data retrieved successfully',
  ): ApiSuccessResponse<PaginatedResponse<T>> {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      statusCode: HttpStatus.OK,
      message,
      data: {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an error response
   */
  static error(
    message: string | string[],
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    error: string = 'Internal Server Error',
  ): ApiErrorResponse {
    return {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a validation error response
   */
  static validationError(
    errors: string[],
    message: string = 'Validation failed',
  ): ApiErrorResponse {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: errors,
      error: 'Bad Request',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a not found error response
   */
  static notFound(
    resource: string = 'Resource',
    id?: string | number,
  ): ApiErrorResponse {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;

    return {
      statusCode: HttpStatus.NOT_FOUND,
      message,
      error: 'Not Found',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(
    message: string = 'Unauthorized access',
  ): ApiErrorResponse {
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      message,
      error: 'Unauthorized',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a forbidden error response
   */
  static forbidden(
    message: string = 'Access forbidden',
  ): ApiErrorResponse {
    return {
      statusCode: HttpStatus.FORBIDDEN,
      message,
      error: 'Forbidden',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a conflict error response
   */
  static conflict(
    message: string = 'Resource already exists',
  ): ApiErrorResponse {
    return {
      statusCode: HttpStatus.CONFLICT,
      message,
      error: 'Conflict',
      timestamp: new Date().toISOString(),
    };
  }
}