import { CantidadInvalidaError } from './errors';

/**
 * Value object: the `cantidad` of a `Movimiento` — always a positive
 * safe integer.
 *
 * @remarks
 * `Number.isSafeInteger` is a technical limit, not a business one (no
 * maximum is required): above it JS loses integer precision and SQLite
 * would store the value as a float.
 */
export class Cantidad {
  readonly valor: number;

  /**
   * @param valor - Number of units of the movement.
   * @throws {@link CantidadInvalidaError} when not a positive safe integer.
   */
  constructor(valor: number) {
    if (!Number.isSafeInteger(valor) || valor <= 0) {
      throw new CantidadInvalidaError(valor);
    }
    this.valor = valor;
  }
}
