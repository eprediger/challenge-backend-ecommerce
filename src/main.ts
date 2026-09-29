import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import * as swaggerUi from 'swagger-ui-express';
import { AppModule } from './app.module';
import type { Env } from './env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = app
    .get<ConfigService<Env, true>>(ConfigService)
    .get('app.port', { infer: true });

  // Contract-first: docs/openapi.yaml is the API source of truth,
  // served raw so no yaml parser is needed on the server.
  app.use('/docs/openapi.yaml', (_req: Request, res: Response) =>
    res.sendFile(join(__dirname, '..', 'docs', 'openapi.yaml')),
  );
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: { url: '/docs/openapi.yaml' },
    }),
  );

  await app.listen(port);
  console.log(`App running on http://localhost:${port}`);
}

void bootstrap();
