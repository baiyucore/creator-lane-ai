import { randomUUID } from 'node:crypto';

import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { ChainableCommander, RedisOptions, RedisValue } from 'ioredis';
import redisConfig, { RedisConfig } from '../../config/redis.config';

interface RedisLockOptions {
  ttlMs?: number;
  retryDelayMs?: number;
  retryTimes?: number;
}

interface RedisStatus {
  isConnected: boolean;
  uptime: number;
  lastPingTime?: number;
  lastPingLatencyMs?: number;
  connectionAttempts: number;
  totalOperations: number;
  totalErrors: number;
  lastError?: string;
}
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null; // 连接 Redis 的客户端
  private healthCheckTimer: NodeJS.Timeout | null = null; // 健康检查定时器
  private connectedAt = 0; // 连接时间

  private readonly options: RedisConfig;
  private readonly status: RedisStatus = {
    isConnected: false,
    uptime: 0,
    connectionAttempts: 0,
    totalOperations: 0,
    totalErrors: 0,
  };

  constructor(configService: ConfigService) {
    this.options = redisConfig(configService);
  }

  async onModuleInit() {
    await this.connect();
    this.startHealthCheck();
  }

  async onModuleDestroy() {
    this.stopHealthCheck();
    await this.disconnect();
  }
  // 获取状态
  getStatus(): RedisStatus {
    return {
      ...this.status,
      uptime: this.connectedAt > 0 ? Date.now() - this.connectedAt : 0,
    };
  }
  // 检查是否健康
  async isHealthy(): Promise<boolean> {
    try {
      await this.execute('ping', async (client) => {
        await client.ping();
      });
      return true;
    } catch {
      return false;
    }
  }
  // 获取客户端
  getClient(): Redis {
    this.status.totalOperations += 1;
    return this.ensureClient();
  }
  // 创建多条命令
  multi(): ChainableCommander {
    this.status.totalOperations += 1;
    return this.ensureClient().multi();
  }
  // 创建管道
  pipleline(): ChainableCommander {
    this.status.totalOperations += 1;
    return this.ensureClient().pipeline();
  }
  // 设置字符串
  async setString(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    return this.execute('set', async (client) => {
      if (ttlSeconds != null && ttlSeconds > 0) {
        return await client.set(key, value, 'EX', ttlSeconds);
      }
      return await client.set(key, value);
    });
  }
  // 获取字符串
  async getString(key: string): Promise<string | null> {
    return this.execute('get', (client) => client.get(key));
  }

  // 设置值
  async set<T extends RedisValue>(key: string, value: T, ttlSeconds?: number): Promise<'OK'> {
    return this.setString(key, this.serialize(value), ttlSeconds);
  }

  // 获取值
  async get<T extends RedisValue>(key: string): Promise<T | null> {
    const value = await this.getString(key);
    if (value == null) {
      return null;
    }
    return this.deserialize<T>(value);
  }

  // 设置值（如果key不存在）
  async setNX<T extends RedisValue>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const serialized = this.serialize(value);
    const result = await this.execute('setnx', async (client) => {
      if (ttlSeconds != null && ttlSeconds > 0) {
        return await client.set(key, serialized, 'EX', ttlSeconds, 'NX');
      } else {
        return await client.set(key, serialized);
      }
    });
    return result === 'OK';
  }

  // 设置多个值
  async mSet<T extends RedisValue>(pairs: Record<string, T>): Promise<'OK'> {
    if (Object.keys(pairs).length === 0) {
      return 'OK';
    }

    const serialized = Object.entries(pairs).reduce(
      (acc, [key, value]) => {
        acc[key] = this.serialize(value);
        return acc;
      },
      {} as Record<string, string>,
    );

    return this.execute('mset', (client) => client.mset(serialized));
  }
  // 获取多个值
  async mGet<T = string>(keys: string[]): Promise<Array<T | null>> {
    if (keys.length === 0) {
      return [];
    }
    const values = await this.execute('mget', (client) => client.mget(keys));
    return values.map((value) => {
      if (value == null) {
        return null;
      }

      return this.deserialize<T>(value);
    });
  }
  // 检查是否存在
  async exists(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }
    return await this.execute('exists', (client) => client.exists(...keys));
  }
  // 删除多个值
  async delete(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }
    return await this.execute('del', (client) => client.del(...keys));
  }
  // 删除符合模式的值
  async delteByPattern(pattern: string, scanCount = 200): Promise<number> {
    return await this.execute('deleteByPattern', async (client) => {
      let cursor = '0';
      let deleted = 0;
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          scanCount.toString(),
        );
        cursor = nextCursor;
        deleted += keys.length;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
      return deleted;
    });
  }
  // 设置过期时间
  async expire(key: string, seconds: number): Promise<number> {
    return this.execute('expire', (client) => client.expire(key, seconds));
  }

  // 获取过期时间
  async getTTL(key: string): Promise<number> {
    return this.execute('ttl', (client) => client.ttl(key));
  }

  // 增加值
  async increment(key: string, by = 1): Promise<number> {
    return this.execute('incrby', (client) => client.incrby(key, by));
  }

  // 减少值
  async decrement(key: string, by = 1): Promise<number> {
    return this.execute('decrby', (client) => client.decrby(key, by));
  }

  // 设置哈希值
  async hashSet(key: string, field: string, value: RedisValue): Promise<number> {
    return this.execute('hset', (client) => client.hset(key, field, this.serialize(value)));
  }
  // 获取哈希值
  async hashGet<T = string>(key: string, field: string): Promise<T | null> {
    const value = await this.execute('hget', (client) => client.hget(key, field));

    if (value == null) {
      return null;
    }

    return this.deserialize<T>(value);
  }

  // 获取哈希所有值
  async hashGetAll<T = string>(key: string): Promise<Record<string, T>> {
    const data = await this.execute('hgetall', (client) => client.hgetall(key));

    return Object.entries(data).reduce(
      (acc, [field, value]) => {
        acc[field] = this.deserialize<T>(value);

        return acc;
      },
      {} as Record<string, T>,
    );
  }

  // 删除哈希值
  async hashDelete(key: string, ...fields: string[]): Promise<number> {
    if (fields.length === 0) {
      return 0;
    }

    return this.execute('hdel', (client) => client.hdel(key, ...fields));
  }

  // 发布消息
  async publish(channel: string, message: RedisValue): Promise<number> {
    return this.execute('publish', (client) => client.publish(channel, this.serialize(message)));
  }
  // 缓存
  async cache<T extends RedisValue>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached != null) {
      return cached;
    }

    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);

    return fresh;
  }
  // 加锁
  async lock(
    key: string,
    options?: RedisLockOptions,
  ): Promise<{ success: boolean; release: () => Promise<void> }> {
    const lockKey = `lock:${key}`;
    const token = randomUUID();
    const ttlMs = options?.ttlMs ?? this.options.lockTtl;
    const retryDelayMs = options?.retryDelayMs ?? this.options.lockRetryDelay;
    const retryTimes = options?.retryTimes ?? this.options.lockRetryTimes;

    for (let attempt = 0; attempt < retryTimes; attempt += 1) {
      const acquired = await this.execute('lock', (client) =>
        client.set(lockKey, token, 'PX', ttlMs, 'NX'),
      );

      if (acquired === 'OK') {
        return {
          success: true,
          release: async () => {
            await this.execute('unlock', async (client) => {
              const lua = [
                'if redis.call("get", KEYS[1]) == ARGV[1] then',
                '  return redis.call("del", KEYS[1])',
                'end',
                'return 0',
              ].join('\n');

              await client.eval(lua, 1, lockKey, token);
            });
          },
        };
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }

    return {
      success: false,
      release: async () => Promise.resolve(),
    };
  }

  // 连接
  private async connect() {
    if (this.client) {
      return;
    }
    this.status.connectionAttempts += 1;

    const options: RedisOptions = {
      host: this.options.host, // 主机
      port: this.options.port, // 端口
      password: this.options.password, // 密码
      db: this.options.db, // 数据库
      keyPrefix: this.options.keyPrefix, // 键前缀
      connectTimeout: this.options.connectTimeout, // 连接超时
      disconnectTimeout: this.options.disconnectTimeout, // 断开连接超时
      keepAlive: this.options.keepAlive, // 保持连接
      maxRetriesPerRequest: this.options.maxRetriesPerRequest, // 最大重试次数
      enableReadyCheck: true, // 启用就绪检查
      enableAutoPipelining: true, // 启用自动管道
      retryStrategy: (times) => Math.min(times * 50, 2000), // 重试策略
      tls: this.options.tlsEnabled ? {} : undefined, // 启用 TLS
    };
    try {
      const client = new Redis(options);
      this.bindClientEvents(client);
      await client.ping();
      this.client = client;
      this.status.isConnected = true;
      this.connectedAt = Date.now();
    } catch (error) {
      this.status.isConnected = false;
      this.status.totalErrors += 1;
      this.status.lastError = this.toErrorMessage(error);
      throw this.createException('Redis connection failed', HttpStatus.SERVICE_UNAVAILABLE, error);
    }
  }

  // 断开连接
  private async disconnect(): Promise<void> {
    const client = this.client;
    this.client = null;
    this.status.isConnected = false;
    if (!client) {
      return;
    }
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }

  // 将错误转换为字符串
  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // 创建异常
  private createException(message: string, status: HttpStatus, cause?: unknown): HttpException {
    if (cause === null) {
      return new HttpException(message, status);
    }
    return new HttpException(`${message}: ${this.toErrorMessage(cause)}`, status);
  }

  // 绑定客户端事件
  private bindClientEvents(client: Redis): void {
    client.on('error', (error) => {
      this.status.totalErrors += 1;
      this.status.isConnected = false;
      this.status.lastError = this.toErrorMessage(error);
    });

    client.on('ready', () => {
      this.status.isConnected = true;

      if (this.connectedAt === 0) {
        this.connectedAt = Date.now();
      }
    });

    client.on('end', () => {
      this.status.isConnected = false;
    });
  }
  // 启动健康检查
  private startHealthCheck(): void {
    const interval = Math.max(this.options.healthCheckIntervalMs, 5000);
    this.healthCheckTimer = setInterval(async () => {
      const client = this.client;
      if (!client) {
        return;
      }
      const starateAt = Date.now();
      try {
        await client.ping();
        this.status.isConnected = true;
        this.status.lastPingTime = Date.now();
        this.status.lastPingLatencyMs = Date.now() - starateAt;
        this.status.uptime = this.connectedAt > 0 ? Date.now() - this.connectedAt : 0;
      } catch (error) {
        this.status.isConnected = false;
        this.status.totalErrors += 1;
        this.status.lastError = this.toErrorMessage(error);
      }
    }, interval);
    this.healthCheckTimer.unref?.(); // 取消定时器的引用，确保在应用程序关闭时可以正常退出
  }

  // 停止健康检查
  private stopHealthCheck(): void {
    if (!this.healthCheckTimer) {
      return;
    }
    clearInterval(this.healthCheckTimer);
    this.healthCheckTimer = null;
  }

  // 执行命令
  private async execute<T>(operation: string, fn: (client: Redis) => Promise<T>): Promise<T> {
    this.status.totalOperations += 1;

    try {
      return await fn(this.ensureClient());
    } catch (error) {
      this.status.totalErrors += 1;
      this.status.lastError = this.toErrorMessage(error);
      throw this.createException(
        `Redis ${operation} operation failed`,
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  // 确保客户端
  private ensureClient(): Redis {
    if (this.client == null) {
      throw this.createException('Redis client is not available', HttpStatus.SERVICE_UNAVAILABLE);
    }

    return this.client;
  }
  // 反序列化值
  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
  // 序列化值
  private serialize(value: RedisValue): string {
    if (typeof value === 'string') {
      return value;
    }

    const serialized = JSON.stringify(value);

    if (serialized == null) {
      return 'null';
    }

    return serialized;
  }
}
