import { readFile } from 'node:fs/promises';
import path from 'node:path';

const CONTEXT_FILES = [
  'AGENTS.md',
  'package.json',
  'turbo.json',
  'apps/backend/package.json',
  'apps/frontend/package.json',
];
const MAX_CONTEXT_CHARS = 12_000;

// 构建代理工作区上下文
export async function buildAgentWorkspaceContext(workspaceRoot: string): Promise<string> {
  const sections: string[] = [];

  for (const filePath of CONTEXT_FILES) {
    const content = await readFile(path.join(workspaceRoot, filePath), 'utf-8').catch(() => null);
    // 如果文件不存在，则跳过
    if (content === null) {
      continue;
    }

    sections.push(`## ${filePath}\n${trimForContext(content, 2_400)}`);
  }
  return trimForContext(sections.join('\n\n'), MAX_CONTEXT_CHARS);
}

// 修剪上下文，使其不超过最大字符数
function trimForContext(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  const head = Math.floor(maxChars * 0.65);
  const tail = maxChars - head;
  return `${value.slice(0, head)}\n...[context truncated]...\n${value.slice(-tail)}`;
}
