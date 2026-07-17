import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { WorkspaceToolContext, WorkspaceToolResult } from './types';
import { createUnifiedDiff, getDiffStats } from './unified-diff';
import { assertWritableWorkspacePath, resolveWorkspacePath, toPosixPath } from './workspace-path';

const execFileAsync = promisify(execFile); // 异步执行命令
const MAX_FILE_CHARS = 240_000;
const MAX_TOOL_DIFF_CHARS = 80_000;
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
  'out',
]);

export function createWorkspaceTools(context: WorkspaceToolContext) {
  return [
    createListFilesTool(context),
    createReadFileTool(context),
    createSearchCodeTool(context),
    createReplaceInFileTool(context),
    createWriteFileTool(context),
    createGetGitDiffTool(context),
  ];
}

// 列出工作区中的所有文件
function createListFilesTool(context: WorkspaceToolContext) {
  return tool(
    async ({ directory = '.', maxResults = 120 }) => {
      const workspacePath = resolveWorkspacePath(context.workspaceRoot, directory);
      const directoryStat = await stat(workspacePath.absolutePath);

      if (!directoryStat.isDirectory()) {
        return stringifyToolResult({
          ok: false,
          tool: 'list_files',
          label: `List failed ${workspacePath.relativePath}`,
          path: workspacePath.relativePath,
          error: 'Target is not a directory.',
        });
      }
      const files = await listFiles(workspacePath.absolutePath, context.workspaceRoot, maxResults);
      return stringifyToolResult({
        ok: true,
        tool: 'list_files',
        label: `Listed ${files.length} files under ${workspacePath.relativePath}`,
        path: workspacePath.relativePath,
        data: { files },
      });
    },
    {
      name: 'list_files',
      description: 'List files in the workspace. Use this before reading unknown areas.',
      schema: z.object({
        directory: z.string().default('.').describe('Workspace-relative directory to inspect.'),
        maxResults: z.number().int().min(1).max(500).default(120),
      }),
    },
  );
}

// 读取文本文件，并返回文件内容
function createReadFileTool(context: WorkspaceToolContext) {
  return tool(
    async ({ path: filePath, startLine = 1, endLine, maxLines = 240 }) => {
      const workspacePath = resolveWorkspacePath(context.workspaceRoot, filePath);
      const content = await readTextFile(workspacePath.absolutePath);
      const lines = content.split('\n');
      const safeStartLine = Math.max(1, startLine);
      const safeEndLine = Math.min(lines.length, endLine ?? safeStartLine + maxLines - 1);
      const selected = lines
        .slice(safeStartLine - 1, safeEndLine)
        .map((line, index) => `${safeStartLine + index}: ${line}`)
        .join('\n');

      return stringifyToolResult({
        ok: true,
        tool: 'read_file',
        label: `Read ${workspacePath.relativePath} L${safeStartLine}-L${safeEndLine}`,
        path: workspacePath.relativePath,
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
      description: 'Read a UTF-8 text file from the workspace with line numbers.',
      schema: z.object({
        path: z.string().describe('Workspace-relative file path.'),
        startLine: z.number().int().min(1).default(1),
        endLine: z.number().int().min(1).optional(),
        maxLines: z.number().int().min(1).max(600).default(240),
      }),
    },
  );
}

// 搜索工作区中的代码，并返回文件:行:列匹配 （ 使用 ripgrep 搜索）
function createSearchCodeTool(context: WorkspaceToolContext) {
  return tool(
    async ({ pattern, directory = '.', glob = [], maxResults = 80 }) => {
      const workspacePath = resolveWorkspacePath(context.workspaceRoot, directory);
      const args = [
        '--line-number',
        '--column',
        '--no-heading',
        '--color',
        'never',
        '--hidden',
        '--glob',
        '!**/.git/**',
        '--glob',
        '!**/node_modules/**',
        '--glob',
        '!**/dist/**',
        '--glob',
        '!**/.next/**',
      ];

      for (const item of glob) {
        args.push('--glob', item);
      }

      args.push(pattern, workspacePath.relativePath === '.' ? '.' : workspacePath.relativePath);

      const output = await runCommand('rg', args, context.workspaceRoot);
      const matches = output.split('\n').filter(Boolean).slice(0, maxResults);

      return stringifyToolResult({
        ok: true,
        tool: 'search_code',
        label: `Searched ${pattern} in ${workspacePath.relativePath}`,
        path: workspacePath.relativePath,
        data: {
          matches,
          truncated: matches.length >= maxResults,
        },
      });
    },
    {
      name: 'search_code',
      description: 'Search the workspace with ripgrep and return file:line:column matches.',
      schema: z.object({
        pattern: z.string().describe('Ripgrep regex pattern.'),
        directory: z.string().default('.'),
        glob: z.array(z.string()).default([]).describe('Optional rg --glob filters.'),
        maxResults: z.number().int().min(1).max(300).default(80),
      }),
    },
  );
}

// 替换文件中的文本，并返回替换后的文件内容
// TODO: 这里的 assertWritableWorkspacePath 以及 resolveWorkspacePath
function createReplaceInFileTool(context: WorkspaceToolContext) {
  return tool(
    async ({ path: filePath, oldString, newString, expectedOccurrences }) => {
      if (oldString.length === 0) {
        return stringifyToolResult({
          ok: false,
          tool: 'replace_in_file',
          label: 'Replace failed',
          error: 'oldString must not be empty.',
        });
      }
      const workspacePath = resolveWorkspacePath(context.workspaceRoot, filePath);
      assertWritableWorkspacePath(workspacePath);

      const before = await readTextFile(workspacePath.absolutePath);
      const occurrences = before.split(oldString).length - 1;
      if (occurrences === 0) {
        return stringifyToolResult({
          ok: false,
          tool: 'replace_in_file',
          label: `Replace failed ${workspacePath.relativePath}`,
          path: workspacePath.relativePath,
          error: 'oldString was not found in the file.',
        });
      }
      if (expectedOccurrences != null && occurrences !== expectedOccurrences) {
        return stringifyToolResult({
          ok: false,
          tool: 'replace_in_file',
          label: `Replace refused ${workspacePath.relativePath}`,
          path: workspacePath.relativePath,
          error: `Expected ${expectedOccurrences} occurrences, found ${occurrences}.`,
        });
      }
      const after = before.replace(oldString, newString);
      const diff = truncateDiff(createUnifiedDiff(workspacePath.relativePath, before, after));
      const stats = getDiffStats(diff);
      if (!context.dryRun) {
        await writeFile(workspacePath.absolutePath, after, 'utf-8');
      }

      return stringifyToolResult({
        ok: true,
        tool: 'replace_in_file',
        label: `${context.dryRun ? 'Prepared' : 'Edited'} ${workspacePath.relativePath}`,
        path: workspacePath.relativePath,
        operation: 'replace',
        dryRun: context.dryRun,
        diff,
        additions: stats.additions,
        deletions: stats.deletions,
        data: { occurrences },
      });
    },
    {
      name: 'replace_in_file',
      description:
        'Replace exact text in an existing file. Returns a unified diff and writes unless dryRun is true.',
      schema: z.object({
        path: z.string().describe('Workspace-relative file path.'),
        oldString: z.string().describe('Exact text to replace.'),
        newString: z.string().describe('Replacement text.'),
        expectedOccurrences: z.number().int().min(1).optional(),
      }),
    },
  );
}

// 创建或覆盖文件，并返回差异
function createWriteFileTool(context: WorkspaceToolContext) {
  return tool(
    async ({ path: filePath, content }) => {
      const workspacePath = resolveWorkspacePath(context.workspaceRoot, filePath);
      assertWritableWorkspacePath(workspacePath);

      const before = await readTextFile(workspacePath.absolutePath).catch(() => '');
      const diff = truncateDiff(createUnifiedDiff(workspacePath.relativePath, before, content));
      const stats = getDiffStats(diff);
      if (!context.dryRun) {
        await mkdir(path.dirname(workspacePath.absolutePath), { recursive: true });
        await writeFile(workspacePath.absolutePath, content, 'utf-8');
      }
      return stringifyToolResult({
        ok: true,
        tool: 'write_file',
        label: `${context.dryRun ? 'Prepared' : 'Wrote'} ${workspacePath.relativePath}`,
        path: workspacePath.relativePath,
        operation: before.length > 0 ? 'overwrite' : 'create',
        dryRun: context.dryRun,
        diff,
        additions: stats.additions,
        deletions: stats.deletions,
      });
    },
    {
      name: 'write_file',
      description:
        'Create or overwrite a UTF-8 file. Prefer replace_in_file for small targeted edits. Returns a unified diff.',
      schema: z.object({
        path: z.string().describe('Workspace-relative file path.'),
        content: z.string().describe('Complete file content.'),
      }),
    },
  );
}

// 获取git差异
function createGetGitDiffTool(context: WorkspaceToolContext) {
  return tool(
    async ({ path: filePath }) => {
      const args = ['diff', '--no-color', '--'];

      if (filePath != null && filePath.trim().length > 0) {
        const workspacePath = resolveWorkspacePath(context.workspaceRoot, filePath);
        args.push(workspacePath.relativePath);
      }

      const diff = await runCommand('git', args, context.workspaceRoot);
      const stats = getDiffStats(diff);
      return stringifyToolResult({
        ok: true,
        tool: 'get_git_diff',
        label: filePath ? `Diffed ${filePath}` : 'Diffed workspace',
        path: filePath,
        operation: 'diff',
        diff: truncateDiff(diff),
        additions: stats.additions,
        deletions: stats.deletions,
      });
    },
    {
      name: 'get_git_diff',
      description: 'Return current git diff for a file or the workspace.',
      schema: z.object({
        path: z.string().optional().describe('Optional workspace-relative path.'),
      }),
    },
  );
}

// 递归遍历目录，并返回所有文件的相对路径
async function listFiles(
  directory: string,
  workspaceRoot: string,
  maxResults: number,
): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string): Promise<void> {
    if (results.length >= maxResults) {
      return;
    }
    const entries = (await readdir(current, { withFileTypes: true })).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      if (results.length >= maxResults || IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      const absolutePath = path.join(current, entry.name);
      const relativePath = toPosixPath(path.relative(workspaceRoot, absolutePath));
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile()) {
        results.push(relativePath);
      }
    }
  }
  await walk(directory);
  return results;
}

// 读取文本文件，并返回文件内容 （ 读取图片，视频的是 会出现 \0 字符）
async function readTextFile(absolutePath: string): Promise<string> {
  const content = await readFile(absolutePath, 'utf-8');
  if (content.includes('\0')) {
    throw new Error('File contains null bytes.');
  }
  if (content.length > MAX_FILE_CHARS) {
    return content.slice(0, MAX_FILE_CHARS);
  }
  return content;
}

// 运行命令，并返回输出
async function runCommand(command: string, args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd,
      maxBuffer: 1024 * 1024 * 2,
      timeout: 10_000,
    });
    return stdout;
  } catch (error) {
    const commandError = error as { code?: number | string; stdout?: string; message?: string };

    if (command === 'rg' && commandError.code === 1) {
      return commandError.stdout ?? '';
    }

    if (command === 'git' && commandError.code === 1) {
      return commandError.stdout ?? '';
    }

    throw new Error(commandError.message ?? `${command} failed`);
  }
}

// 将工具结果转换为字符串
function stringifyToolResult(result: WorkspaceToolResult): string {
  return JSON.stringify(result);
}

// 截断差异，并返回差异内容
function truncateDiff(diff: string): string {
  if (diff.length <= MAX_TOOL_DIFF_CHARS) {
    return diff;
  }
  return `${diff.slice(0, MAX_TOOL_DIFF_CHARS)}\n... diff truncated ...`;
}
