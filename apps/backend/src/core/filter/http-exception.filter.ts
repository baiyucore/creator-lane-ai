import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { getClientIp } from '@supercharge/request-ip';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { FastifyReply, FastifyRequest } from 'fastify';

import { ErrorResponseDto, RequestDetailsDto } from '@/common/dto/response.dto';
import { SystemEnvEnum } from '@/common/enum/system.env.enum';
import { LoggerService } from '../../common/logger/logger.service';
import { readProcessEnv } from '@/utils/env';

/** HTTP 错误详情 */
interface ErrorDetails {
  requestId: string;
  status: number;
  message: string | string[];
  path: string;
  method: string;
  timestamp: number;
  errorType: string;
  errorClass: string;
}

/** 增强的错误元数据（用于日志与排查） */
interface EnhancedErrorMetadata {
  requestId: string;
  errorDetails: ErrorDetails;
  requestContext: RequestDetailsDto;
  stackTrace: string[];
  isOperational: boolean;
  responseTime: number;
  userContext: {
    userId?: string;
    ip: string;
    userAgent?: string;
    referer?: string;
  };
  httpContext: {
    statusCode: number;
    statusMessage: string;
    isClientError: boolean;
    isServerError: boolean;
  };
  /** 请求发生时间（ISO） */
  requestedAt: string;
}

/** 4xx 错误分类 */
const CLIENT_ERROR_CLASS: Record<number, string> = {
  400: 'BadRequest',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'NotFound',
  405: 'MethodNotAllowed',
  409: 'Conflict',
  422: 'UnprocessableEntity',
  429: 'TooManyRequests',
};

/** 5xx 错误分类 */
const SERVER_ERROR_CLASS: Record<number, string> = {
  500: 'InternalServerError',
  501: 'NotImplemented',
  502: 'BadGateway',
  503: 'ServiceUnavailable',
  504: 'GatewayTimeout',
};

/** HTTP 状态码对应文案 */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly sensitiveFields = ['password', 'token', 'secret', 'authorization'];
  private readonly sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  private readonly requestStartTime = new WeakMap<FastifyRequest, number>();

  constructor(private readonly logger: LoggerService) {}

  async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
    const requestId = randomUUID(); // 请求ID
    const startTime = dayjs().valueOf(); // 请求开始时间

    try {
      const ctx = host.switchToHttp(); // 获取请求上下文
      const response = ctx.getResponse<FastifyReply>(); // 获取响应对象
      const request = ctx.getRequest<FastifyRequest>(); // 获取请求对象

      if (!this.requestStartTime.has(request)) {
        this.requestStartTime.set(request, startTime);
      }

      const errorDetails = this.getErrorDetails(exception, request, requestId); // 获取错误详情
      const requestDetails = this.getRequestDetails(request); // 获取请求详情

      const enhancedMetadata = this.buildEnhancedErrorMetadata(
        // 构建增强的错误元数据
        exception,
        errorDetails,
        requestDetails,
        request,
      );
      // 发送错误响应
      await this.sendErrorResponse(errorDetails, requestDetails, response, requestId);
      // 记录错误日志
      this.logEnhancedError(enhancedMetadata, exception);
      // 删除请求开始时间
      this.requestStartTime.delete(request);
    } catch (error) {
      // 处理过滤器错误
      this.handleFilterError(error, host, requestId);
    }
  }

  /** 获取错误详情 */
  private getErrorDetails(
    exception: HttpException,
    request: FastifyRequest,
    requestId: string,
  ): ErrorDetails {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const rawMessage =
      typeof response === 'string'
        ? response
        : ((response as Record<string, any>).message ?? exception.message);
    const message = Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage;

    return {
      requestId,
      status,
      message: typeof message === 'string' ? message : String(message),
      path: (request as any).routeOptions?.url ?? request.url?.split('?')[0] ?? request.url,
      method: request.method,
      timestamp: dayjs().valueOf(),
      errorType: exception.constructor.name,
      errorClass: this.classifyHttpError(status),
    };
  }

  /** 分类 HTTP 错误 */
  private classifyHttpError(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
      return CLIENT_ERROR_CLASS[statusCode] ?? 'ClientError';
    }

    if (statusCode >= 500) {
      return SERVER_ERROR_CLASS[statusCode] ?? 'ServerError';
    }

    return 'Unknown';
  }

  /** 获取请求详情 */
  private getRequestDetails(request: FastifyRequest): RequestDetailsDto {
    const ip = getClientIp(request) ?? request.ip ?? 'unknown';

    return {
      query: this.sanitizeData(request.query),
      body: this.sanitizeData(request.body),
      params: this.sanitizeData(request.params),
      method: request.method,
      url: request.url,
      timestamp: dayjs().valueOf(),
      ip,
      headers: this.sanitizeHeaders(request.headers),
    };
  }

  private sanitizeData<T>(data: T): Record<string, any> {
    if (data == null || typeof data !== 'object') {
      return {};
    }

    const sanitized = JSON.parse(JSON.stringify(data));
    this.redactSensitiveFields(sanitized);

    return sanitized;
  }

  private redactSensitiveFields(obj: Record<string, any>): void {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return;
    }

    for (const key of Object.keys(obj)) {
      if (this.sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.redactSensitiveFields(obj[key]);
      }
    }
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const out = { ...headers };

    for (const h of this.sensitiveHeaders) {
      if (h in out) {
        out[h] = '[REDACTED]';
      }
    }

    return out;
  }

  /** 发送错误响应 */
  private async sendErrorResponse(
    errorDetails: ErrorDetails,
    requestDetails: RequestDetailsDto,
    response: FastifyReply,
    requestId: string,
  ): Promise<void> {
    const payload: ErrorResponseDto & { requestId: string } = {
      code: errorDetails.status,
      message:
        typeof errorDetails.message === 'string'
          ? errorDetails.message
          : errorDetails.message.join('; '),
      timestamp: dayjs().valueOf(),
      data: requestDetails,
      requestId,
    };

    await response.status(errorDetails.status).send(payload);
  }

  /** 构建增强的错误元数据 */
  private buildEnhancedErrorMetadata(
    exception: HttpException,
    errorDetails: ErrorDetails,
    requestDetails: RequestDetailsDto,
    request: FastifyRequest,
  ): EnhancedErrorMetadata {
    const startTime = this.requestStartTime.get(request) ?? Date.now();
    const responseTime = Date.now() - startTime;
    const user = (request as any).user;
    const userId = user?.id ?? user?.userId ?? user?.sub;
    const ip = getClientIp(request) ?? request.ip ?? 'unknown';
    const stackTrace = exception.stack
      ? exception.stack
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      : [];

    const isClientError = errorDetails.status >= 400 && errorDetails.status < 500;
    const isServerError = errorDetails.status >= 500;

    return {
      requestId: errorDetails.requestId,
      errorDetails,
      requestContext: requestDetails,
      stackTrace,
      isOperational: isClientError,
      responseTime,
      requestedAt: dayjs(startTime).toISOString(),
      userContext: {
        userId,
        ip,
        userAgent: (request.headers['user-agent'] as string) ?? undefined,
        referer: (request.headers['referer'] as string) ?? undefined,
      },
      httpContext: {
        statusCode: errorDetails.status,
        statusMessage: this.getStatusMessage(errorDetails.status),
        isClientError,
        isServerError,
      },
    };
  }

  private getStatusMessage(statusCode: number): string {
    return STATUS_MESSAGES[statusCode] ?? 'Unknown Status';
  }
  /** 记录错误日志 */
  private logEnhancedError(metadata: EnhancedErrorMetadata, exception: HttpException): void {
    const isServerError = metadata.httpContext.isServerError;
    const logLevel = isServerError ? 'error' : 'warn';
    const prefix = metadata.httpContext.isClientError ? 'CLIENT_ERROR' : 'SERVER_ERROR';

    const message =
      `${metadata.errorDetails.method} ${metadata.errorDetails.path} ${metadata.errorDetails.status} - ${metadata.errorDetails.message}`.trim();

    const logPayload = {
      message,
      prefix,
      metadata: {
        requestId: metadata.requestId,
        requestedAt: metadata.requestedAt,
        responseTimeMs: metadata.responseTime,
        error: {
          type: metadata.errorDetails.errorType,
          class: metadata.errorDetails.errorClass,
          message: metadata.errorDetails.message,
          statusCode: metadata.errorDetails.status,
          statusMessage: metadata.httpContext.statusMessage,
          isOperational: metadata.isOperational,
        },
        request: {
          method: metadata.errorDetails.method,
          path: metadata.errorDetails.path,
          query: metadata.requestContext.query,
          params: metadata.requestContext.params,
          body: metadata.requestContext.body,
        },
        user: metadata.userContext,
        stackTrace: metadata.stackTrace.slice(0, 10),
        exceptionResponse: exception.getResponse(),
        environment: readProcessEnv(SystemEnvEnum.NODE_ENV),
      },
    };

    if (logLevel === 'error') {
      this.logger.error(logPayload.message, logPayload.prefix, logPayload.metadata);
    } else {
      this.logger.warn(logPayload.message, logPayload.prefix, logPayload.metadata);
    }
  }

  private handleFilterError(error: unknown, host: ArgumentsHost, requestId?: string): void {
    this.logger.error({
      message: 'HTTP Exception filter internal error',
      prefix: 'FILTER_CRITICAL',
      metadata: {
        requestId: requestId ?? 'unknown',
        filterError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n') : undefined,
        timestamp: dayjs().toISOString(),
      },
    });

    const response = host.switchToHttp().getResponse<FastifyReply>();
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: dayjs().valueOf(),
      data: null,
      requestId: requestId ?? 'unknown',
    });
  }
}
