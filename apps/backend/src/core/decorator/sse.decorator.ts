import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiProduces, ApiResponse } from '@nestjs/swagger';

export const SSE_METADATA_KEY = 'sse';

export interface SSEOptions {
  cors?: boolean;
  headers?: Record<string, string>;
}

/**
 * SSE 装饰器
 *
 * 用于标记控制器方法为 SSE 流式响应
 *
 * @param options - SSE 选项
 * @returns 装饰器
 */
export function SSE(options: SSEOptions = {}) {
  const { cors = true, headers = {} } = options;

  return applyDecorators(
    SetMetadata(SSE_METADATA_KEY, { cors, headers }),
    ApiProduces('text/event-stream'),
    ApiResponse({
      status: 200,
      description: 'Server-Sent Events stream',
      headers: {
        'Content-Type': {
          description: 'Event stream content type',
          schema: { type: 'string', example: 'text/event-stream' },
        },
        'Cache-Control': {
          description: 'Disable caching',
          schema: { type: 'string', example: 'no-cache' },
        },
        Connection: {
          description: 'Keep connection alive',
          schema: { type: 'string', example: 'keep-alive' },
        },
      },
    }),
  );
}
