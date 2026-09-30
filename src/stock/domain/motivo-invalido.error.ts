/**
 * Thrown when a movement `motivo` cannot be parsed — the `clave` is
 * not one of the declared reasons.
 */
export class MotivoInvalidoError extends Error {
  readonly summary = 'Motivo inválido';

  constructor(clave: string) {
    super(`Motivo de movimiento desconocido: "${clave}"`);
    this.name = 'MotivoInvalidoError';
  }
}
