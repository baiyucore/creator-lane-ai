// import { Injectable } from '@nestjs/common';
// import { WorksService } from '@/api/works/works.service';
// import { AgentStreamDto } from './dto/agent-stream.dto';
// import { AgentStreamEmit } from './stream/agent-stream-event';
// import { randomUUID } from 'crypto';
// import { resolveWorkspaceRoot } from './tools/workspace-path';
// import { DEFAULT_RECURSION_LIMIT, resolveAgentProviderConfig } from './agent-provider.config';
// import { buildAgentWorkspaceContext } from './rag';

// export interface AgentRunOptions {
//   signal?: AbortSignal;
// }

// @Injectable()
// export class AgentService {
//   constructor(private readonly worksservice: WorksService){}

//   async stream(dto: AgentStreamDto, emit: AgentStreamEmit,options: AgentRunOptions = {}){
//     const startedAt = Date.now();
//     const runId = randomUUID();
//     const workspaceRoot = resolveWorkspaceRoot(dto.workspaceRoot); // 解析工作区根目录
//     const proivder = resolveAgentProviderConfig(dto.model); // 解析 agent 提供者配置
//     const workspaceContext = dto.workspaceId ? await this.worksservice.buildAgentWorkspaceContext(dto.workspaceId) : await buildAgentWorkspaceContext(workspaceRoot); // 获取工作区上下文

//   }
// }
