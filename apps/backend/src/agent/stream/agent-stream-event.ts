export type AgentStreamEvent =
  | {
      type: 'run_started';
      runId: string;
      model: string;
      workspaceRoot: string;
      dryRun: boolean;
      tools: string[];
    }
  | {
      type: 'token';
      content: string;
      node?: string;
    }
  | {
      type: 'tool_call_delta';
      chunks: unknown[];
      node?: string;
    }
  | {
      type: 'tool_call';
      id?: string;
      name: string;
      args?: unknown;
    }
  | {
      type: 'tool_result';
      tool?: string;
      toolCallId?: string;
      ok?: boolean;
      label?: string;
      data?: unknown;
    }
  | {
      type: 'diff';
      path: string;
      operation: string;
      dryRun: boolean;
      diff: string;
      additions: number;
      deletions: number;
    }
  | {
      type: 'assistant_message';
      content: string;
      node?: string;
    }
  | {
      type: 'error';
      message: string;
      code?: string;
    }
  | {
      type: 'run_completed';
      runId: string;
      elapsedMs: number;
    };

export type AgentStreamEmit = (event: AgentStreamEvent) => void | Promise<void>;
