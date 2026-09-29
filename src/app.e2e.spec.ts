import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { CategoriaOrmEntity } from './catalogo/infrastructure/persistence/categoria.orm-entity';
import { ProductoOrmEntity } from './catalogo/infrastructure/persistence/producto.orm-entity';
import { VarianteOrmEntity } from './catalogo/infrastructure/persistence/variante.orm-entity';
import { Sku } from './shared/domain/sku';
import { StockService } from './stock/application/stock.service';

interface MovimientoResponse {
  id: string;
  sku: string;
  cantidad: number;
  motivo: string;
  fecha: string;
  stockDisponible: number;
}

interface StockResponse {
  sku: string;
  stockDisponible: number;
}

describe('POST /stock/movimientos y GET /stock/:sku', () => {
  let app: INestApplication;
  let baseUrl: string;

  before(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  after(async () => {
    await app.close();
  });

  it('un INGRESO registra el movimiento y el GET responde el stock disponible', async () => {
    const dataSource = app.get(DataSource);
    const categoriaId = randomUUID();
    const productoId = randomUUID();
    await dataSource
      .getRepository(CategoriaOrmEntity)
      .insert({ id: categoriaId, nombre: 'Calzado' });
    await dataSource.getRepository(ProductoOrmEntity).insert({
      id: productoId,
      nombre: 'Zapatilla Runner',
      descripcion: 'Zapatilla de running',
      precioCentavos: 129990,
      moneda: 'ARS',
      categoriaId,
    });
    await dataSource.getRepository(VarianteOrmEntity).insert({
      id: randomUUID(),
      sku: 'ZAP-42-NEG',
      productoId,
    });
    await app.get(StockService).crearItem(new Sku('ZAP-42-NEG'));

    const response = await fetch(`${baseUrl}/stock/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'ZAP-42-NEG', cantidad: 5, motivo: 'INGRESO' }),
    });

    assert.equal(response.status, 201);
    const movimiento = (await response.json()) as MovimientoResponse;
    assert.match(
      movimiento.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    assert.equal(movimiento.sku, 'ZAP-42-NEG');
    assert.equal(movimiento.cantidad, 5);
    assert.equal(movimiento.motivo, 'INGRESO');
    assert.ok(movimiento.fecha);
    assert.equal(movimiento.stockDisponible, 5);

    const get = await fetch(`${baseUrl}/stock/ZAP-42-NEG`);
    assert.equal(get.status, 200);
    const stock = (await get.json()) as StockResponse;
    assert.deepEqual(stock, { sku: 'ZAP-42-NEG', stockDisponible: 5 });
  });
});
