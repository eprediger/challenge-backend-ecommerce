import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { dataSourceOptions } from './data-source';

describe('dataSourceOptions', () => {
  it('selecciona el driver de sqlite', () => {
    const options = dataSourceOptions({
      type: 'sqlite',
      database: 'database.sqlite',
    });
    assert.equal(options.type, 'sqlite');
  });

  it('usa el database del env, sin valor por defecto oculto', () => {
    const options = dataSourceOptions({ type: 'sqlite', database: 'dev.sqlite' });
    assert.equal(options.type, 'sqlite');
    if (options.type !== 'sqlite') {
      assert.fail('esperaba sqlite');
    }
    assert.equal(options.database, 'dev.sqlite');
  });

  it('selecciona el driver de postgres', () => {
    const options = dataSourceOptions({
      type: 'postgres',
      database: 'ecommerce_challenge',
      host: 'postgres',
      port: 5433,
      username: 'postgres',
      password: 'postgres',
    });
    assert.equal(options.type, 'postgres');
  });
});
