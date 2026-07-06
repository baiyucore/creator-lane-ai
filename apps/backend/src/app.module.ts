import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getBackendEnvFilePaths } from './utils/env';
import { DrizzleModule } from './common/drizzle/drizzle.module';
import { RedisModule } from './common/redis/redis.module';
import { MinioModule } from './common/minio/minio.module';
import { EmailModule } from './common/email/email.module';
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
  providers: [],
})
export class AppModule {}
