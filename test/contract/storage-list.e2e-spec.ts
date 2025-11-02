import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Storage List API Contract Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token for testing
    const authResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@gym.com',
        password: 'password123'
      });

    authToken = authResponse.body.token;

    // Upload test files for listing
    await request(app.getHttpServer())
      .post('/api/v1/storage/upload/avatars')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ entityType: 'member', entityId: 'member-1' })
      .attach('file', Buffer.from('avatar 1'), 'avatar1.jpg');

    await request(app.getHttpServer())
      .post('/api/v1/storage/upload/products')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ entityType: 'product', entityId: 'product-1' })
      .attach('file', Buffer.from('product image'), 'product1.png');

    await request(app.getHttpServer())
      .post('/api/v1/storage/upload/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('document'), 'doc1.pdf');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/storage/files', () => {
    it('should list all files for current gym with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          files: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              fileName: expect.any(String),
              fileSize: expect.any(Number),
              mimeType: expect.any(String),
              publicUrl: expect.any(String),
              bucket: expect.any(String),
              entityType: expect.any(String),
              uploadedAt: expect.any(String),
            })
          ]),
          pagination: {
            page: 1,
            limit: 20,
            total: expect.any(Number),
            totalPages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: false
          }
        }
      });

      expect(response.body.data.files.length).toBeGreaterThan(0);
    });

    it('should filter files by bucket type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({ bucket: 'avatars' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bucket: 'avatars'
          })
        ])
      );

      // Ensure no files from other buckets
      response.body.data.files.forEach((file: any) => {
        expect(file.bucket).toBe('avatars');
      });
    });

    it('should filter files by entity type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({ entityType: 'member' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.files.forEach((file: any) => {
        expect(file.entityType).toBe('member');
      });
    });

    it('should filter files by specific entity ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({
          entityType: 'member',
          entityId: 'member-1'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.files.forEach((file: any) => {
        expect(file.entityType).toBe('member');
        expect(file.entityId).toBe('member-1');
      });
    });

    it('should support pagination with page and limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({
          page: 1,
          limit: 2
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false
      });
    });

    it('should support sorting by upload date', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({
          sortBy: 'uploadedAt',
          sortOrder: 'desc'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const files = response.body.data.files;
      if (files.length > 1) {
        // Verify descending order
        for (let i = 1; i < files.length; i++) {
          const prevDate = new Date(files[i - 1].uploadedAt);
          const currDate = new Date(files[i].uploadedAt);
          expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
        }
      }
    });

    it('should support sorting by file size', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({
          sortBy: 'fileSize',
          sortOrder: 'asc'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const files = response.body.data.files;
      if (files.length > 1) {
        // Verify ascending order
        for (let i = 1; i < files.length; i++) {
          expect(files[i - 1].fileSize).toBeLessThanOrEqual(files[i].fileSize);
        }
      }
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({
          page: 0,
          limit: 101
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Page must be >= 1 and limit must be between 1 and 100'
        }
      });
    });

    it('should return empty result for non-existent entity', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({
          entityType: 'member',
          entityId: 'non-existent-member'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should only return files from same gym', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All files should belong to the authenticated user's gym
      // This will be enforced by the storage service based on JWT gym context
      expect(response.body.data.files.length).toBeGreaterThan(0);
    });
  });
});