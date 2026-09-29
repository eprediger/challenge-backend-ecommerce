import { DataSource, type DataSourceOptions } from 'typeorm';
import { loadEnv, type Env } from './env';

/**
 * The database config, discriminated by `type` — the `database`
 * branch of {@link Env}. Narrows on `db.type === 'postgres'` so the
 * postgres fields are required `string`/`number` there, not optionals.
 */
export type DbConfig = Env['database'];

/**
 * Single source of truth for the TypeORM configuration, shared by the
 * app module, the seed script and the migration CLI.
 *
 * @param db - The already-validated DB config; passed explicitly so
 *   nothing here reads `process.env` behind the caller's back.
 * @returns Options for sqlite or postgres, always `synchronize: false`
 *   (the app module is the one caller that overrides it to `true`).
 * @throws When `type` is neither `"sqlite"` nor `"postgres"` —
 *   unreachable for a validated DbConfig; guards untyped JS callers.
 */
export function dataSourceOptions(db: DbConfig): DataSourceOptions {
  const common = {
    entities: [__dirname + '/**/*.orm-entity{.ts,.js}'],
    migrations: [__dirname + '/**/migrations/*{.ts,.js}'],
    synchronize: false,
  };

  if (db.type === 'sqlite') {
    return { ...common, type: 'sqlite', database: db.database };
  }
  if (db.type === 'postgres') {
    return {
      ...common,
      type: 'postgres',
      host: db.host,
      port: db.port,
      username: db.username,
      password: db.password,
      database: db.database,
    };
  }
  throw new Error('DB_TYPE must be "sqlite" or "postgres"');
}

/**
 * Entry point for the TypeORM CLI only — the migration scripts
 * (`typeorm-ts-node-commonjs -d src/data-source.ts`) import this file
 * and pick up this exported instance. The app itself never uses it:
 * `TypeOrmModule.forRootAsync` builds its own DataSource from the same
 * `dataSourceOptions`, so instantiating it in main.ts would mean a
 * second connection. `synchronize` stays off here: the CLI manages
 * schema via migrations.
 */
export const AppDataSource = new DataSource(dataSourceOptions(loadEnv(process.env).database));
