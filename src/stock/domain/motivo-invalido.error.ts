/**
 * Thrown when a movement `motivo` cannot be parsed — the `code` is
 * not one of the declared reasons.
 */
export class MotivoInvalidoError extends Error {
  readonly summary = 'Motivo inválido';

  constructor(code: string) {
    super(`Motivo de movimiento desconocido: "${code}"`);
    this.name = 'MotivoInvalidoError';
  }
}
