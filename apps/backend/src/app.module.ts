import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getBackendEnvFilePaths } from './utils/env';
import { DrizzleModule } from './common/drizzle/drizzle.module';
import { RedisModule } from './common/redis/redis.module';
import { MinioModule } from './common/minio/minio.module';
import { EmailModule } from './common/email/email.module';
import { LangfuseModule } from './common/langfuse/langfuse.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from './core/interceptor/transform.interceptor';
import { LangfuseTraceInterceptor } from './core/interceptor/langfuse-trace.interceptor';
import { HealthModule } from './api/health/health.module';
import { UploadService } from './api/upload/upload.service';
import { UploadModule } from './api/upload/upload.module';
import { AgentModule } from './agent/agent.module';
import { WorksModule } from './api/works/works.module';

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
    HealthModule,
    UploadModule,
    AgentModule,
    WorksModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LangfuseTraceInterceptor,
    },
    UploadService,
  ],
})
export class AppModule {}
