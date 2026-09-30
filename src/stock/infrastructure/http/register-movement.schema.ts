import { z } from 'zod';
import { Motivo } from '../../domain/motivo';

/**
 * Shape only — domain rules (`Cantidad` positive safe integer, `Sku`
 * non-empty) are checked by the value objects, not here.
 */
export const registrarMovimientoSchema = z.strictObject({
  sku: z.string(),
  cantidad: z.number(),
  motivo: z.enum(
    Motivo.all.map((m) => m.code) as [string, ...string[]],
  ),
});

export type RegistrarMovimientoBody = z.infer<
  typeof registrarMovimientoSchema
>;
