import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import {
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it,
} from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { CategoriaOrmEntity } from './catalogo/infrastructure/persistence/categoria.orm-entity';
import { ProductoOrmEntity } from './catalogo/infrastructure/persistence/producto.orm-entity';
import { VarianteOrmEntity } from './catalogo/infrastructure/persistence/variante.orm-entity';
import { Sku } from './shared/domain/sku';
import { StockService } from './stock/application/stock.service';
import { Cantidad } from './stock/domain/cantidad';
import { Motivo } from './stock/domain/motivo';

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

async function crearVarianteConItem(
  app: INestApplication,
  sku: string,
): Promise<void> {
  const dataSource = app.get(DataSource);
  const producto = await dataSource
    .getRepository(ProductoOrmEntity)
    .findOneByOrFail({ nombre: 'Zapatilla Runner' });
  await dataSource.getRepository(VarianteOrmEntity).insert({
    id: randomUUID(),
    sku,
    productoId: producto.id,
  });
  await app.get(StockService).crearItem(new Sku(sku));
}

function postMovimiento(
  baseUrl: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${baseUrl}/stock/movimientos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
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

  // Drop and recreate the schema so each spec arranges from zero.
  afterEach(async () => {
    await app.get(DataSource).synchronize(true);
  });

  // The baseline catalog every spec arranges against — spec
  // variantes hang off this one producto, the real catalog shape.
  beforeEach(async () => {
    const dataSource = app.get(DataSource);
    const categoria = await dataSource
      .getRepository(CategoriaOrmEntity)
      .save({ id: randomUUID(), nombre: 'Calzado' });
    await dataSource.getRepository(ProductoOrmEntity).save({
      id: randomUUID(),
      nombre: 'Zapatilla Runner',
      descripcion: 'Zapatilla de running',
      precioCentavos: 129990,
      moneda: 'ARS',
      categoriaId: categoria.id,
    });
  });

  it('un INGRESO registra el movimiento y el GET responde el stock disponible', async () => {
    await crearVarianteConItem(app, 'ZAP-42-NEG');

    const response = await postMovimiento(baseUrl, {
      sku: 'ZAP-42-NEG',
      cantidad: 5,
      motivo: 'INGRESO',
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

  it('una COMPRA descuenta el stock disponible', async () => {
    await crearVarianteConItem(app, 'ZAP-40-BLA');
    await app
      .get(StockService)
      .registrarMovimiento(
        new Sku('ZAP-40-BLA'),
        new Cantidad(10),
        Motivo.INGRESO,
      );

    const response = await postMovimiento(baseUrl, {
      sku: 'ZAP-40-BLA',
      cantidad: 3,
      motivo: 'COMPRA',
    });

    assert.equal(response.status, 201);
    const movimiento = (await response.json()) as MovimientoResponse;
    assert.equal(movimiento.motivo, 'COMPRA');
    assert.equal(movimiento.stockDisponible, 7);

    const get = await fetch(`${baseUrl}/stock/ZAP-40-BLA`);
    const stock = (await get.json()) as StockResponse;
    assert.deepEqual(stock, { sku: 'ZAP-40-BLA', stockDisponible: 7 });
  });

  it('una COMPRA mayor al disponible → 409 con problem detail', async () => {
    await crearVarianteConItem(app, 'ZAP-41-ROJ');
    await app
      .get(StockService)
      .registrarMovimiento(
        new Sku('ZAP-41-ROJ'),
        new Cantidad(5),
        Motivo.INGRESO,
      );

    const response = await postMovimiento(baseUrl, {
      sku: 'ZAP-41-ROJ',
      cantidad: 10,
      motivo: 'COMPRA',
    });

    assert.equal(response.status, 409);
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/problem\+json/,
    );
    const problem = (await response.json()) as Record<string, unknown>;
    assert.equal(problem.type, 'urn:problem:stock-insuficiente');
    assert.equal(problem.title, 'Stock insuficiente');
    assert.equal(problem.status, 409);
    assert.equal(typeof problem.detail, 'string');
    assert.equal(typeof problem.instance, 'string');
    assert.equal(problem.stockDisponible, 5);

    const [{ total }] = await app
      .get(DataSource)
      .query<[{ total: number }]>(
        "SELECT COALESCE(SUM(delta), 0) AS total FROM movimiento_stock WHERE sku = 'ZAP-41-ROJ'",
      );
    assert.equal(Number(total), 5);
  });

  it('20 COMPRA 1 concurrentes sobre stock 5 → 5×201, 15×409, disponible 0', async () => {
    await crearVarianteConItem(app, 'ZAP-CONC');
    await app
      .get(StockService)
      .registrarMovimiento(
        new Sku('ZAP-CONC'),
        new Cantidad(5),
        Motivo.INGRESO,
      );

    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        postMovimiento(baseUrl, {
          sku: 'ZAP-CONC',
          cantidad: 1,
          motivo: 'COMPRA',
        }),
      ),
    );

    const statuses = responses.map((r) => r.status);
    assert.equal(
      statuses.filter((s) => s === 201).length,
      5,
      `expected 5 winners, got: ${statuses.join(',')}`,
    );
    assert.equal(
      statuses.filter((s) => s === 409).length,
      15,
      `expected 15 losers, got: ${statuses.join(',')}`,
    );

    const get = await fetch(`${baseUrl}/stock/ZAP-CONC`);
    const stock = (await get.json()) as StockResponse;
    assert.equal(stock.stockDisponible, 0);

    // The ledger must agree: losers wrote no movement.
    const [{ total }] = await app
      .get(DataSource)
      .query<[{ total: number }]>(
        "SELECT COALESCE(SUM(delta), 0) AS total FROM movimiento_stock WHERE sku = 'ZAP-CONC'",
      );
    assert.equal(Number(total), 0);
  });

  it('INGRESO y COMPRA concurrentes → todos 201 y SUM(delta) == disponible', async () => {
    await crearVarianteConItem(app, 'ZAP-MIX');
    await app
      .get(StockService)
      .registrarMovimiento(
        new Sku('ZAP-MIX'),
        new Cantidad(10),
        Motivo.INGRESO,
      );

    // Stock 10 so nothing can lose: an INGRESO's delta is never
    // rejected by the conditional update, and 10 COMPRA 1 fit.
    const responses = await Promise.all([
      ...Array.from({ length: 10 }, () =>
        postMovimiento(baseUrl, {
          sku: 'ZAP-MIX',
          cantidad: 3,
          motivo: 'INGRESO',
        }),
      ),
      ...Array.from({ length: 10 }, () =>
        postMovimiento(baseUrl, {
          sku: 'ZAP-MIX',
          cantidad: 1,
          motivo: 'COMPRA',
        }),
      ),
    ]);

    const statuses = responses.map((r) => r.status);
    assert.equal(
      statuses.filter((s) => s === 201).length,
      20,
      `expected all to win, got: ${statuses.join(',')}`,
    );

    const get = await fetch(`${baseUrl}/stock/ZAP-MIX`);
    const stock = (await get.json()) as StockResponse;
    assert.equal(stock.stockDisponible, 30);

    const [{ total }] = await app
      .get(DataSource)
      .query<[{ total: number }]>(
        "SELECT COALESCE(SUM(delta), 0) AS total FROM movimiento_stock WHERE sku = 'ZAP-MIX'",
      );
    assert.equal(Number(total), 30);
  });

  it('invariante: SUM(delta) == cantidad_disponible por SKU', async () => {
    await crearVarianteConItem(app, 'INV-A');
    await crearVarianteConItem(app, 'INV-B');
    const posts = [
      { sku: 'INV-A', cantidad: 10, motivo: 'INGRESO', expected: 201 },
      { sku: 'INV-A', cantidad: 3, motivo: 'COMPRA', expected: 201 },
      { sku: 'INV-A', cantidad: 2, motivo: 'DEVOLUCION', expected: 201 },
      // The rejected COMPRA must not enter the ledger either.
      { sku: 'INV-A', cantidad: 99, motivo: 'COMPRA', expected: 409 },
      { sku: 'INV-B', cantidad: 4, motivo: 'INGRESO', expected: 201 },
      { sku: 'INV-B', cantidad: 4, motivo: 'AJUSTE_NEGATIVO', expected: 201 },
    ] as const;
    for (const { sku, cantidad, motivo, expected } of posts) {
      const response = await postMovimiento(baseUrl, {
        sku,
        cantidad,
        motivo,
      });
      assert.equal(
        response.status,
        expected,
        `${motivo} ${cantidad} ${sku}`,
      );
    }

    const rows = await app
      .get(DataSource)
      .query<Array<{ sku: string; cantidad_disponible: number; total: number }>>(
        `SELECT s.sku, s.cantidad_disponible, COALESCE(SUM(m.delta), 0) AS total
         FROM stock s LEFT JOIN movimiento_stock m ON m.sku = s.sku
         GROUP BY s.sku`,
      );

    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(
        Number(row.cantidad_disponible),
        Number(row.total),
        `${row.sku}: disponible ${row.cantidad_disponible} != ledger ${row.total}`,
      );
    }
  });

  it('un SKU desconocido → 404 problem detail en POST', async () => {
    const response = await postMovimiento(baseUrl, {
      sku: 'NO-EXISTE',
      cantidad: 1,
      motivo: 'COMPRA',
    });

    assert.equal(response.status, 404);
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/problem\+json/,
    );
    const problem = (await response.json()) as Record<string, unknown>;
    assert.equal(problem.type, 'urn:problem:variante-no-encontrada');
    assert.equal(problem.title, 'Variante no encontrada');
    assert.equal(problem.status, 404);
    assert.equal(typeof problem.detail, 'string');
    assert.equal(typeof problem.instance, 'string');
  });

  it('un SKU desconocido → 404 problem detail en GET (200 chars)', async () => {
    const sku = 'SKU-LARGO-'.repeat(20);

    const get = await fetch(`${baseUrl}/stock/${sku}`);

    assert.equal(get.status, 404);
    const problem = (await get.json()) as Record<string, unknown>;
    assert.equal(problem.type, 'urn:problem:variante-no-encontrada');
    assert.equal(problem.status, 404);
  });

  for (const [name, body, expectedType] of [
    [
      'cantidad 0',
      { sku: 'X', cantidad: 0, motivo: 'COMPRA' },
      'urn:problem:cantidad-invalida',
    ],
    [
      'cantidad −1',
      { sku: 'X', cantidad: -1, motivo: 'COMPRA' },
      'urn:problem:cantidad-invalida',
    ],
    [
      'cantidad 1.5',
      { sku: 'X', cantidad: 1.5, motivo: 'COMPRA' },
      'urn:problem:cantidad-invalida',
    ],
    [
      'cantidad "3"',
      { sku: 'X', cantidad: '3', motivo: 'COMPRA' },
      'urn:problem:validacion',
    ],
    [
      'cantidad 1e20',
      { sku: 'X', cantidad: 1e20, motivo: 'COMPRA' },
      'urn:problem:cantidad-invalida',
    ],
    [
      'motivo desconocido',
      { sku: 'X', cantidad: 1, motivo: 'NADA' },
      'urn:problem:validacion',
    ],
    [
      'campo extra',
      { sku: 'X', cantidad: 1, motivo: 'COMPRA', extra: 1 },
      'urn:problem:validacion',
    ],
    [
      'campo faltante',
      { sku: 'X', motivo: 'COMPRA' },
      'urn:problem:validacion',
    ],
  ] as const) {
    it(`body inválido (${name}) → 400 ${expectedType}`, async () => {
      const response = await postMovimiento(baseUrl, body);

      assert.equal(response.status, 400);
      assert.match(
        response.headers.get('content-type') ?? '',
        /application\/problem\+json/,
      );
      const problem = (await response.json()) as Record<string, unknown>;
      assert.equal(problem.type, expectedType);
      assert.equal(problem.status, 400);
      assert.equal(typeof problem.detail, 'string');
      if (expectedType === 'urn:problem:validacion') {
        assert.ok(Array.isArray(problem.errors));
        assert.ok((problem.errors as unknown[]).length > 0);
      }
    });
  }

  it('un request emite un wide event', async () => {
    await crearVarianteConItem(app, 'REM-001');
    const requestId = randomUUID();
    const logs: Record<string, unknown>[] = [];
    const originalLog = console.log;
    console.log = (line: unknown) => {
      try {
        logs.push(JSON.parse(String(line)) as Record<string, unknown>);
      } catch {
        originalLog(line);
      }
    };

    const response = await postMovimiento(
      baseUrl,
      { sku: 'REM-001', cantidad: 3, motivo: 'INGRESO' },
      { 'x-request-id': requestId },
    );
    console.log = originalLog;
    assert.equal(response.status, 201);
    await new Promise((resolve) => setImmediate(resolve));

    const events = logs.filter((l) => typeof l.requestId === 'string');
    assert.equal(events.length, 1);
    const event = events[0]!;
    assert.equal(event.requestId, requestId);
    assert.equal(event.method, 'POST');
    assert.equal(event.path, '/stock/movimientos');
    assert.equal(event.statusCode, 201);
    assert.equal(event.outcome, 'result');
    assert.equal(typeof event.durationMs, 'number');
    assert.equal(event.sku, 'REM-001');
    assert.equal(event.cantidad, 3);
    assert.equal(event.motivo, 'INGRESO');
    assert.equal(event.service, 'ecommerce-challenge');
    assert.equal(event.version, '1.0.0');
    assert.equal(typeof event.instanceId, 'string');
  });
});
