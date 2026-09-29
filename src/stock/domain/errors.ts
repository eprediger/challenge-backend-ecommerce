/**
 * Thrown when a `cantidad` is not a positive safe integer —
 * `0`, negatives, fractions and values above `Number.MAX_SAFE_INTEGER`
 * cannot be represented in the domain.
 *
 * @remarks
 * Also thrown by the persistence adapter when Postgres rejects a
 * movement `delta` with error `22003` (integer out of range), so use
 * cases and clients see one domain error, not an infrastructure one.
 */
export class CantidadInvalidaError extends Error {
  constructor(valor: number) {
    super(`La cantidad debe ser un entero positivo: ${valor}`);
    this.name = 'CantidadInvalidaError';
  }
}
