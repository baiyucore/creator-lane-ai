import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyInstance } from 'fastify';
// 注册Fastify插件
export async function registerFastifyPlugin(
  app: NestFastifyApplication,
  plugin: unknown,
  opts?: unknown,
): Promise<FastifyInstance> {
  return (await app.register(plugin as never, opts as never)) as unknown as FastifyInstance;
}
