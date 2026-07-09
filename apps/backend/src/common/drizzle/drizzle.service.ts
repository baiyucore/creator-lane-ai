import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { resolveDatabaseUrl } from '@/utils/env';
import * as schema from '../../schema';
import { drizzle } from 'drizzle-orm/node-postgres';

// TODO : 数据库ORM，需要去稍微了解一点

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  readonly db: ReturnType<typeof drizzle<typeof schema>>;
  constructor() {
    // 创建数据库连接池
    this.pool = new Pool({
      connectionString: resolveDatabaseUrl(),
    });
    // 创建Drizzle实例
    this.db = drizzle(this.pool, { schema });
  }
  async onModuleInit() {
    // 检查数据库连接是否正常
    await this.pool.query('SELECT 1');
  }

  async onModuleDestroy() {
    // 关闭数据库连接池
    await this.pool.end();
  }
  async healthCheck() {
    // 检查数据库连接是否正常
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
