import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // uploads 디렉토리 생성
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }

  const config = new DocumentBuilder()
    .setTitle('MotionLabs API')
    .setDescription('MotionLabs API 문서')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
