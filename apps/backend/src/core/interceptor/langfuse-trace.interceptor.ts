import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

import { LangfuseService } from '@/common/langfuse/langfuse.service';

const SKIP_PATH_PREFIXES = ['/docs', '/openApiJson', '/metrics', '/test-metrics', '/health'];
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization'];

@Injectable()
export class LangfuseTraceInterceptor implements NestInterceptor {
  constructor(private readonly langfuseService: LangfuseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !this.langfuseService.isEnabled()) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const path = this.getRoutePath(request);

    if (this.shouldSkip(path)) {
      return next.handle();
    }

    const startedAt = Date.now();
    const span = this.langfuseService.startSpan(`${request.method} ${path}`, {
      input: {
        method: request.method,
        path,
        url: request.url,
        query: this.sanitizeRecord(request.query),
        params: this.sanitizeRecord(request.params),
      },
      metadata: {
        source: 'http',
      },
    });

    if (span == null) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        span.update({
          output: {
            statusCode: response.statusCode ?? 200,
            durationMs: Date.now() - startedAt,
          },
        });
      }),
      catchError((error: unknown) => {
        span.update({
          level: 'ERROR',
          statusMessage: this.getErrorMessage(error),
          output: {
            statusCode: response.statusCode ?? 500,
            durationMs: Date.now() - startedAt,
            error: this.getErrorMessage(error),
          },
        });

        return throwError(() => error);
      }),
      finalize(() => {
        span.end();
      }),
    );
  }

  private shouldSkip(path: string): boolean {
    return SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
  }

  private getRoutePath(request: FastifyRequest): string {
    const requestWithRoute = request as FastifyRequest & {
      routeOptions?: { url?: string };
    };

    return requestWithRoute.routeOptions?.url ?? request.url.split('?')[0] ?? request.url;
  }

  private sanitizeRecord(value: unknown): Record<string, unknown> {
    if (value == null || typeof value !== 'object') {
      return {};
    }

    const cloned = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    this.redactSensitive(cloned);

    return cloned;
  }

  private redactSensitive(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) {
        this.redactSensitive(item);
      }

      return;
    }

    if (value == null || typeof value !== 'object') {
      return;
    }

    const record = value as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
        record[key] = '[REDACTED]';
      } else {
        this.redactSensitive(record[key]);
      }
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
