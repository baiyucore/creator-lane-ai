import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { getClientIp } from '@supercharge/request-ip';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { FastifyReply, FastifyRequest } from 'fastify';

import { SystemEnvEnum } from '@/common/enum/system.env.enum';
import { LoggerService } from '@/common/logger/logger.service';
import { readProcessEnv } from '@/utils/env';

// 定义接口
interface HttpExceptionResponse {
  statusCode: number;
  message: any;
  error: string;
}

interface RequestDetails {
  requestId: string;
  query: Record<string, any>;
  body: Record<string, any>;
  params: Record<string, any>;
  method: string;
  url: string;
  path: string;
  headers: Record<string, any>;
  ip: string;
  userAgent?: string;
  referer?: string;
  timestamp: number;
  userId?: string;
  responseTime?: number;
}

interface ErrorResponse {
  code: number;
  message: string | string[];
  data: RequestDetails;
  requestId: string;
}

interface ErrorMetadata {
  errorType: string;
  errorClass: string;
  statusCode: number;
  isOperational: boolean;
  stackTrace: string[];
  errorChain?: any[];
  requestContext: RequestDetails;
  systemInfo: {
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  private readonly requestStartTime = new WeakMap<FastifyRequest, number>();

  constructor(
    private readonly logger: LoggerService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const requestId = randomUUID();

    try {
      const { httpAdapter } = this.httpAdapterHost;
      const ctx = host.switchToHttp();
      const request = ctx.getRequest<FastifyRequest>();
      const response = ctx.getResponse<FastifyReply>();

      // 记录请求开始时间
      if (!this.requestStartTime.has(request)) {
        this.requestStartTime.set(request, Date.now());
      }

      const requestDetails = this.getRequestDetails(request, requestId);
      const { statusCode, errorMessage } = this.getErrorDetails(exception);
      const responseBody = this.createResponseBody(
        statusCode,
        errorMessage,
        requestDetails,
        requestId,
      );

      // 记录详细的错误信息
      const errorMetadata = this.buildErrorMetadata(exception, requestDetails, statusCode);
      this.logError(exception, responseBody, errorMetadata);

      // 返回响应
      httpAdapter.reply(response, responseBody, statusCode);

      // 清理
      this.requestStartTime.delete(request);
    } catch (error) {
      // 确保异常过滤器本身的错误也被处理
      Logger.error('Exception filter failed:', error);
      this.logger.error({
        message: 'Exception filter internal error',
        prefix: 'FILTER_CRITICAL',
        metadata: {
          requestId,
          originalException: exception instanceof Error ? exception.message : String(exception),
          filterError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });

      const response = host.switchToHttp().getResponse<FastifyReply>();
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        data: null,
        requestId,
      });
    }
  }

  private getRequestDetails(request: FastifyRequest, requestId: string): RequestDetails {
    const startTime = this.requestStartTime.get(request) || Date.now();
    const responseTime = Date.now() - startTime;

    // 尝试从请求中提取用户信息
    const user = (request as any).user;
    const userId = user?.id || user?.userId || user?.sub;

    return {
      requestId,
      query: request.query || {},
      body: this.sanitizeData(request.body),
      params: request.params || {},
      method: request.method,
      url: request.url,
      path: (request as any).routeOptions?.url || request.url.split('?')[0],
      headers: this.sanitizeHeaders(request.headers),
      ip: getClientIp(request) || 'unknown',
      userAgent: (request.headers['user-agent'] as string) || 'unknown',
      referer: (request.headers['referer'] as string) || undefined,
      timestamp: dayjs().valueOf(),
      userId,
      responseTime,
    };
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    this.sensitiveHeaders.forEach((header) => {
      if (header in sanitized) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeData(data: any): Record<string, any> {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const sensitiveFields = ['password', 'token', 'secret'];
    const sanitized = JSON.parse(JSON.stringify(data));

    const redactSensitiveFields = (obj: any) => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          redactSensitiveFields(obj[key]);
        } else if (sensitiveFields.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        }
      }
    };

    redactSensitiveFields(sanitized);

    return sanitized;
  }

  private getErrorDetails(exception: unknown): {
    statusCode: number;
    errorMessage: string | string[];
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse() as HttpExceptionResponse;

      return {
        statusCode: exception.getStatus(),
        errorMessage: response.message || exception.message,
      };
    }

    // 处理非 HTTP 异常
    let errorMessage = 'Internal server error';

    if (exception instanceof Error) {
      errorMessage = exception.message;

      // 根据错误类型提供更具体的消息
      switch (exception.constructor.name) {
        case 'TypeError':
          errorMessage = `Type Error: ${exception.message}`;
          break;
        case 'ReferenceError':
          errorMessage = `Reference Error: ${exception.message}`;
          break;
        case 'SyntaxError':
          errorMessage = `Syntax Error: ${exception.message}`;
          break;
        case 'ValidationError':
          errorMessage = `Validation Error: ${exception.message}`;
          break;
        case 'UnauthorizedError':
          errorMessage = `Unauthorized: ${exception.message}`;
          break;
        case 'ForbiddenError':
          errorMessage = `Forbidden: ${exception.message}`;
          break;
      }
    } else if (typeof exception === 'string') {
      errorMessage = exception;
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorMessage,
    };
  }

  private createResponseBody(
    statusCode: number,
    message: string | string[],
    requestDetails: RequestDetails,
    requestId: string,
  ): ErrorResponse {
    return {
      code: statusCode,
      message,
      data: requestDetails,
      requestId,
    };
  }

  private buildErrorMetadata(
    exception: unknown,
    requestDetails: RequestDetails,
    statusCode: number,
  ): ErrorMetadata {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;

    // 提取错误堆栈并清理格式
    let stackTrace: string[] = [];

    if (exception instanceof Error && exception.stack) {
      stackTrace = exception.stack
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    // 判断是否为操作性错误（可预期的业务错误）
    const isOperational =
      exception instanceof HttpException && statusCode < HttpStatus.INTERNAL_SERVER_ERROR;

    // 构建错误链（如果存在）
    const errorChain: any[] = [];
    let currentError = exception;

    while (currentError instanceof Error) {
      errorChain.push({
        name: currentError.constructor.name,
        message: currentError.message,
        stack: currentError.stack?.split('\n').slice(0, 3), // 只保留前3行堆栈
      });

      currentError = (currentError as any).cause;
      if (!currentError || errorChain.length > 5) break; // 最多记录5层错误链
    }

    return {
      errorType: exception instanceof HttpException ? 'HttpException' : 'SystemError',
      errorClass: exception instanceof Error ? exception.constructor.name : typeof exception,
      statusCode,
      isOperational,
      stackTrace,
      errorChain: errorChain.length > 1 ? errorChain : undefined,
      requestContext: requestDetails,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: Math.round((usedMemory / totalMemory) * 100),
        },
      },
    };
  }

  private logError(
    exception: unknown,
    responseBody: ErrorResponse,
    errorMetadata: ErrorMetadata,
  ): void {
    const errorMessage = exception instanceof Error ? exception.message : 'Request failed';
    const prefix = errorMetadata.isOperational ? 'HTTP_EXCEPTION' : 'SYSTEM_ERROR';

    // 根据错误严重程度选择不同的日志级别
    const logLevel =
      errorMetadata.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR ? 'error' : 'warn';

    const logData = {
      message: errorMessage,
      prefix,
      metadata: {
        ...errorMetadata,
        response: {
          code: responseBody.code,
          message: responseBody.message,
        },
        // 额外的调试信息
        environment: readProcessEnv(SystemEnvEnum.NODE_ENV),
        timestamp: new Date().toISOString(),
      },
    };

    if (logLevel === 'error') {
      this.logger.error(logData.message, logData.prefix, logData.metadata);
    } else {
      this.logger.warn(logData.message, logData.prefix, logData.metadata);
    }
  }
}
