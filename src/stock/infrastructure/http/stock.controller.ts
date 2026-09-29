import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Sku } from '../../../shared/domain/sku';
import { StockService } from '../../application/stock.service';
import { Cantidad } from '../../domain/cantidad';
import { Motivo } from '../../domain/motivo';

/**
 * HTTP adapter for the stock endpoints. Translates the wire body into
 * value objects (they enforce the domain rules) and domain objects
 * back into the contract's shape — `valor`/`clave` mapped here, the
 * domain knows nothing about JSON.
 */
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('movimientos')
  @HttpCode(201)
  async registrarMovimiento(
    @Body() body: { sku: string; cantidad: number; motivo: string },
  ): Promise<unknown> {
    const { movimiento, cantidadDisponible } =
      await this.stockService.registrarMovimiento(
        new Sku(body.sku),
        new Cantidad(body.cantidad),
        Motivo.desde(body.motivo),
      );
    return {
      id: movimiento.id,
      sku: movimiento.sku.valor,
      cantidad: movimiento.cantidad.valor,
      motivo: movimiento.motivo.clave,
      fecha: movimiento.fecha.toISOString(),
      stockDisponible: cantidadDisponible,
    };
  }

  @Get(':sku')
  async stockDisponible(@Param('sku') sku: string): Promise<unknown> {
    return {
      sku,
      stockDisponible: await this.stockService.stockDisponible(new Sku(sku)),
    };
  }
}
