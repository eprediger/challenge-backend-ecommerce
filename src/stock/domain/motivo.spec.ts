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

  it('desde() devuelve la misma instancia para una clave válida', () => {
    assert.equal(Motivo.desde('COMPRA'), Motivo.COMPRA);
  });

  it('desde() rechaza un motivo desconocido', () => {
    assert.throws(() => Motivo.desde('VENTA'), MotivoInvalidoError);
  });
});
