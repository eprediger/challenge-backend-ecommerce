import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const comun = {
  PORT: z.coerce.number().int().min(1).max(65535),
  NODE_ENV: z.string().optional(),
};

/**
 * Declared environment: every variable the app reads, validated in
 * one place. No defaults — config lives in the environment, so a
 * missing variable is a startup error, never a silent fallback.
 * The union makes the requirement exact: sqlite vars required XOR
 * postgres vars required, never both-needing nor neither.
 * The transform renames the flat SCREAMING_SNAKE_CASE inputs into the
 * nested, camelCase config shape consumers see via ConfigService.
 */
const envSchema = z
  .discriminatedUnion('DB_TYPE', [
    z.object({
      ...comun,
      DB_TYPE: z.literal('sqlite'),
      DB_DATABASE: z.string().min(1),
    }),
    z.object({
      ...comun,
      DB_TYPE: z.literal('postgres'),
      DB_DATABASE: z.string().min(1),
      DB_HOST: z.string().min(1),
      DB_PORT: z.coerce.number().int().min(1).max(65535),
      DB_USERNAME: z.string().min(1),
      DB_PASSWORD: z.string().min(1),
    }),
  ])
  .transform((env) => ({
    app: { port: env.PORT, nodeEnv: env.NODE_ENV },
    database:
      env.DB_TYPE === 'postgres'
        ? {
            type: 'postgres' as const,
            database: env.DB_DATABASE,
            host: env.DB_HOST,
            port: env.DB_PORT,
            username: env.DB_USERNAME,
            password: env.DB_PASSWORD,
          }
        : { type: 'sqlite' as const, database: env.DB_DATABASE },
  }));

/**
 * The app's validated config (nested, camelCase):
 * `configService.get('database', { infer: true })` returns the
 * {@link DbConfig} union, which narrows on `database.type` — the
 * postgres fields are then plain `string`/`number`, not optionals.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parses, validates and reshapes a raw environment map.
 *
 * @param source - Raw environment — `process.env`, the merged map
 *   `ConfigModule` hands to its `validate` hook, or a spec literal.
 * @returns The validated {@link Env}.
 * @throws `Error` listing every missing or invalid variable; runs at
 *   startup, so a bad environment fails fast instead of surfacing later.
 */
export function loadEnv(source: Record<string, unknown>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${detail}`);
  }
  return result.data;
}
