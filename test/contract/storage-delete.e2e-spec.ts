import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Storage Delete API Contract Tests', () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DELETE /api/v1/storage/file/{fileId}', () => {
    it('should delete file successfully', async () => {
      // First upload a file to delete
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test image to delete'), 'delete-test.jpg');

      const fileId = uploadResponse.body.data.id;

      // Delete the file
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'File deleted successfully',
        data: {
          id: fileId,
          deletedAt: expect.any(String)
        }
      });

      // Verify file is no longer accessible
      await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent file', async () => {
      const nonExistentId = 'non-existent-file-id';

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/storage/file/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found or already deleted'
        }
      });
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/storage/file/test-file-id')
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
      // Upload file as one user
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('protected file'), 'protected.jpg');

      const fileId = uploadResponse.body.data.id;

      // Try to delete with different gym token
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer different-gym-token`)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Cannot delete file owned by another user/gym'
        }
      });
    });

    it('should handle malformed file ID', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/storage/file/invalid-uuid-format')
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

    it('should prevent deletion of files referenced by entities', async () => {
      // Upload and associate file with member
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          entityType: 'member',
          entityId: 'active-member-uuid'
        })
        .attach('file', Buffer.from('member avatar'), 'member.jpg');

      const fileId = uploadResponse.body.data.id;

      // This should fail if file is still referenced
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'FILE_IN_USE',
          message: 'Cannot delete file that is currently referenced by other entities'
        }
      });
    });

    it('should support soft delete with cleanup flag', async () => {
      // Upload file
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('document content'), 'doc.pdf');

      const fileId = uploadResponse.body.data.id;

      // Delete with soft delete (default behavior)
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ hard: 'false' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('File deleted successfully');
    });
  });
});