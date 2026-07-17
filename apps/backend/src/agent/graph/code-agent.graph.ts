import { WorksService } from '@/api/works/works.service';
import { createWorkspaceDatabaseTools, createWorkspaceTools } from '../tools';
import { createMcpToolRegistry } from '../mcp/mcp-tool-registry';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage } from '@langchain/core/messages';
import { buildCodingAgentSystemPrompt } from '../skills/coding-agent.skill';
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { AIMessage, BaseMessage } from '@langchain/core/messages';

export interface CodeAgentGraphOptions {
  apiKey: string; //  API 密钥
  baseURL?: string; //  base URL
  model: string; //  模型
  workspaceRoot: string; // 工作区根目录
  workspaceContext: string; // 工作区上下文
  workspaceId?: string; // 工作区 ID
  worksService?: WorksService; // 工作区服务
  dryRun: boolean; // 是否为 dry run
}
const CONTINUE_NUDGE_MARKER = '[agent_continue_nudge]';
const CODE_CHANGE_REQUEST_PATTERN =
  /(优化|实现|修复|修改|改造|调整|重构|完善|补齐|接入|彻底|fix|implement|update|refactor|optimi[sz]e)/i;

export function createCodeAgentGraph(options: CodeAgentGraphOptions) {
  const workspaceTools =
    options.workspaceId && options.worksService
      ? createWorkspaceDatabaseTools({
          workspaceId: options.workspaceId,
          worksService: options.worksService,
          dryRun: options.dryRun,
        })
      : createWorkspaceTools({
          workspaceRoot: options.workspaceRoot,
          dryRun: options.dryRun,
        });
  const mcpToolRegistry =
    options.worksService && options.workspaceId
      ? createMcpToolRegistry({
          workspaceRoot: options.workspaceRoot,
        })
      : [];

  const tools = [...workspaceTools, ...mcpToolRegistry];
  // const availableToolNames = new Set(tools.map((item) => item.name));
  const llmOptions = {
    apiKey: options.apiKey,
    configuration: options.baseURL ? { baseURL: options.baseURL } : undefined,
    model: options.model,
    streaming: true,
  };
  // 工具调用LLM
  const toolCallingLlm = new ChatOpenAI(llmOptions).bindTools(tools, { tool_choice: 'auto' });
  // 最终LLM
  // const finalLlm = new ChatOpenAI(llmOptions)
  const systemPromptText = buildCodingAgentSystemPrompt({
    workspaceRoot: options.workspaceRoot,
    dryRun: options.dryRun,
    workspaceContext: options.workspaceContext,
  });
  const systemPrompt = new SystemMessage(systemPromptText);
  // const finalSystemPrompt = new SystemMessage(
  //   [
  //     systemPromptText,
  //     '',
  //     '本轮已经多次达到探索预算或需要收束。现在不要再调用工具，必须基于已有上下文直接给用户一个清晰结论。',
  //     '如果用户要求修改但还没有完成，请明确说明未完成的原因、已经查看了什么、还缺什么，以及建议用户下一步怎么做。',
  //   ].join('\n'),
  // );
  // graph 步骤 1. 判断最近一次提问的问题是什么类型，让 agent 固定返回设置的句式
  const plan = async (state: typeof MessagesAnnotation.State) => {
    return {
      messages: [new AIMessage(buildPlanMessage(state.messages))],
    };
  };

  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const response = await toolCallingLlm.invoke([systemPrompt, ...state.messages]);
    return {
      messages: [response],
    };
  };
  const graph = new StateGraph(MessagesAnnotation);
  graph.addNode('plan', plan);
  graph.addNode('callModel', callModel);
  // graph.addEdge(START, 'plan');
  // graph.addEdge('plan', 'callModel');
  // graph.addEdge('callModel', END);

  return {
    tools: [...workspaceTools, ...mcpToolRegistry],
  };
}

// 固定开场白，
function buildPlanMessage(messages: BaseMessage[]): string {
  const request = [...messages]
    .reverse()
    .find((message) => getMessageType(message) === 'human' && !isInternalContinueMessage(message));

  const content = toTextContent(request?.content ?? '');
  if (CODE_CHANGE_REQUEST_PATTERN.test(content)) {
    return '我先探索当前页面的关键文件和组件结构，确认布局、AI 面板与交互状态的实现，再按现有代码风格做针对性修改。';
  }

  return '我先快速理解你的问题和当前上下文，必要时会查看相关文件，再给出清晰结论或继续执行。';
}

// 获取消息类型
function getMessageType(message: BaseMessage): string | undefined {
  const candidate = message as { _getType?: () => string; type?: string };

  return typeof candidate._getType === 'function' ? candidate._getType() : candidate.type;
}

// 是否为内部继续消息  (不能是系统自己塞进去的「继续执行」提示)
function isInternalContinueMessage(message: BaseMessage): boolean {
  return toTextContent(message.content).includes(CONTINUE_NUDGE_MARKER);
}

// 转换为文本内容
function toTextContent(content: BaseMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      return isRecord(item) && typeof item.text === 'string' ? item.text : '';
    })
    .join('');
}
// 是否为记录类型
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
