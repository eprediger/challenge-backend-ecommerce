import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkuInvalidoError } from '../../domain/sku-invalido.error';
import {
  CantidadInvalidaError,
  MotivoInvalidoError,
  StockInsuficienteError,
  VarianteNoEncontradaError,
} from '../../../stock/domain/errors';
import { enrichWideEvent, requestContext } from './request-context';

interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: unknown;
  [extension: string]: unknown;
}

/** Domain error class → HTTP status. `type` is derived
 * (`urn:problem:` + kebab-cased class name) and `title`/`detail`
 * come from the error's own `summary`/`message`, so adding a
 * domain error — from Stock today, Catalogo tomorrow — is one
 * line here plus its `summary` field. */
const STATUS = new Map<new (...args: never[]) => Error, number>([
  [StockInsuficienteError, HttpStatus.CONFLICT],
  [VarianteNoEncontradaError, HttpStatus.NOT_FOUND],
  [CantidadInvalidaError, HttpStatus.BAD_REQUEST],
  [SkuInvalidoError, HttpStatus.BAD_REQUEST],
  [MotivoInvalidoError, HttpStatus.BAD_REQUEST],
]);

/**
 * `StockInsuficienteError` → `stock-insuficiente`,
 * `CantidadInvalidaError` → `cantidad-invalida`, …
 */
function slugOf(error: Error): string {
  return error.constructor.name
    .replace(/Error$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Catches every error and answers an RFC 9457 problem detail —
 * domain errors get `urn:problem:<slug>` derived from the class
 * name plus their `title`, a framework `HttpException` keeps its
 * status, anything else becomes the `about:blank` 500. `instance`
 * carries the requestId from the ALS context so a response
 * correlates with its wide event; the error itself is also
 * enriched into that event.
 */
@Catch()
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const problem = this.problemFor(error);
    problem.instance = requestContext.getStore()?.requestId;
    if (error instanceof Error) {
      enrichWideEvent({
        error: { type: error.name, message: error.message },
      });
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(problem.status)
      .contentType('application/problem+json')
      .json(problem);
  }

  private problemFor(error: unknown): Problem {
    if (error instanceof Error) {
      const status = STATUS.get(
        error.constructor as new (...args: never[]) => Error,
      );
      if (status !== undefined) {
        const problem: Problem = {
          type: `urn:problem:${slugOf(error)}`,
          title: (error as { summary?: string }).summary ?? 'Error',
          status,
          detail: error.message,
        };
        // The only extension member today: the 409's `stockDisponible`.
        if (error instanceof StockInsuficienteError) {
          problem.stockDisponible = error.cantidadDisponible;
        }
        return problem;
      }
      if (error instanceof HttpException) {
        return {
          type: 'about:blank',
          title: 'HTTP Error',
          status: error.getStatus(),
          detail: error.message,
        };
      }
    }
    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Error interno',
    };
  }
}
