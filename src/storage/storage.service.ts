import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createSupabaseStorage } from './storage.client';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly storage = createSupabaseStorage();
  private readonly bucket = process.env.SUPABASE_BUCKET || 'fitlink-bucket';

  async uploadFile(type: string, file: Express.Multer.File, ownerId?: string) {
    const key = `${type}/${ownerId || 'anonymous'}/${randomUUID()}-${file.originalname}`;

    const isBucketExist = await this.storage.getBucket(this.bucket);
    if (!isBucketExist.data) {
      await this.storage.createBucket(this.bucket, {
        public: true,
      });
    }
    const { data, error } = await this.storage.from(this.bucket).upload(key, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw new InternalServerErrorException(error.message);

    const { data: publicData } = this.storage.from(this.bucket).getPublicUrl(key);

    return {
      id: randomUUID(), // will map to Prisma entity later
      key,
      bucket: this.bucket,
      url: publicData.publicUrl,
      size: file.size,
      mimeType: file.mimetype,
      ownerId,
    };
  }

  async downloadFile(path: string) {
    const { data, error } = await this.storage.from(this.bucket).download(path);
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async listFiles(prefix = '') {
    const { data, error } = await this.storage.from(this.bucket).list(prefix);
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async deleteFile(path: string) {
    const { error } = await this.storage.from(this.bucket).remove([path]);
    if (error) throw new InternalServerErrorException(error.message);
    return true;
  }

  async createSignedUrl(path: string, expiresIn = 60) {
    const { data, error } = await this.storage.from(this.bucket).createSignedUrl(path, expiresIn);
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }
}
