import { ConfigService } from '@nestjs/config';

import { readConfigEnv, readConfigEnvOrThrow } from '@/utils/env';

import { RedisEnvEnum } from '../common/enum/redis.env.enum';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix?: string;
  connectTimeout: number;
  disconnectTimeout: number;
  keepAlive: number;
  maxRetriesPerRequest: number | null;
  tlsEnabled: boolean;
  healthCheckIntervalMs: number;
  lockTtl: number;
  lockRetryDelay: number;
  lockRetryTimes: number;
}

function parseNumber(value: string, key: string): number {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }

  return n;
}

function parseBoolean(value: string, key: string): boolean {
  const v = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(v)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(v)) {
    return false;
  }

  throw new Error(`Environment variable ${key} must be a boolean string`);
}

function parseNullableNumber(value: string, key: string): number | null {
  const v = value.trim().toLowerCase();

  if (v === 'null') {
    return null;
  }

  const n = Number(v);

  if (!Number.isFinite(n)) {
    throw new Error(`Environment variable ${key} must be a valid number or "null"`);
  }

  return n;
}

export default function redisConfig(configService: ConfigService): RedisConfig {
  const password = readConfigEnv(configService, RedisEnvEnum.REDIS_PASSWORD);
  const keyPrefix = readConfigEnv(configService, RedisEnvEnum.REDIS_KEY_PREFIX);

  return {
    host: readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_HOST),
    port: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_PORT),
      RedisEnvEnum.REDIS_PORT,
    ),
    password: password || undefined,
    db: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_DB),
      RedisEnvEnum.REDIS_DB,
    ),
    keyPrefix: keyPrefix || undefined,
    connectTimeout: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_CONNECT_TIMEOUT),
      RedisEnvEnum.REDIS_CONNECT_TIMEOUT,
    ),
    disconnectTimeout: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_DISCONNECT_TIMEOUT),
      RedisEnvEnum.REDIS_DISCONNECT_TIMEOUT,
    ),
    keepAlive: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_KEEP_ALIVE),
      RedisEnvEnum.REDIS_KEEP_ALIVE,
    ),
    maxRetriesPerRequest: parseNullableNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_MAX_RETRIES_PER_REQUEST),
      RedisEnvEnum.REDIS_MAX_RETRIES_PER_REQUEST,
    ),
    tlsEnabled: parseBoolean(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_TLS_ENABLED),
      RedisEnvEnum.REDIS_TLS_ENABLED,
    ),
    healthCheckIntervalMs: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_HEALTH_CHECK_INTERVAL_MS),
      RedisEnvEnum.REDIS_HEALTH_CHECK_INTERVAL_MS,
    ),
    lockTtl: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_LOCK_TTL_MS),
      RedisEnvEnum.REDIS_LOCK_TTL_MS,
    ),
    lockRetryDelay: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_LOCK_RETRY_DELAY_MS),
      RedisEnvEnum.REDIS_LOCK_RETRY_DELAY_MS,
    ),
    lockRetryTimes: parseNumber(
      readConfigEnvOrThrow(configService, RedisEnvEnum.REDIS_LOCK_RETRY_TIMES),
      RedisEnvEnum.REDIS_LOCK_RETRY_TIMES,
    ),
  };
}
