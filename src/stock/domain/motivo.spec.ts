import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { MotivoInvalidoError } from './errors';
import { Direccion, Motivo } from './motivo';

describe('Motivo', () => {
  it('cada motivo conoce su dirección', () => {
    assert.equal(Motivo.INGRESO.direccion, Direccion.ENTRADA);
    assert.equal(Motivo.DEVOLUCION.direccion, Direccion.ENTRADA);
    assert.equal(Motivo.AJUSTE_POSITIVO.direccion, Direccion.ENTRADA);
    assert.equal(Motivo.COMPRA.direccion, Direccion.SALIDA);
    assert.equal(Motivo.AJUSTE_NEGATIVO.direccion, Direccion.SALIDA);
  });

  it('from() devuelve la misma instancia para una code válida', () => {
    assert.equal(Motivo.from('COMPRA'), Motivo.COMPRA);
  });

  it('from() rechaza un motivo desconocido', () => {
    assert.throws(() => Motivo.from('VENTA'), MotivoInvalidoError);
  });
});
