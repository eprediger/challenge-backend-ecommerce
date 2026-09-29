import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Env } from './env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = app.get<ConfigService<Env, true>>(ConfigService).get('app.port', { infer: true });

  await app.listen(port);
  console.log(`App running on http://localhost:${port}`);
}

void bootstrap();
