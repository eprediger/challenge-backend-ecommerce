import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { Sku } from '../../shared/domain/sku';
import { Cantidad } from './cantidad';
import { StockInsuficienteError } from './errors';
import { Motivo } from './motivo';
import { Stock } from './stock';

const unSku = (): Sku => new Sku('ZAP-42-NEG');
const unaFecha = (): Date => new Date('2026-01-01T00:00:00.000Z');

describe('Stock', () => {
  it('se crea con stock disponible en cero', () => {
    const stock = Stock.crear(unSku());

    assert.equal(stock.disponible, 0);
    assert.equal(stock.sku.valor, 'ZAP-42-NEG');
  });

  it('un INGRESO aumenta el stock disponible', () => {
    const stock = Stock.crear(unSku());

    const movimiento = stock.registrar(
      new Cantidad(5),
      Motivo.INGRESO,
      unaFecha(),
    );

    assert.equal(stock.disponible, 5);
    assert.equal(movimiento.cantidad.valor, 5);
    assert.equal(movimiento.motivo, Motivo.INGRESO);
    assert.equal(movimiento.sku.valor, 'ZAP-42-NEG');
    assert.deepEqual(movimiento.fecha, unaFecha());
    assert.equal(movimiento.deltaConSigno(), 5);
    assert.match(
      movimiento.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  for (const motivo of [Motivo.COMPRA, Motivo.AJUSTE_NEGATIVO]) {
    it(`una SALIDA (${motivo.clave}) descuenta el stock disponible`, () => {
      const stock = Stock.crear(unSku());
      stock.registrar(new Cantidad(5), Motivo.INGRESO, unaFecha());

      const movimiento = stock.registrar(new Cantidad(3), motivo, unaFecha());

      assert.equal(stock.disponible, 2);
      assert.equal(movimiento.deltaConSigno(), -3);
    });
  }

  it('una SALIDA mayor al disponible es rechazada', () => {
    const stock = Stock.crear(unSku());
    stock.registrar(new Cantidad(2), Motivo.INGRESO, unaFecha());

    assert.throws(
      () => stock.registrar(new Cantidad(3), Motivo.COMPRA, unaFecha()),
      (error: unknown) =>
        error instanceof StockInsuficienteError &&
        error.stockDisponible === 2,
    );

    assert.equal(stock.disponible, 2);
  });
});
