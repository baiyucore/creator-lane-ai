// 给 agent 提供 tools ， 用于处理 workspace （数据库） 的读写/搜索 操作的能力
import { WorksService } from '@/api/works/works.service';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { WorkspaceToolResult } from './types';
import { createUnifiedDiff, getDiffStats } from './unified-diff';
const MAX_TOOL_DIFF_CHARS = 80_000;

export interface WorkspaceDatabaseToolsContext {
  workspaceId: string;
  worksService: WorksService;
  dryRun: boolean;
}

export function createWorkspaceDatabaseTools(context: WorkspaceDatabaseToolsContext) {
  return [
    createListFilesTool(context),
    createReadFileTool(context),
    createSearchCodeTool(context),
    createReplaceInFileTool(context),
    createWriteFileTool(context),
    createGetDatabaseDiffTool(),
  ];
}

// 按照提供的目录路径，列出工作区中的所有文件
function createListFilesTool(context: WorkspaceDatabaseToolsContext) {
  return tool(
    async ({ directory = '.', maxResults = 120 }) => {
      const files = await context.worksService.listAgentFiles(
        context.workspaceId,
        directory,
        maxResults,
      );
      return stringifyToolResult({
        ok: true,
        tool: 'list_files',
        label: `Listed ${files.length} files under ${directory}`,
        path: directory,
        data: { files },
      });
    },
    {
      name: 'list_files',
      description: 'List files in current workspace from the database.',
      schema: z.object({
        directory: z.string().default('.').describe('Workspace-relative directory path.'),
        maxResults: z.number().int().min(1).max(500).default(120),
      }),
    },
  );
}

// 读取文件内容，并返回指定行范围内的文本
function createReadFileTool(context: WorkspaceDatabaseToolsContext) {
  return tool(
    async ({ path: filePath, startLine = 1, endLine, maxLines = 240 }) => {
      const { text } = await context.worksService.readAgentFileTextByPath(
        context.workspaceId,
        filePath,
      );
      const lines = text.split('\n');
      const safeStartLine = Math.max(1, startLine);
      const safeEndLine = Math.min(lines.length, endLine ?? safeStartLine + maxLines - 1);
      const selected = lines
        .slice(safeStartLine - 1, safeEndLine)
        .map((line, index) => `${safeStartLine + index}: ${line}`)
        .join('\n');
      return stringifyToolResult({
        ok: true,
        tool: 'read_file',
        label: `Read ${filePath} L${safeStartLine}-L${safeEndLine}`,
        path: filePath,
        data: {
          content: selected,
          startLine: safeStartLine,
          lineCount: lines.length,
          endLine: safeEndLine,
        },
      });
    },
    {
      name: 'read_file',
      description: 'Read a file from workspace database and return text with line numbers.',
      schema: z.object({
        path: z.string().describe('Workspace-relative file path.'),
        startLine: z.number().int().min(1).default(1),
        endLine: z.number().int().min(1).optional(),
        maxLines: z.number().int().min(1).max(600).default(240),
      }),
    },
  );
}

// 搜索工作区中的代码文件，并返回匹配的行
// TODO: 需要去看一下 glob 的用法
function createSearchCodeTool(context: WorkspaceDatabaseToolsContext) {
  return tool(
    async ({ pattern, directory = '.', maxResults = 80 }) => {
      const matches = await context.worksService.searchAgentFiles(
        context.workspaceId,
        pattern,
        directory,
        maxResults,
      );
      return stringifyToolResult({
        ok: true,
        tool: 'search_code',
        label: `Searched ${pattern} in ${directory}`,
        path: directory,
        data: {
          matches,
          truncated: matches.length >= maxResults,
        },
      });
    },
    {
      name: 'search_code',
      description: 'Search content inside workspace database files.',
      schema: z.object({
        pattern: z.string().describe('Regex pattern.'),
        directory: z.string().default('.'),
        glob: z.array(z.string()).default([]).describe('Reserved; ignored for db mode.'),
        maxResults: z.number().int().min(1).max(300).default(80),
      }),
    },
  );
}

// 替换文件中的文本，并返回差异统计
// TODO 要搞清楚 worksServeice 里面针对 replaceAgentFileTextByPath 的处理
function createReplaceInFileTool(context: WorkspaceDatabaseToolsContext) {
  return tool(
    async ({ path: filePath, oldString, newString, expectedOccurrences }) => {
      const result = await context.worksService.replaceAgentFileTextByPath(
        context.workspaceId,
        filePath,
        oldString,
        newString,
        expectedOccurrences,
        context.dryRun,
      );
      const diff = truncateDiff(createUnifiedDiff(filePath, result.previousText, result.nextText));
      const stats = getDiffStats(diff);
      return stringifyToolResult({
        ok: true,
        tool: 'replace_in_file',
        label: `${context.dryRun ? 'Prepared' : 'Edited'} ${filePath}`,
        path: filePath,
        operation: 'replace',
        dryRun: context.dryRun,
        diff,
        additions: stats.additions,
        deletions: stats.deletions,
      });
    },
    {
      name: 'replace_in_file',
      description:
        'Replace exact text in a workspace database file. Returns unified diff and writes unless dryRun.',
      schema: z.object({
        path: z.string().describe('Workspace-relative file path.'),
        oldString: z.string().describe('Exact text to replace.'),
        newString: z.string().describe('Replacement text.'),
        expectedOccurrences: z.number().int().min(1).optional(),
      }),
    },
  );
}

// 创建或覆盖文件，并返回差异统计
function createWriteFileTool(context: WorkspaceDatabaseToolsContext) {
  return tool(
    async ({ path: filePath, content }) => {
      const result = await context.worksService.writeAgentFileTextByPath(
        context.workspaceId,
        filePath,
        content,
        context.dryRun,
      );
      const diff = truncateDiff(createUnifiedDiff(filePath, result.previousText, result.nextText));
      const stats = getDiffStats(diff);
      return stringifyToolResult({
        ok: true,
        tool: 'write_file',
        label: `${context.dryRun ? 'Prepared' : 'Written'} ${filePath}`,
        path: filePath,
        operation: result.created ? 'create' : 'overwrite',
        dryRun: context.dryRun,
        diff,
        additions: stats.additions,
        deletions: stats.deletions,
      });
    },
    {
      name: 'write_file',
      description:
        'Create or overwrite a workspace database file. Returns unified diff and writes unless dryRun.',
      schema: z.object({
        path: z.string().describe('Workspace-relative file path.'),
        content: z.string().describe('Complete file content.'),
      }),
    },
  );
}

// 获取工作区数据库的差异
function createGetDatabaseDiffTool() {
  return tool(
    async ({ path }) => {
      return stringifyToolResult({
        ok: true,
        tool: 'get_git_diff',
        label: path ? `Diff unavailable for ${path}` : 'Diff unavailable in database mode',
        path,
        operation: 'diff',
        data: {
          info: 'Current workspace is database-backed. Use read_file or write tools for latest content.',
        },
      });
    },
    {
      name: 'get_database_diff',
      description: 'Return a note when workspace is database-backed (no git diff available).',
      schema: z.object({
        path: z.string().optional().describe('Optional workspace-relative path.'),
      }),
    },
  );
}

function stringifyToolResult(result: WorkspaceToolResult): string {
  return JSON.stringify(result);
}

// 截断 diff ，使其不超过 MAX_TOOL_DIFF_CHARS 字符
function truncateDiff(diff: string): string {
  if (diff.length <= MAX_TOOL_DIFF_CHARS) {
    return diff;
  }
  return `${diff.slice(0, MAX_TOOL_DIFF_CHARS)}\n...diff truncated...`;
}
