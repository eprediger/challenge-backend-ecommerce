/**
 * Thrown when a SKU is empty or only whitespace.
 */
export class SkuInvalidoError extends Error {
  readonly summary = 'SKU inválido';

  constructor(valor: string) {
    super(`El SKU no puede estar vacío: "${valor}"`);
    this.name = 'SkuInvalidoError';
  }
}
