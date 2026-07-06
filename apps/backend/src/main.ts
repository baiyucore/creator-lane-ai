import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { fastifyMultipart } from '@fastify/multipart';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { readConfigEnvOrThrow } from './utils/env';
import { parseCorsOrigins } from './utils/cors';
import { ServerEnvEnum } from './common/enum/server.env.enum';
import helmet from '@fastify/helmet';
import { registerFastifyPlugin } from './common/fastify/index';
import rateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';
import fastifyCsrfProtection from '@fastify/csrf-protection';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const API_PREFIX = 'api/v1';
const CSRF_TOKEN_ROUTE = `/${API_PREFIX}/security/csrf-token`;
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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

  // 获取fastify实例
  const fastify = app.getHttpAdapter().getInstance();

  // 文件上传插件
  await registerFastifyPlugin(app, fastifyMultipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100 * 1024 * 1024,
      fields: 10,
      fileSize: 20 * 1024 * 1024,
      files: 20,
      headerPairs: 2000,
    },
  });

  // 安全头插件
  await registerFastifyPlugin(app, helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['self'],
        scriptSrc: ['self', 'blob:'],
        workerSrc: ['self', 'blob:'],
        styleSrc: ['self', `'unsafe-inline'`],
        imgSrc: ['self', 'data:', 'https:'],
      },
    },
  });
  // 限流插件 ( 每个IP地址每分钟最多请求200次)
  await registerFastifyPlugin(app, rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    skipOnError: true,
  });

  // 跨域请求插件
  await registerFastifyPlugin(app, fastifyCookie);
  await registerFastifyPlugin(app, fastifyCsrfProtection, {
    cookieOpts: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  });

  // CORS 配置 制作白名单
  const configService = app.get(ConfigService);
  const corsOrigins = parseCorsOrigins(
    readConfigEnvOrThrow(configService, ServerEnvEnum.CORS_ORIGINS),
  );
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Accept-Language',
      'Content-Language',
      'Content-Type',
      'Authorization',
      'CSRF-Token',
      'X-CSRF-Token',
      'X-Requested-With',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['*'],
  });

  // 处理 SSE 流式请求 的 CORS 头部
  fastify.decorateRequest('corsHeaders', null);
  fastify.addHook('onRequest', async (request: any) => {
    const origin = (request.headers.origin as string) || '';
    if (origin && corsOrigins.length > 0 && corsOrigins.includes(origin)) {
      request.corsHeaders = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'Session-Id',
      };
    }
  });
  // 处理 CSRF 校验
  fastify.addHook('onRequest', (request, reply, done) => {
    const method = request.method.toUpperCase();
    const hasCookieHeader =
      typeof request.headers.cookie === 'string' && request.headers.cookie.length > 0;
    const hasAuthorizationHeader =
      typeof request.headers.authorization === 'string' && request.headers.authorization.length > 0;

    if (CSRF_SAFE_METHODS.has(method) || !hasCookieHeader || hasAuthorizationHeader) {
      done();

      return;
    }

    fastify.csrfProtection(request, reply, done);
  });

  // 获取 CSRF 令牌
  fastify.get(CSRF_TOKEN_ROUTE, async (_request, reply) => {
    return { csrfToken: reply.generateCsrf() };
  });

  // 全局路由前缀
  app.setGlobalPrefix(API_PREFIX, {
    exclude: ['metrics', 'health', 'test-metrics'],
  });

  // 全局管道 所有的接口的入参都会进行验证
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // 自动将请求体转换为DTO对象
      whitelist: true, // 过滤掉不在DTO对象中的属性
      forbidNonWhitelisted: true, // 如果请求体中包含不在DTO对象中的属性，则抛出异常
      validateCustomDecorators: true, // 自定义 decorator 的校验
      skipMissingProperties: false, // 如果请求体中包含缺失的属性，则抛出异常
      skipNullProperties: false, // 如果请求体中包含null的属性，则抛出异常
      skipUndefinedProperties: false, // 如果请求体中包含undefined的属性，则抛出异常
      disableErrorMessages: false, // 禁用错误消息
    }),
  );

  // 后端 API 文档 + 在线调试页面 http://localhost:3000/docs or /openApiJson
  const config = new DocumentBuilder()
    .setTitle('接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document, {
    jsonDocumentUrl: 'openApiJson',
  });

  // 在关闭的时候 等待所有的请求处理完成
  app.enableShutdownHooks();

  const port = readConfigEnvOrThrow(configService, ServerEnvEnum.SERVER_PORT);
  const host = readConfigEnvOrThrow(configService, ServerEnvEnum.SERVER_HOST);

  try {
    await app.listen(port, host);
    console.log(`Server running: http://127.0.0.1:${port}`);

    if (process.send) {
      process.send('ready');
    }
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}
bootstrap();
