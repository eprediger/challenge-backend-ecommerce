import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const rawPort = process.env.PORT;
  const port = rawPort !== undefined ? Number(rawPort) : 3000;

  if (Number.isNaN(port)) {
    throw new Error('PORT must be a valid number');
  }

  await app.listen(port);
  console.log(`App running on http://localhost:${port}`);
}

void bootstrap();
