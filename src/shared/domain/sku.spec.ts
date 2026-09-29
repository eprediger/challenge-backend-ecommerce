import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { Sku, SkuInvalidoError } from './sku';

describe('Sku', () => {
  it('conserva el valor de un SKU no vacío', () => {
    const sku = new Sku('ZAP-42');

    assert.equal(sku.valor, 'ZAP-42');
  });

  it('recorta espacios alrededor del SKU', () => {
    const sku = new Sku('  ZAP-42  ');

    assert.equal(sku.valor, 'ZAP-42');
  });

  it('rechaza un SKU vacío o solo espacios', () => {
    assert.throws(() => new Sku(''), SkuInvalidoError);
    assert.throws(() => new Sku('   '), SkuInvalidoError);
  });
});
