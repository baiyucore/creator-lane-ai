import { ConfigService } from '@nestjs/config';

import { MinioEnvEnum } from '@/common/enum/minio.env.enum';
import { readConfigEnvOrThrow } from '@/utils/env';

export interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

function parseNumber(value: string, key: string): number {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }

  return n;
}

function parseBoolean(value: string, key: string): boolean {
  const v = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(v)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(v)) {
    return false;
  }

  throw new Error(`Environment variable ${key} must be a boolean string`);
}

export default function minioConfig(configService: ConfigService): MinioConfig {
  const useSSL = parseBoolean(
    readConfigEnvOrThrow(configService, MinioEnvEnum.MINIO_USE_SSL),
    MinioEnvEnum.MINIO_USE_SSL,
  );

  if (process.env.NODE_ENV === 'production' && !useSSL) {
    throw new Error(
      `Environment variable ${MinioEnvEnum.MINIO_USE_SSL} must be true in production`,
    );
  }

  return {
    endPoint: readConfigEnvOrThrow(configService, MinioEnvEnum.MINIO_END_POINT),
    port: parseNumber(
      readConfigEnvOrThrow(configService, MinioEnvEnum.MINIO_PORT),
      MinioEnvEnum.MINIO_PORT,
    ),
    useSSL,
    accessKey: readConfigEnvOrThrow(configService, MinioEnvEnum.MINIO_ACCESS_KEY),
    secretKey: readConfigEnvOrThrow(configService, MinioEnvEnum.MINIO_SECRET_KEY),
    bucket: readConfigEnvOrThrow(configService, MinioEnvEnum.MINIO_BUCKET),
  };
}
