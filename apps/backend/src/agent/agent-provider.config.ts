import { readProcessEnv } from '@/utils/env';

export const SILICONFLOW_BASE_URL = 'https://api.deepseek.com';
export const DEFAULT_AGENT_MODEL = 'deepseek-v4-flash(1)';
export const DEFAULT_RECURSION_LIMIT = 80;
export const DEFAULT_TOOL_CALL_LIMIT = 24;

export const SUPPORTED_AGENT_MODEL_IDS = [
  'Pro/zai-org/GLM-5.1',
  'Pro/zai-org/GLM-5',
  'Pro/zai-org/GLM-4.7',
  'Pro/moonshotai/Kimi-K2.6',
  'Pro/moonshotai/Kimi-K2.5',
  'Pro/MiniMaxAI/MiniMax-M2.5',
  'MiniMaxAI/MiniMax-M2.5',
  'deepseek-ai/DeepSeek-V3.2',
  'deepseek-v4-flash(1)',
] as const;

export type SupportedAgentModelId = (typeof SUPPORTED_AGENT_MODEL_IDS)[number];

export interface AgentProviderConfig {
  apiKey: string;
  baseURL: string;
  model: SupportedAgentModelId;
}

// 解析 agent 提供者配置
export function resolveAgentProviderConfig(modelId?: string): AgentProviderConfig {
  return {
    apiKey: readAgentApiKey(),
    baseURL:
      readProcessEnv('SILICONFLOW_BASE_URL') ??
      readProcessEnv('OPENAI_BASE_URL') ??
      SILICONFLOW_BASE_URL,
    model: (modelId ??
      readProcessEnv('AGENT_MODEL') ??
      DEFAULT_AGENT_MODEL) as SupportedAgentModelId,
  };
}

function readAgentApiKey(): string {
  const value = readProcessEnv('SILICONFLOW_API_KEY') ?? readProcessEnv('OPENAI_API_KEY');

  if (value == null) {
    throw new Error('Environment variable SILICONFLOW_API_KEY is required');
  }

  return value;
}
