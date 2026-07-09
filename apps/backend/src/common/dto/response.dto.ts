import { ApiProperty } from '@nestjs/swagger';
import dayjs from 'dayjs';

export class ResponseDto<T> {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  code?: number;

  @ApiProperty({
    example: 'Created',
    description: 'Message describing the result of the operation',
  })
  message?: string;

  @ApiProperty({ description: 'The data returned by the API', nullable: true })
  data?: T;

  @ApiProperty({
    example: dayjs().valueOf(),
    description: 'Current timestamp',
  })
  timestamp?: number;
}

/**
 * 控制器 async 方法的返回类型，等价于 Promise<ResponseDto<T>>。
 * 直接用作方法返回类型即可，无需再写 Promise 包裹。
 * @example
 * async createKnowledge(...): ApiResponseDto<Knowledge> {
 *   return this.aiService.createKnowledge(body, req.user.id);
 * }
 */
export type ApiResponseDto<T = unknown> = Promise<ResponseDto<T>>;
/**
 * 请求详情DTO，包含请求的查询参数、请求体、路由参数、请求头、请求方法、请求URL、请求时间、请求IP
 * @example
 * async login(...): ApiResponseDto<User> {
 *   return this.authService.login(body);
 * }
 */
export class RequestDetailsDto {
  @ApiProperty({
    description: 'Query parameters',
    type: 'object',
    additionalProperties: true,
  })
  query!: Record<string, any>;

  @ApiProperty({
    description: 'Request body',
    type: 'object',
    additionalProperties: true,
  })
  body!: Record<string, any>;

  @ApiProperty({
    description: 'Route parameters',
    type: 'object',
    additionalProperties: true,
  })
  params!: Record<string, any>;

  @ApiProperty({
    description: 'Request headers',
    type: 'object',
    additionalProperties: true,
    example: {
      'user-agent': 'Mozilla/5.0',
      'accept-language': 'en-US',
      'content-type': 'application/json',
    },
  })
  headers!: Record<string, any>;

  @ApiProperty({
    example: 'POST',
    description: 'HTTP method',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  })
  method!: string;

  @ApiProperty({
    example: '/api/v1/auth/login/email-code',
    description: 'Request URL',
  })
  url!: string;

  @ApiProperty({
    example: dayjs().valueOf(),
    description: 'Request timestamp',
    type: 'number',
  })
  timestamp!: number;

  @ApiProperty({
    example: '::1',
    description: 'Client IP address',
    format: 'ipv4',
  })
  ip!: string;
}
/**
 * 错误响应DTO，包含错误信息和请求详情
 * @example
 * async login(...): ApiResponseDto<User> {
 *   return this.authService.login(body);
 * }
 */
export class ErrorResponseDto<T = RequestDetailsDto> {
  @ApiProperty({
    example: 401,
    description: 'HTTP status code',
  })
  code!: number;

  @ApiProperty({
    example: '验证码无效。',
    description: 'Error message describing the result of the operation',
  })
  message!: string;

  @ApiProperty({
    type: 'number',
    example: dayjs().valueOf(),
    description: 'Timestamp when the error occurred',
  })
  timestamp!: number;

  @ApiProperty({
    type: RequestDetailsDto,
    description: 'Details of the request that caused the error',
    required: false,
  })
  data?: T;
}
