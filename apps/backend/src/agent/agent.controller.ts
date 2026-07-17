import { Body, Controller, Req, Res, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';

import { SSE } from '@/core/decorator/sse.decorator';

import { AgentStreamDto } from './dto/agent-stream.dto';
import { AgentService } from './agent.service';
import { openSseReply, writeSseEvent } from './stream/sse';

@ApiTags('Agent')
@Controller('ai/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('stream')
  @HttpCode(200)
  @SSE()
  @ApiOperation({ summary: 'Stream agent response' })
  @ApiBody({ type: AgentStreamDto })
  async stream(
    @Body() dto: AgentStreamDto,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const abortController = new AbortController();

    request.raw.on('close', () => abortController.abort());
    openSseReply(reply, request);

    try {
      await this.agentService.stream(
        dto,
        (event) => {
          writeSseEvent(reply, event);
        },
        { signal: abortController.signal },
      );
    } catch (error) {
      writeSseEvent(reply, {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (!reply.raw.writableEnded && !reply.raw.destroyed) {
        reply.raw.end();
      }
    }
  }
}
