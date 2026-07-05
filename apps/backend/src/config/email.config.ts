import { ConfigService } from '@nestjs/config';
import { EmailEnvEnum } from '@/common/enum/email.env.enum';
import { readConfigEnvOrThrow } from '@/utils/env';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  authPass: string;
  from: string;
}

function parseBoolean(value: string, key: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Environment variable ${key} must be a boolean string`);
}

function parseNumber(value: string, key: string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return num;
}

export default function emailConfig(configService: ConfigService): EmailConfig {
  const authUser = readConfigEnvOrThrow(configService, EmailEnvEnum.EMAIL_USER);

  return {
    host: readConfigEnvOrThrow(configService, EmailEnvEnum.EMAIL_HOST),
    port: parseNumber(
      readConfigEnvOrThrow(configService, EmailEnvEnum.EMAIL_PORT),
      EmailEnvEnum.EMAIL_PORT,
    ),
    secure: parseBoolean(
      readConfigEnvOrThrow(configService, EmailEnvEnum.EMAIL_SECURE),
      EmailEnvEnum.EMAIL_SECURE,
    ),
    authUser,
    authPass: readConfigEnvOrThrow(configService, EmailEnvEnum.EMAIL_PASS),
    from: readConfigEnvOrThrow(configService, EmailEnvEnum.EMAIL_FROM) ?? authUser,
  };
}
