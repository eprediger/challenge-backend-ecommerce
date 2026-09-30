import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validates the argument against the given Zod schema (Nest docs
 * pattern — the thrown `ZodError` is mapped to a 400
 * `urn:problem:validacion` by the `DomainErrorFilter`).
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    return this.schema.parse(value);
  }
}
