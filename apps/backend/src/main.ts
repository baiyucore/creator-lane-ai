import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
