import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    created_at: new Date().toISOString(),
  }),
  
  createMockMember: () => ({
    id: 'test-member-id',
    name: 'Test Member',
    email: 'member@example.com',
    phone: '081234567890',
    membership_type: 'premium',
    membership_start: '2024-01-01',
    membership_end: '2024-12-31',
    status: 'active',
    created_at: new Date().toISOString(),
  }),
  
  createMockProduct: () => ({
    id: 'test-product-id',
    name: 'Test Product',
    description: 'Test product description',
    price: 100000,
    stock: 50,
    category: 'supplement',
    sku: 'TEST001',
    status: 'active',
    created_at: new Date().toISOString(),
  }),
  
  createMockClass: () => ({
    id: 'test-class-id',
    name: 'Test Class',
    description: 'Test class description',
    instructor_id: 'test-instructor-id',
    schedule_date: '2024-12-31',
    schedule_time: '10:00',
    duration: 60,
    max_participants: 20,
    current_participants: 0,
    price: 100000,
    status: 'scheduled',
    created_at: new Date().toISOString(),
  }),
  
  createMockStaff: () => ({
    id: 'test-staff-id',
    name: 'Test Staff',
    email: 'staff@example.com',
    phone: '081234567891',
    role: 'trainer',
    specialization: 'yoga',
    hire_date: '2024-01-01',
    salary: 5000000,
    status: 'active',
    created_at: new Date().toISOString(),
  }),
  
  createMockTransaction: () => ({
    id: 'test-transaction-id',
    member_id: 'test-member-id',
    staff_id: 'test-staff-id',
    items: [
      {
        product_id: 'test-product-id',
        quantity: 2,
        price: 100000,
        subtotal: 200000,
      },
    ],
    subtotal: 200000,
    tax: 20000,
    discount: 0,
    total_amount: 220000,
    payment_method: 'cash',
    status: 'completed',
    created_at: new Date().toISOString(),
  }),
};

// Mock Supabase client for all tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
  })),
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});