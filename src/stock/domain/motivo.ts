import { MotivoInvalidoError } from './errors';

/**
 * Whether a `Movimiento` adds or removes units. The enum values are
 * the signed multiplier itself, so a `delta` is plain multiplication.
 */
export enum Direccion {
  ENTRADA = 1,
  SALIDA = -1,
}

/**
 * Movement reason — an enumeration class: each instance carries its
 * `direccion`, so a reason cannot be declared without one and the
 * sign travels with the value (`cantidad × motivo.direccion`).
 * Instances are singletons: `Motivo.from('COMPRA') === Motivo.COMPRA`.
 * Wire shape is a boundary concern: adapters serialize `motivo.code`,
 * the domain knows nothing about JSON.
 */
export class Motivo {
  private constructor(
    /** How the reason appears in the API and the database. */
    readonly code: string,
    /** Which way this reason moves `cantidadDisponible`. */
    readonly direccion: Direccion,
  ) {}

  /** Supplier restock. */
  static readonly INGRESO = new Motivo('INGRESO', Direccion.ENTRADA);
  /** Customer return. */
  static readonly DEVOLUCION = new Motivo('DEVOLUCION', Direccion.ENTRADA);
  /** Customer purchase — the statement's wording. */
  static readonly COMPRA = new Motivo('COMPRA', Direccion.SALIDA);
  /** Manual adjustment up. */
  static readonly AJUSTE_POSITIVO = new Motivo('AJUSTE_POSITIVO', Direccion.ENTRADA);
  /** Manual adjustment down. */
  static readonly AJUSTE_NEGATIVO = new Motivo('AJUSTE_NEGATIVO', Direccion.SALIDA);

  /** Every declared reason — for schema validation and `from`. */
  static readonly all: readonly Motivo[] = [
    Motivo.INGRESO,
    Motivo.DEVOLUCION,
    Motivo.COMPRA,
    Motivo.AJUSTE_POSITIVO,
    Motivo.AJUSTE_NEGATIVO,
  ];

  /**
   * Parses a reason by its `code`.
   *
   * @param code - The wire/stored spelling, e.g. `"COMPRA"`.
   * @returns The matching singleton instance.
   * @throws {@link MotivoInvalidoError} when `code` is not a declared
   *   reason.
   */
  static from(code: string): Motivo {
    const motivo = Motivo.all.find((m) => m.code === code);
    if (!motivo) {
      throw new MotivoInvalidoError(code);
    }
    return motivo;
  }
}
