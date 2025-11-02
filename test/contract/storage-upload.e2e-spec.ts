import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Storage Upload API Contract Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token for testing (this will fail until auth is properly set up)
    const authResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@gym.com',
        password: 'password123'
      });

    authToken = authResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/storage/upload/{type}', () => {
    it('should upload avatar file successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          entityType: 'member',
          entityId: 'test-member-uuid'
        })
        .attach('file', Buffer.from('fake image data'), 'avatar.jpg')
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          fileName: 'avatar.jpg',
          filePath: expect.any(String),
          fileSize: expect.any(Number),
          mimeType: expect.stringMatching(/^image\//),
          publicUrl: expect.any(String),
          bucket: 'avatars',
          uploadedAt: expect.any(String),
        }),
        message: 'File uploaded successfully'
      });
    });

    it('should upload product image successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/products')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          entityType: 'product',
          entityId: 'test-product-uuid'
        })
        .attach('file', Buffer.from('fake product image'), 'product.png')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bucket).toBe('products');
      expect(response.body.data.fileName).toBe('product.png');
    });

    it('should upload document successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake pdf content'), 'contract.pdf')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bucket).toBe('documents');
      expect(response.body.data.fileName).toBe('contract.pdf');
    });

    it('should return 400 for invalid file type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('executable content'), 'malware.exe')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File type not allowed for this bucket'
        }
      });
    });

    it('should return 400 for file too large', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, 'large.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds maximum size limit'
        }
      });
    });

    it('should return 400 for missing file', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'No file provided in request'
        }
      });
    });

    it('should return 400 for invalid bucket type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/invalid-bucket')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), 'test.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_BUCKET_TYPE',
          message: 'Invalid bucket type specified'
        }
      });
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .attach('file', Buffer.from('test'), 'test.jpg')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      // This test assumes a user without proper permissions
      const response = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/documents')
        .set('Authorization', `Bearer invalid-token`)
        .attach('file', Buffer.from('confidential'), 'secret.pdf')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'User does not have permission to upload to this bucket'
        }
      });
    });
  });
});