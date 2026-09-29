import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { Cantidad } from './cantidad';
import { CantidadInvalidaError } from './errors';

describe('Cantidad', () => {
  it('acepta un entero positivo', () => {
    const cantidad = new Cantidad(3);

    assert.equal(cantidad.valor, 3);
  });

  it('acepta el entero seguro máximo, sin máximo de negocio', () => {
    const cantidad = new Cantidad(Number.MAX_SAFE_INTEGER);

    assert.equal(cantidad.valor, Number.MAX_SAFE_INTEGER);
  });

  it('rechaza cero y negativos', () => {
    assert.throws(() => new Cantidad(0), CantidadInvalidaError);
    assert.throws(() => new Cantidad(-1), CantidadInvalidaError);
  });

  it('rechaza fracciones', () => {
    assert.throws(() => new Cantidad(1.5), CantidadInvalidaError);
  });

  it('rechaza enteros que JS no representa exactamente', () => {
    assert.throws(() => new Cantidad(1e20), CantidadInvalidaError);
    assert.throws(
      () => new Cantidad(Number.MAX_SAFE_INTEGER + 1),
      CantidadInvalidaError,
    );
  });
});
