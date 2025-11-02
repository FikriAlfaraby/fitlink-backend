import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is running successfully' })
  getHealthEndpoint(): { message: string; timestamp: string; version: string } {
    return this.appService.getHealth();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get API version' })
  @ApiResponse({ status: 200, description: 'Returns API version information' })
  getVersion(): { version: string; name: string } {
    return this.appService.getVersion();
  }
}
