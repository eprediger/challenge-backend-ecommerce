import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
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

/**
 * One row per mapped error. Unset fields default to
 * `type: urn:problem:` + the kebab-cased class name,
 * `title: error.summary`, `detail: error.message`.
 */
interface ProblemSeed {
  status: number;
  type?: string;
  title?: string;
  detail?: string;
  extension?: (error: Error) => Record<string, unknown>;
}

const PROBLEMS = new Map<new (...args: never[]) => Error, ProblemSeed>([
  [
    StockInsuficienteError,
    {
      status: HttpStatus.CONFLICT,
      extension: (error) => ({
        stockDisponible: (error as StockInsuficienteError).cantidadDisponible,
      }),
    },
  ],
  [VarianteNoEncontradaError, { status: HttpStatus.NOT_FOUND }],
  [CantidadInvalidaError, { status: HttpStatus.BAD_REQUEST }],
  [SkuInvalidoError, { status: HttpStatus.BAD_REQUEST }],
  [MotivoInvalidoError, { status: HttpStatus.BAD_REQUEST }],
  [
    ZodError,
    {
      status: HttpStatus.BAD_REQUEST,
      type: 'urn:problem:validacion',
      title: 'Body inválido',
      detail: 'El body no cumple el esquema esperado',
      extension: (error) => ({
        errors: (error as ZodError).issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      }),
    },
  ],
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
 * Catches every error and answers an RFC 9457 problem detail.
 * Mapped errors come from the {@link PROBLEMS} table; a framework
 * `HttpException` keeps its own status; anything else becomes a
 * 500 without leaking internals. `instance` carries the requestId
 * from the ALS context so a response correlates with its wide
 * event, which the error also enriches.
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
    const seed =
      error instanceof Error ? this.seedFor(error) : undefined;
    if (seed) {
      return {
        type: seed.type ?? `urn:problem:${slugOf(error as Error)}`,
        title:
          seed.title ??
          (error as { summary?: string }).summary ??
          'Error',
        status: seed.status,
        detail: seed.detail ?? (error as Error).message,
        ...seed.extension?.(error as Error),
      };
    }
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      type: 'about:blank',
      title: 'Error',
      status,
      detail:
        error instanceof HttpException
          ? error.message
          : 'Error interno',
    };
  }

  /**
   * Exact constructor key first; the `instanceof` scan catches
   * subclasses — ZodError instances are not literally
   * `new ZodError()`.
   */
  private seedFor(error: Error): ProblemSeed | undefined {
    const seed = PROBLEMS.get(
      error.constructor as new (...args: never[]) => Error,
    );
    if (seed) {
      return seed;
    }
    for (const [errorClass, s] of PROBLEMS) {
      if (error instanceof errorClass) {
        return s;
      }
    }
    return undefined;
  }
}
