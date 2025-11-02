import { Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { SeedService } from './seed.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '@/auth/decorators/public.decorator';

@Controller('seeds')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post(':gymId')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  async seedData(@UploadedFile() file: Express.Multer.File, @Param('gymId') gymId: string) {
    return await this.seedService.seed(file, gymId);
  }
}
