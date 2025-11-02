import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      // forbidNonWhitelisted: true,

    }),
  );

  

  // API prefix
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Fitlink API')
      .setDescription('Backend API for Fitlink - Fitness Management System')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  
  console.log(`🚀 Fitlink Backend is running on: http://localhost:${port}/${apiPrefix}`);
  if (configService.get('NODE_ENV') !== 'production') {
    console.log(`📚 API Documentation: http://localhost:${port}/${apiPrefix}/docs`);
  }
}

bootstrap();
