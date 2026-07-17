export interface WorkspaceToolContext {
  workspaceRoot: string;
  dryRun: boolean;
}

export interface WorkspaceToolResult {
  ok: boolean;
  tool: string;
  label: string;
  path?: string;
  operation?: string;
  dryRun?: boolean;
  diff?: string;
  additions?: number;
  deletions?: number;
  data?: unknown;
  error?: string;
}
