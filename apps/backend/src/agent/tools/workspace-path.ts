import path from 'path';
import { existsSync, statSync } from 'node:fs';
const ROOT_MARKERS = ['turbo.json', 'pnpm-lock.yaml', 'package.json'];
const BLOCKED_WRITE_SEGMENTS = new Set(['.git', 'node_modules', 'dist', '.next', '.turbo']);

// 这个实际上是一个路径安全的工具，用于确保工作区路径的安全性 去防止 agent 修改到一些不应该修改的文件

export interface WorkspacePath {
  absolutePath: string;
  relativePath: string;
}
// 解析工作区根目录
export function resolveWorkspaceRoot(input?: string): string {
  const workspaceRoot = path.resolve(input?.trim() || findWorkspaceRoot());
  if (!existsSync(workspaceRoot) || !statSync(workspaceRoot).isDirectory()) {
    throw new Error(`Workspace root not found: ${workspaceRoot}`);
  }
  return workspaceRoot;
}

// 获取工作区根目录
export function findWorkspaceRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    const hasRootMarker = ROOT_MARKERS.every((marker) => existsSync(path.join(current, marker)));
    if (hasRootMarker) {
      return current;
    }
    const parent = path.resolve(current, '..');
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

// 解析工作区路径
export function resolveWorkspacePath(worksapceRoot: string, targetPath: string): WorkspacePath {
  const root = path.resolve(worksapceRoot);
  const absolutePath = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(root, targetPath);
  const relativePath = path.relative(root, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Path is outside workspace: ${targetPath}`);
  }

  return {
    absolutePath,
    relativePath: toPosixPath(relativePath),
  };
}

// 断言工作区路径可写
export function assertWritableWorkspacePath(workspacePath: WorkspacePath): void {
  const segments = workspacePath.relativePath.split('/');
  if (segments.some((segment) => BLOCKED_WRITE_SEGMENTS.has(segment))) {
    throw new Error(
      `Refusing to write generated or dependency path: ${workspacePath.relativePath}`,
    );
  }

  const basename = path.basename(workspacePath.relativePath);
  if (basename.startsWith('.env') && basename !== '.env.example') {
    throw new Error(`Refusing to write environment secret file: ${workspacePath.relativePath}`);
  }
}

// 将路径转换为POSIX格式
export function toPosixPath(path: string): string {
  return path.replace(/\\/g, '/');
}
