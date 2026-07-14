import { FastifyReply, FastifyRequest } from 'fastify';
import { AgentStreamEvent } from './agent-stream-event';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

type RequestWithCorsHeaders = FastifyRequest & {
  corsHeaders: Record<string, string>;
};

// 打开SSE，自行处理响应头部
export function openSseReply(reply: FastifyReply, request: FastifyRequest): void {
  reply.hijack();
  reply.raw.writeHead(200, {
    ...SSE_HEADERS,
    ...resolveCoresHeaders(request),
  });
  reply.raw.flushHeaders?.();
}

export function writeSseEvent(reply: FastifyReply, event: AgentStreamEvent): boolean {
  if (reply.raw.writableEnded || reply.raw.destroyed) {
    return false;
  }

  return reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

// 处理跨域请求的头部
export function resolveCoresHeaders(request: FastifyRequest): Record<string, string> {
  const corsHeaders = (request as RequestWithCorsHeaders).corsHeaders;

  if (corsHeaders) {
    return {
      ...corsHeaders,
      Vary: 'Origin',
    };
  }
  return {};
}
