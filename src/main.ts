import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // uploads 디렉토리 생성
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
