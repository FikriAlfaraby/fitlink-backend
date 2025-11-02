import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Storage Get API Contract Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let uploadedFileId: string;

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

    // Upload a file for testing retrieval
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/storage/upload/avatars')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('test image'), 'test.jpg');

    uploadedFileId = uploadResponse.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/storage/file/{fileId}', () => {
    it('should retrieve file metadata and URL successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: uploadedFileId,
          fileName: expect.any(String),
          filePath: expect.any(String),
          fileSize: expect.any(Number),
          mimeType: expect.any(String),
          publicUrl: expect.any(String),
          bucket: expect.any(String),
          entityType: expect.any(String),
          entityId: expect.any(String),
          uploadedAt: expect.any(String),
        })
      });

      // Verify URL is accessible
      expect(response.body.data.publicUrl).toMatch(/^https?:\/\//);
    });

    it('should return 404 for non-existent file', async () => {
      const nonExistentId = 'non-existent-file-id';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found or has been deleted'
        }
      });
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${uploadedFileId}`)
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
      // Test with a different gym's user token
      const response = await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${uploadedFileId}`)
        .set('Authorization', `Bearer different-gym-token`)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'User does not have permission to access this file'
        }
      });
    });

    it('should handle malformed file ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/storage/file/invalid-uuid-format')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_FILE_ID',
          message: 'File ID must be a valid UUID'
        }
      });
    });

    it('should return appropriate response for private documents', async () => {
      // Upload a private document first
      const docResponse = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('private content'), 'private.pdf');

      const documentFileId = docResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${documentFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bucket).toBe('documents');
      // Private files should have signed URLs
      expect(response.body.data.publicUrl).toContain('token=');
    });
  });
});