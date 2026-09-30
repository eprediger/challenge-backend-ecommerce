import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common';
import { Sku } from '../../../shared/domain/sku';
import { ZodValidationPipe } from '../../../shared/infrastructure/http/zod-validation.pipe';
import { StockService } from '../../application/stock.service';
import { Cantidad } from '../../domain/cantidad';
import { Motivo } from '../../domain/motivo';
import { ClaveIdempotenciaRequeridaError } from './clave-idempotencia-requerida.error';
import {
  registrarMovimientoSchema,
  type RegistrarMovimientoBody,
} from './register-movement.schema';

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
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registrarMovimientoSchema))
  async registrarMovimiento(
    @Body() body: RegistrarMovimientoBody,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<unknown> {
    const clave = idempotencyKey?.trim();
    if (!clave) {
      throw new ClaveIdempotenciaRequeridaError();
    }
    const movimiento = await this.stockService.registrarMovimiento(
      new Sku(body.sku),
      new Cantidad(body.cantidad),
      Motivo.desde(body.motivo),
      clave,
    );
    return {
      id: movimiento.id,
      sku: movimiento.sku.valor,
      cantidad: movimiento.cantidad.valor,
      motivo: movimiento.motivo.clave,
      fecha: movimiento.fecha.toISOString(),
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
