// API Response Messages
export const API_MESSAGES = {
  SUCCESS: {
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    RETRIEVED: 'Resource retrieved successfully',
    OPERATION_COMPLETED: 'Operation completed successfully',
  },
  ERROR: {
    INTERNAL_SERVER: 'Internal server error occurred',
    VALIDATION_FAILED: 'Validation failed',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    CONFLICT: 'Resource conflict',
    BAD_REQUEST: 'Bad request',
    TOO_MANY_REQUESTS: 'Too many requests',
  },
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTER_SUCCESS: 'Registration successful',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_CREDENTIALS: 'Invalid credentials',
    ACCOUNT_LOCKED: 'Account is locked',
    EMAIL_NOT_VERIFIED: 'Email not verified',
  },
  MEMBER: {
    CREATED: 'Member created successfully',
    UPDATED: 'Member updated successfully',
    DELETED: 'Member deleted successfully',
    NOT_FOUND: 'Member not found',
    ALREADY_EXISTS: 'Member already exists',
    MEMBERSHIP_EXPIRED: 'Membership has expired',
    MEMBERSHIP_SUSPENDED: 'Membership is suspended',
  },
  PAYMENT: {
    PROCESSED: 'Payment processed successfully',
    FAILED: 'Payment processing failed',
    REFUNDED: 'Payment refunded successfully',
    CANCELLED: 'Payment cancelled',
    PENDING: 'Payment is pending',
    INSUFFICIENT_FUNDS: 'Insufficient funds',
  },
  WALLET: {
    BALANCE_UPDATED: 'Wallet balance updated',
    TRANSACTION_CREATED: 'Transaction created successfully',
    WITHDRAWAL_PROCESSED: 'Withdrawal processed successfully',
    INSUFFICIENT_BALANCE: 'Insufficient wallet balance',
    DAILY_LIMIT_EXCEEDED: 'Daily withdrawal limit exceeded',
    WITHDRAWAL_DISABLED: 'Withdrawals are currently disabled',
  },
  CLASS: {
    BOOKED: 'Class booked successfully',
    CANCELLED: 'Class booking cancelled',
    CHECKED_IN: 'Checked in to class successfully',
    CLASS_FULL: 'Class is fully booked',
    BOOKING_DEADLINE_PASSED: 'Booking deadline has passed',
    ALREADY_BOOKED: 'Already booked for this class',
  },
  STAFF: {
    CREATED: 'Staff member created successfully',
    UPDATED: 'Staff member updated successfully',
    DELETED: 'Staff member deleted successfully',
    NOT_FOUND: 'Staff member not found',
    SCHEDULE_UPDATED: 'Staff schedule updated successfully',
    ATTENDANCE_RECORDED: 'Attendance recorded successfully',
  },
};

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
};

// Date/Time Constants
export const DATE_TIME = {
  TIMEZONE: 'Asia/Jakarta',
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  TIME_FORMAT: 'HH:mm:ss',
};

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  UPLOAD_PATH: 'uploads',
  PROFILE_IMAGES_PATH: 'uploads/profiles',
  DOCUMENTS_PATH: 'uploads/documents',
};

// Validation Constants
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: false,
  },
  PHONE: {
    INDONESIA_PATTERN: /^(\+62|62|0)8[1-9][0-9]{6,9}$/,
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z\s]+$/,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
};

// Business Logic Constants
export const BUSINESS = {
  MEMBERSHIP: {
    DEFAULT_DURATION_MONTHS: 1,
    MAX_DURATION_MONTHS: 12,
    GRACE_PERIOD_DAYS: 7,
    RENEWAL_REMINDER_DAYS: 7,
  },
  CLASS: {
    MAX_CAPACITY: 50,
    DEFAULT_CAPACITY: 20,
    BOOKING_DEADLINE_HOURS: 2,
    CANCELLATION_DEADLINE_HOURS: 4,
  },
  WALLET: {
    MIN_WITHDRAWAL: 10000, // IDR
    MAX_DAILY_WITHDRAWAL: 5000000, // IDR
    DEFAULT_QRIS_FEE_PERCENTAGE: 0.7,
    SETTLEMENT_DELAY_HOURS: 24,
  },
  STAFF: {
    MAX_WORKING_HOURS_PER_DAY: 12,
    OVERTIME_THRESHOLD_HOURS: 8,
    MAX_LEAVE_DAYS_PER_YEAR: 12,
  },
};

// Cache Constants
export const CACHE = {
  TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
  },
  KEYS: {
    USER_PROFILE: 'user:profile:',
    MEMBER_DETAILS: 'member:details:',
    CLASS_SCHEDULE: 'class:schedule:',
    WALLET_BALANCE: 'wallet:balance:',
    STAFF_SCHEDULE: 'staff:schedule:',
  },
};

// Rate Limiting Constants
export const RATE_LIMIT = {
  GLOBAL: {
    TTL: 60000, // 1 minute
    LIMIT: 100,
  },
  AUTH: {
    TTL: 900000, // 15 minutes
    LIMIT: 5,
  },
  PAYMENT: {
    TTL: 60000, // 1 minute
    LIMIT: 10,
  },
  UPLOAD: {
    TTL: 60000, // 1 minute
    LIMIT: 5,
  },
};

// QR Code Constants
export const QR_CODE = {
  SIZE: 200,
  ERROR_CORRECTION_LEVEL: 'M',
  MARGIN: 4,
  COLOR: {
    DARK: '#000000',
    LIGHT: '#FFFFFF',
  },
  EXPIRY_HOURS: 24,
};

// Notification Constants
export const NOTIFICATION = {
  TYPES: {
    MEMBERSHIP_EXPIRY: 'membership_expiry',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    CLASS_REMINDER: 'class_reminder',
    CLASS_CANCELLED: 'class_cancelled',
    WALLET_LOW_BALANCE: 'wallet_low_balance',
    STAFF_SCHEDULE_CHANGE: 'staff_schedule_change',
  },
  CHANNELS: {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    IN_APP: 'in_app',
  },
};

// Security Constants
export const SECURITY = {
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    ALGORITHM: 'HS256',
  },
  BCRYPT: {
    SALT_ROUNDS: 12,
  },
  SESSION: {
    MAX_CONCURRENT_SESSIONS: 3,
    IDLE_TIMEOUT_MINUTES: 30,
  },
};

// TODO: harusnya di kasih setting
// sementara di hardcode
// Default 5k tiap transaksi
export const FEE_APP_EACH_TRANSACTION = 5 * 1000