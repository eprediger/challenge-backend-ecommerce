import { SkuInvalidoError } from './sku-invalido.error';

/**
 * Value object shared by the Catalogo and Stock contexts — the only
 * link between them.
 *
 * @remarks
 * Always created valid: the value is trimmed and cannot be empty.
 * No maximum length in the domain (no requirement imposes one).
 */
export class Sku {
  readonly valor: string;

  /**
   * @param valor - Raw SKU text; stored trimmed.
   * @throws {@link SkuInvalidoError} when empty after trimming.
   */
  constructor(valor: string) {
    const recortado = valor.trim();
    if (recortado.length === 0) {
      throw new SkuInvalidoError(valor);
    }
    this.valor = recortado;
  }
}
