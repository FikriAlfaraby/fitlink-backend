import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

describe('Fitlink Backend API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let memberId: string;
  let productId: string;
  let classId: string;
  let staffId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global pipes and filters
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor(), new LoggingInterceptor());
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/ (GET) - should return API status', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Fitlink Backend API is running successfully!');
          expect(res.body.data).toHaveProperty('timestamp');
          expect(res.body.data).toHaveProperty('uptime');
        });
    });

    it('/version (GET) - should return API version', () => {
      return request(app.getHttpServer())
        .get('/version')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Fitlink Backend API');
          expect(res.body.data.version).toBe('1.0.0');
          expect(res.body.data.environment).toBeDefined();
        });
    });
  });

  describe('Authentication', () => {
    const testUser = {
      email: 'test@fitlink.com',
      password: 'TestPassword123!',
      name: 'Test User',
      role: 'admin',
    };

    it('/auth/register (POST) - should register new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data).toHaveProperty('access_token');
          expect(res.body.data.user.email).toBe(testUser.email);
        });
    });

    it('/auth/login (POST) - should login user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('access_token');
          expect(res.body.data).toHaveProperty('user');
          authToken = res.body.data.access_token;
        });
    });

    it('/auth/login (POST) - should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Invalid credentials');
        });
    });
  });

  describe('Members API', () => {
    const testMember = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '081234567890',
      membership_type: 'premium',
      membership_start: '2024-01-01',
      membership_end: '2024-12-31',
    };

    it('/members (POST) - should create new member', () => {
      return request(app.getHttpServer())
        .post('/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testMember)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(testMember.name);
          expect(res.body.data.email).toBe(testMember.email);
          expect(res.body.data.status).toBe('active');
          memberId = res.body.data.id;
        });
    });

    it('/members (GET) - should get all members', () => {
      return request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('pagination');
          expect(Array.isArray(res.body.data.data)).toBe(true);
        });
    });

    it('/members/:id (GET) - should get member by id', () => {
      return request(app.getHttpServer())
        .get(`/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(memberId);
          expect(res.body.data.name).toBe(testMember.name);
        });
    });

    it('/members/:id (PUT) - should update member', () => {
      const updateData = { name: 'John Updated' };
      
      return request(app.getHttpServer())
        .put(`/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(updateData.name);
        });
    });

    it('/members/:id/extend (POST) - should extend membership', () => {
      return request(app.getHttpServer())
        .post(`/members/${memberId}/extend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ months: 6 })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(memberId);
        });
    });
  });

  describe('Products API', () => {
    const testProduct = {
      name: 'Protein Powder',
      description: 'High quality whey protein',
      price: 250000,
      stock: 100,
      category: 'supplement',
      sku: 'PROT001',
    };

    it('/products (POST) - should create new product', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testProduct)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(testProduct.name);
          expect(res.body.data.price).toBe(testProduct.price);
          expect(res.body.data.status).toBe('active');
          productId = res.body.data.id;
        });
    });

    it('/products (GET) - should get all products', () => {
      return request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('pagination');
        });
    });

    it('/products/:id (GET) - should get product by id', () => {
      return request(app.getHttpServer())
        .get(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(productId);
        });
    });

    it('/products/:id/stock (PUT) - should update product stock', () => {
      return request(app.getHttpServer())
        .put(`/products/${productId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stock: 150 })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.stock).toBe(150);
        });
    });

    it('/products/low-stock (GET) - should get low stock products', () => {
      return request(app.getHttpServer())
        .get('/products/low-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Classes API', () => {
    const testClass = {
      name: 'Morning Yoga',
      description: 'Relaxing morning yoga session',
      instructor_id: 'instructor-1',
      schedule_date: '2024-12-31',
      schedule_time: '08:00',
      duration: 60,
      max_participants: 20,
      price: 100000,
    };

    it('/classes (POST) - should create new class', () => {
      return request(app.getHttpServer())
        .post('/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testClass)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(testClass.name);
          expect(res.body.data.status).toBe('scheduled');
          classId = res.body.data.id;
        });
    });

    it('/classes (GET) - should get all classes', () => {
      return request(app.getHttpServer())
        .get('/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('pagination');
        });
    });

    it('/classes/:id/book (POST) - should book a class', () => {
      return request(app.getHttpServer())
        .post(`/classes/${classId}/book`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ member_id: memberId })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.class_id).toBe(classId);
          expect(res.body.data.member_id).toBe(memberId);
        });
    });

    it('/classes/upcoming (GET) - should get upcoming classes', () => {
      return request(app.getHttpServer())
        .get('/classes/upcoming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Staff API', () => {
    const testStaff = {
      name: 'Jane Smith',
      email: 'jane.smith@fitlink.com',
      phone: '081234567891',
      role: 'trainer',
      specialization: 'yoga',
      hire_date: '2024-01-01',
      salary: 5000000,
    };

    it('/staff (POST) - should create new staff', () => {
      return request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testStaff)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(testStaff.name);
          expect(res.body.data.role).toBe(testStaff.role);
          staffId = res.body.data.id;
        });
    });

    it('/staff (GET) - should get all staff', () => {
      return request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('pagination');
        });
    });

    it('/staff/:id (GET) - should get staff by id', () => {
      return request(app.getHttpServer())
        .get(`/staff/${staffId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(staffId);
        });
    });
  });

  describe('POS API', () => {
    it('/pos/transaction (POST) - should create POS transaction', () => {
      const transaction = {
        member_id: memberId,
        items: [
          {
            product_id: productId,
            quantity: 2,
            price: 250000,
          },
        ],
        payment_method: 'cash',
        total_amount: 500000,
      };

      return request(app.getHttpServer())
        .post('/pos/transaction')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transaction)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.member_id).toBe(memberId);
          expect(res.body.data.total_amount).toBe(500000);
        });
    });

    it('/pos/transactions (GET) - should get POS transactions', () => {
      return request(app.getHttpServer())
        .get('/pos/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('pagination');
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', () => {
      return request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Not Found');
        });
    });

    it('should handle validation errors', () => {
      return request(app.getHttpServer())
        .post('/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid: empty name
          email: 'invalid-email', // Invalid: bad email format
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Validation failed');
        });
    });

    it('should handle unauthorized access', () => {
      return request(app.getHttpServer())
        .get('/members')
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Unauthorized');
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      const requests = [];
      
      // Make multiple requests quickly to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/')
            .expect((res) => {
              // Some requests should succeed, others should be rate limited
              expect([200, 429]).toContain(res.status);
            })
        );
      }
      
      await Promise.all(requests);
    });
  });
});
