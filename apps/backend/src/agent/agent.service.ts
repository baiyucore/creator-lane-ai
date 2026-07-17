import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { WorksService } from '@/api/works/works.service';

import { DEFAULT_RECURSION_LIMIT, resolveAgentProviderConfig } from './agent-provider.config';
import { AgentStreamDto } from './dto/agent-stream.dto';
import { createCodeAgentGraph } from './graph/code-agent.graph';
import { buildAgentWorkspaceContext } from './rag';
import { AgentStreamEmit } from './stream/agent-stream-event';
import { resolveWorkspaceRoot } from './tools/workspace-path';

export interface AgentRunOptions {
  signal?: AbortSignal;
}

@Injectable()
export class AgentService {
  constructor(private readonly worksService: WorksService) {}

  async stream(
    dto: AgentStreamDto,
    emit: AgentStreamEmit,
    options: AgentRunOptions = {},
  ): Promise<void> {
    const startedAt = Date.now();
    const runId = randomUUID();
    const workspaceRoot = resolveWorkspaceRoot(dto.workspaceRoot);
    const provider = resolveAgentProviderConfig(dto.model);
    const dryRun = dto.dryRun ?? false;
    const recursionLimit = dto.recursionLimit ?? DEFAULT_RECURSION_LIMIT;

    const workspaceContextBase = dto.workspaceId
      ? await this.worksService.buildAgentWorkspaceContext(dto.workspaceId)
      : await buildAgentWorkspaceContext(workspaceRoot);

    const workspaceContext = dto.activeFilePath
      ? `${workspaceContextBase}\n\n当前用户正在编辑文件：${dto.activeFilePath}`
      : workspaceContextBase;

    if (options.signal?.aborted) {
      throw new Error('Agent stream aborted');
    }

    const { tools } = createCodeAgentGraph({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      model: provider.model,
      workspaceRoot,
      workspaceContext,
      workspaceId: dto.workspaceId,
      worksService: this.worksService,
      dryRun,
    });

    await emit({
      type: 'run_started',
      runId,
      model: provider.model,
      workspaceRoot,
      dryRun,
      tools: tools.map((tool) => tool.name),
    });

    // Graph invoke/stream wiring still pending; keep recursionLimit ready for that step.
    if (recursionLimit < 2) {
      throw new Error(`Invalid recursionLimit: ${recursionLimit}`);
    }

    await emit({
      type: 'run_completed',
      runId,
      elapsedMs: Date.now() - startedAt,
    });
  }
}
