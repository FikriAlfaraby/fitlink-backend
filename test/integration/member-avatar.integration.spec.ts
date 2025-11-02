import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Member Profile Image Upload Integration', () => {
  let app: INestApplication;
  let staffToken: string;
  let gymOwnerToken: string;
  let memberToken: string;
  let memberId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate as gym staff
    const staffAuth = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@testgym.com',
        password: 'password123'
      });
    staffToken = staffAuth.body.token;

    // Authenticate as gym owner
    const ownerAuth = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@testgym.com',
        password: 'password123'
      });
    gymOwnerToken = ownerAuth.body.token;

    // Authenticate as member
    const memberAuth = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'member@testgym.com',
        password: 'password123'
      });
    memberToken = memberAuth.body.token;

    // Get member ID for testing
    const memberResponse = await request(app.getHttpServer())
      .get('/api/v1/members/profile')
      .set('Authorization', `Bearer ${memberToken}`);
    memberId = memberResponse.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Member Profile Image Upload Workflow', () => {
    it('should complete full member profile image upload workflow', async () => {
      // Step 1: Gym staff uploads profile image for member
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .attach('file', Buffer.from('member avatar image data'), 'member-avatar.jpg')
        .expect(201);

      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.data.bucket).toBe('avatars');
      expect(uploadResponse.body.data.fileName).toBe('member-avatar.jpg');

      const fileId = uploadResponse.body.data.id;
      const publicUrl = uploadResponse.body.data.publicUrl;

      // Step 2: Verify file is accessible via storage API
      const fileResponse = await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(fileResponse.body.success).toBe(true);
      expect(fileResponse.body.data.entityType).toBe('member');
      expect(fileResponse.body.data.entityId).toBe(memberId);

      // Step 3: Update member profile with image URL
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          profileImageUrl: publicUrl,
          profileImagePath: fileResponse.body.data.filePath
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Step 4: Verify member profile shows updated image
      const memberProfileResponse = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(memberProfileResponse.body.data.profileImageUrl).toBe(publicUrl);
      expect(memberProfileResponse.body.data.profileImagePath).toBeDefined();

      // Step 5: Verify image is displayed in member profile view
      expect(memberProfileResponse.body.data.profileImageUrl).toMatch(/^https?:\/\//);

      // Step 6: Verify member can see their own profile image
      const memberSelfView = await request(app.getHttpServer())
        .get('/api/v1/members/profile')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(memberSelfView.body.data.profileImageUrl).toBe(publicUrl);

      // Step 7: Verify file metadata correctly stored
      expect(fileResponse.body.data).toMatchObject({
        entityType: 'member',
        entityId: memberId,
        bucket: 'avatars',
        mimeType: expect.stringMatching(/^image\//),
        isActive: true
      });
    });

    it('should handle profile image replacement workflow', async () => {
      // Upload first image
      const firstUpload = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .attach('file', Buffer.from('first avatar'), 'avatar1.jpg');

      const firstFileId = firstUpload.body.data.id;
      const firstUrl = firstUpload.body.data.publicUrl;

      // Update member with first image
      await request(app.getHttpServer())
        .patch(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ profileImageUrl: firstUrl });

      // Upload replacement image
      const secondUpload = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .attach('file', Buffer.from('second avatar'), 'avatar2.jpg');

      const secondUrl = secondUpload.body.data.publicUrl;

      // Update member with new image
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ profileImageUrl: secondUrl });

      expect(updateResponse.body.success).toBe(true);

      // Verify member shows new image
      const memberResponse = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(memberResponse.body.data.profileImageUrl).toBe(secondUrl);

      // Old file should be marked for cleanup but still accessible
      const oldFileResponse = await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${firstFileId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(oldFileResponse.status).toBe(200);
    });

    it('should enforce proper access controls for member images', async () => {
      // Upload image as staff
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .attach('file', Buffer.from('secure avatar'), 'secure.jpg');

      const fileId = uploadResponse.body.data.id;

      // Staff should be able to access
      await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      // Gym owner should be able to access
      await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${gymOwnerToken}`)
        .expect(200);

      // Same member should be able to access
      await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // Different gym user should NOT be able to access
      await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer different-gym-token`)
        .expect(403);
    });

    it('should handle image validation and size limits', async () => {
      // Test valid image upload
      const validUpload = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .attach('file', Buffer.from('valid jpeg data'), 'valid.jpg')
        .expect(201);

      expect(validUpload.body.success).toBe(true);

      // Test invalid file type
      await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .attach('file', Buffer.from('executable'), 'virus.exe')
        .expect(400);

      // Test file too large (over 5MB for avatars)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .attach('file', largeBuffer, 'large.jpg')
        .expect(400);
    });

    it('should track file associations and cleanup orphaned files', async () => {
      // Upload image
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/storage/upload/avatars')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .attach('file', Buffer.from('trackable avatar'), 'trackable.jpg');

      const fileId = uploadResponse.body.data.id;

      // Associate with member
      await request(app.getHttpServer())
        .patch(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          profileImageUrl: uploadResponse.body.data.publicUrl
        });

      // List files for member
      const filesResponse = await request(app.getHttpServer())
        .get('/api/v1/storage/files')
        .query({
          entityType: 'member',
          entityId: memberId
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(filesResponse.body.data.files).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: fileId,
            entityType: 'member',
            entityId: memberId
          })
        ])
      );

      // Remove association
      await request(app.getHttpServer())
        .patch(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          profileImageUrl: null
        });

      // File should still exist but marked as orphaned
      const orphanedFileResponse = await request(app.getHttpServer())
        .get(`/api/v1/storage/file/${fileId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(orphanedFileResponse.status).toBe(200);
    });
  });
});