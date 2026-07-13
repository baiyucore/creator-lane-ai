import { Body, Controller, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';

@ApiTags('Agent')
@Controller('ai/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  async stream(
    @Body() dto: AgentStreamDto,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const abortController = new AbortController();

    request.raw.on('close', () => abortController.abort());
    openSeeReply(reply, request);

    try {
      await this.agentService.stream(
        dto,
        (event) => {
          writeSeeEvent(reply, event);
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
