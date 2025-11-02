export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult {
  offset: number;
  limit: number;
  page: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class PaginationUtil {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly MAX_LIMIT = 100;
  private static readonly DEFAULT_SORT_BY = 'created_at';
  private static readonly DEFAULT_SORT_ORDER = 'desc';

  /**
   * Parse and validate pagination options
   */
  static parsePaginationOptions(options: PaginationOptions): PaginationResult {
    const page = Math.max(1, options.page || this.DEFAULT_PAGE);
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, options.limit || this.DEFAULT_LIMIT),
    );
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || this.DEFAULT_SORT_BY;
    const sortOrder = options.sortOrder || this.DEFAULT_SORT_ORDER;

    return {
      offset,
      limit,
      page,
      sortBy,
      sortOrder,
    };
  }

  /**
   * Calculate pagination metadata
   */
  static calculateMeta(total: number, page: number, limit: number): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }

  /**
   * Build Supabase query with pagination
   */
  static buildSupabaseQuery(
    query: any,
    paginationOptions: PaginationOptions,
    allowedSortFields: string[] = ['created_at', 'updated_at'],
  ) {
    const { offset, limit, sortBy, sortOrder } = this.parsePaginationOptions(paginationOptions);

    // Validate sort field
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    return query
      .range(offset, offset + limit - 1)
      .order(validSortBy, { ascending: sortOrder === 'asc' });
  }

  /**
   * Build search query for text fields
   */
  static buildSearchQuery(
    query: any,
    searchTerm: string,
    searchFields: string[],
  ) {
    if (!searchTerm || searchFields.length === 0) {
      return query;
    }

    // Build OR condition for multiple fields
    const searchConditions = searchFields
      .map(field => `${field}.ilike.%${searchTerm}%`)
      .join(',');

    return query.or(searchConditions);
  }

  /**
   * Build date range query
   */
  static buildDateRangeQuery(
    query: any,
    dateField: string,
    startDate?: string,
    endDate?: string,
  ) {
    if (startDate) {
      query = query.gte(dateField, startDate);
    }
    if (endDate) {
      query = query.lte(dateField, endDate);
    }
    return query;
  }

  /**
   * Build filter query for enum fields
   */
  static buildEnumFilterQuery(
    query: any,
    field: string,
    value: string | string[],
  ) {
    if (!value) return query;

    if (Array.isArray(value)) {
      return query.in(field, value);
    } else {
      return query.eq(field, value);
    }
  }

  /**
   * Build numeric range query
   */
  static buildNumericRangeQuery(
    query: any,
    field: string,
    min?: number,
    max?: number,
  ) {
    if (min !== undefined) {
      query = query.gte(field, min);
    }
    if (max !== undefined) {
      query = query.lte(field, max);
    }
    return query;
  }
}