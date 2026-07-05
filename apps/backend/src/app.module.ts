import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { getBackendEnvFilePaths } from './utils/env';
import { DrizzleService } from './common/drizzle/drizzle.service';
import { DrizzleModule } from './common/drizzle/drizzle.module';
import { RedisModule } from './common/redis/redis.module';
import { MinioService } from './common/minio/minio.service';
import { MinioModule } from './common/minio/minio.module';
import { EmailModule } from './common/email/email.module';
import { LangfuseService } from './common/langfuse/langfuse.service';
import { LangfuseModule } from './common/langfuse/langfuse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getBackendEnvFilePaths(),
    }),
    DrizzleModule,
    RedisModule,
    MinioModule,
    EmailModule,
    LangfuseModule,
  ],
  controllers: [AppController],
  providers: [AppService, DrizzleService, MinioService, LangfuseService],
})
export class AppModule {}
