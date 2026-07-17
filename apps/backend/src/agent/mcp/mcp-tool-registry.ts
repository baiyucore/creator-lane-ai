import { StructuredToolInterface } from '@langchain/core/tools';

export interface McpToolRegistryOptions {
  workspaceRoot: string;
}

export function createMcpToolRegistry(options: McpToolRegistryOptions): StructuredToolInterface[] {
  void options;
  return [];
}
