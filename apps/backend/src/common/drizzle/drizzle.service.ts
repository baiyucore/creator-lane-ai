import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { resolveDatabaseUrl } from '@/utils/env';
import * as schema from '../../schema';
import { drizzle } from 'drizzle-orm/node-postgres';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  readonly db: ReturnType<typeof drizzle<typeof schema>>;
  constructor() {
    this.pool = new Pool({
      connectionString: resolveDatabaseUrl(),
    });
    this.db = drizzle(this.pool, { schema });
  }
  async onModuleInit() {
    await this.pool.query('SELECT 1');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
  async healthCheck() {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
