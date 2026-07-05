import { existsSync } from 'fs';
import { resolve } from 'path';

import { ConfigService } from '@nestjs/config';

import { DatabaseEnvEnum } from '@/common/enum/database.env.enum';

export function getBackendNodeEnv(): 'production' | 'development' {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}
// 从 startDir 开始，向上查找 fileName 文件，最多查找 maxDepth 层
function findUpByFile(startDir: string, fileName: string, maxDepth: number = 8): string | null {
  let currentDir = startDir;
  for (let depth = 0; depth <= maxDepth; depth++) {
    if (existsSync(resolve(currentDir, fileName))) {
      return currentDir;
    }
    const parent = resolve(currentDir, '..');
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  return null;
}
// 获取 nest-cli.json 文件所在的目录
export function getBackendRootDir(): string {
  const cwdRoot = findUpByFile(process.cwd(), 'nest-cli.json');

  if (cwdRoot) {
    return cwdRoot;
  }

  const dirnameRoot = findUpByFile(__dirname, 'nest-cli.json');

  if (dirnameRoot) {
    return dirnameRoot;
  }

  return resolve(process.cwd(), 'apps', 'backend');
}

// 获取  nest-cli.json  的 env 文件路径
export function getBackendEnvFilePaths(): string[] {
  const rootDir = getBackendRootDir();

  return [
    resolve(rootDir, '.env.local'),
    resolve(rootDir, `.env.${getBackendNodeEnv()}`),
    resolve(rootDir, '.env'),
  ];
}

let loaded = false;

// 加载 nest-cli.json  的 env 文件
export function loadBackendEnv(): void {
  if (loaded) return;
  loaded = true;

  for (const path of getBackendEnvFilePaths()) {
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

// 读取 process.env 中的变量，如果变量不存在，则返回 undefined
export function readProcessEnv(key: string): string | undefined {
  const value = process.env[key];

  if (value == null) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

// 读取 process.env 中的变量，如果变量不存在，则抛出错误
export function readProcessEnvOrThrow(key: string): string {
  const value = readProcessEnv(key);

  if (value == null) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
}

// 读取 ConfigService 中的变量，如果变量不存在，则返回 undefined
export function readConfigEnv(configService: ConfigService, key: string): string | undefined {
  const value = configService.get<string>(key);

  if (value == null) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

// 读取 ConfigService 中的变量，如果变量不存在，则抛出错误
export function readConfigEnvOrThrow(configService: ConfigService, key: string): string {
  const value = readConfigEnv(configService, key);

  if (value == null) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
}

// 解析数据库 URL
export function resolveDatabaseUrl(): string {
  loadBackendEnv();

  const direct = readProcessEnv(DatabaseEnvEnum.DATABASE_URL);

  if (direct) return direct;

  const user = encodeURIComponent(readProcessEnvOrThrow(DatabaseEnvEnum.POSTGRES_USER));
  const password = encodeURIComponent(readProcessEnvOrThrow(DatabaseEnvEnum.POSTGRES_PASSWORD));
  const host = readProcessEnvOrThrow(DatabaseEnvEnum.POSTGRES_HOST);
  const port = readProcessEnvOrThrow(DatabaseEnvEnum.POSTGRES_PORT);
  const database = readProcessEnvOrThrow(DatabaseEnvEnum.DATABASE_NAME);

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
