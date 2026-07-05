import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
// import { ConfigService } from '@nestjs/config';
// import { readConfigEnvOrThrow } from './utils/env';
// import { parseCorsOrigins } from './utils/cors';
// import { ServerEnvEnum } from './common/enum/server.env.enum';

// const API_PREFIX = 'api/v1';
// const CSRF_TOKEN_ROUTE = `/${API_PREFIX}/security/csrf-token`;
// const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 100 * 1024 * 1024,
      routerOptions: {
        maxParamLength: 10000,
      },
      trustProxy: true,
      logger: false,
    }),
    {
      logger: ['error', 'warn'],
      snapshot: true,
    },
  );

  // const configService = app.get(ConfigService);
  // const corsOrigins = parseCorsOrigins(
  //   readConfigEnvOrThrow(configService, ServerEnvEnum.CORS_ORIGINS),
  // );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
