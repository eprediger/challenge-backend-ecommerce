import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { loadEnv } from './env';

describe('loadEnv', () => {
  it('exige DB_TYPE', () => {
    assert.throws(() => loadEnv({}), /DB_TYPE/);
  });

  it('rechaza un DB_TYPE desconocido', () => {
    assert.throws(
      () => loadEnv({ DB_TYPE: 'mysql' }),
      /DB_TYPE|sqlite|postgres/,
    );
  });

  it('exige PORT y DB_DATABASE para sqlite', () => {
    assert.throws(
      () => loadEnv({ DB_TYPE: 'sqlite' }),
      /PORT[\s\S]*DB_DATABASE/,
    );
  });

  it('rechaza PORT fuera del rango 1-65535', () => {
    assert.throws(
      () =>
        loadEnv({ PORT: '65536', DB_TYPE: 'sqlite', DB_DATABASE: 'x.sqlite' }),
      /PORT/,
    );
  });

  it('acepta un env sqlite completo y lo devuelve anidado', () => {
    const env = loadEnv({
      PORT: '3000',
      DB_TYPE: 'sqlite',
      DB_DATABASE: 'database.sqlite',
    });
    assert.equal(env.app.port, 3000);
    if (env.database.type !== 'sqlite') {
      assert.fail('esperaba la variante sqlite');
    }
    assert.equal(env.database.database, 'database.sqlite');
  });

  it('exige las credenciales de postgres', () => {
    assert.throws(
      () =>
        loadEnv({
          PORT: '3000',
          DB_TYPE: 'postgres',
          DB_DATABASE: 'ecommerce_challenge',
        }),
      /DB_HOST[\s\S]*DB_PORT[\s\S]*DB_USERNAME[\s\S]*DB_PASSWORD/,
    );
  });

  it('acepta un env postgres completo con tipos exactos', () => {
    const env = loadEnv({
      PORT: '3000',
      DB_TYPE: 'postgres',
      DB_DATABASE: 'ecommerce_challenge',
      DB_HOST: 'postgres',
      DB_PORT: '5433',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgres',
    });
    if (env.database.type !== 'postgres') {
      assert.fail('esperaba la variante postgres');
    }
    assert.equal(env.database.host, 'postgres');
    assert.equal(env.database.port, 5433);
  });
});
