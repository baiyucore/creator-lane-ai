import { NestInterceptor, ExecutionContext, CallHandler, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SSE_METADATA_KEY } from '../decorator/sse.decorator';
import { ResponseDto } from '../../common/dto/response.dto';
import { STATUS_CODES } from 'node:http';
import dayjs from 'dayjs';
/** Nest 用于读取 @HttpCode() 的 metadata key */
const HTTP_CODE_METADATA = 'HTTP_CODE_METADATA';

/** 不包装为 ResponseDto、直接返回原始数据的路径 */
const SKIP_PATHS = ['/metrics', '/health', '/favicon.ico', '/api-docs'];

/**
 * 统一响应格式拦截器
 *
 * 将控制器返回值包装为 { code, message, data, timestamp }。
 * SSE、健康检查、文档等路径不包装，直接返回原始数据。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseDto<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseDto<T> | T> {
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    return next.handle().pipe(
      map((data) => {
        const isSSE = this.reflector.get(SSE_METADATA_KEY, context.getHandler());
        if (this.shouldSkipTransform(request.url) || isSSE) {
          return data;
        }
        return this.transformResponse(data, request, response, context) as ResponseDto<T>;
      }),
    );
  }
  /**
   * 判断是否跳过转换
   * @param url - 请求 URL
   * @returns 是否跳过转换
   */
  private shouldSkipTransform(url: string): boolean {
    const lower = url?.toLowerCase() ?? '';
    return SKIP_PATHS.some((path) => lower.includes(path.toLowerCase()));
  }
  private transformResponse(
    data: unknown,
    request: FastifyRequest,
    response: FastifyReply,
    context: ExecutionContext,
  ): ResponseDto<T> {
    let statusCode = response.statusCode ?? 200;
    const explicitCode = this.reflector.get<number | undefined>(
      HTTP_CODE_METADATA,
      context.getHandler(),
    );
    if (explicitCode == null && request.method === 'POST' && statusCode === 201) {
      statusCode = 200;
    }
    //用 Node 内置 STATUS_CODES 映射，如 200 → "OK
    const defaultMessage =
      (STATUS_CODES as Record<string, string>)[String(statusCode)] ?? 'Unknown';

    response.status(statusCode);

    const responseData = this.extractResponseData(data);
    const responseMessage = this.extractResponseMessage(data, defaultMessage);

    return {
      code: statusCode,
      message: responseMessage,
      data: responseData ?? undefined,
      timestamp: dayjs().valueOf(),
    };
  }
  /**
   * 提取响应数据，支持 data 字段或 message、code 字段 普通对象则直接返回
   * @param data - 响应数据
   * @returns 响应数据
   */
  private extractResponseData(data: unknown): T | null | undefined {
    if (data == null || typeof data !== 'object') {
      return null;
    }
    const obj = data as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(obj, 'data')) {
      return obj.data as T;
    }
    const keys = Object.keys(obj);
    const onlyMessageAndCode = keys.every((k) => k === 'message' || k === 'code');

    if (onlyMessageAndCode) {
      return null;
    }

    if ('message' in obj || 'code' in obj) {
      const { message, code, ...rest } = obj;

      void message;
      void code;

      return Object.keys(rest).length === 0 ? null : (rest as T);
    }

    return data as T;
  }
  /**
   * 提取响应消息，支持 message 字段或默认消息
   * @param data - 响应数据
   * @param defaultMessage - 默认消息
   * @returns 响应消息
   */
  private extractResponseMessage(data: unknown, defaultMessage: string): string {
    if (data != null && typeof data === 'object' && 'message' in (data as object)) {
      const msg = (data as Record<string, unknown>).message;

      return typeof msg === 'string' ? msg : defaultMessage;
    }

    return defaultMessage;
  }
}
