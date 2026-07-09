import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConfigService } from '@nestjs/config';
import { readConfigEnv } from '@/utils/env';
import { LangfuseEnvEnum } from '../enum/langfuse.env.enum';

// TODO : llm 的监控平台，需要去稍微了解一点
interface TraceGeneratorOptions {
  input?: unknown;
  model?: string;
  modelParameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

type LangfuseAttributes = Record<string, unknown>;

interface LangfuseSpan {
  update(payload: Record<string, unknown>): void;
  end(): void;
}

interface LangfuseGeneration {
  update(payload: Record<string, unknown>): void;
}

type StartObservationFn = (name: string, attributes?: LangfuseAttributes) => LangfuseSpan;

type StartActiveObservationFn = <T>(
  name: string,
  runner: (generator: LangfuseGeneration) => Promise<T>,
  options?: { asType?: string },
) => Promise<T>;
@Injectable()
export class LangfuseService implements OnModuleInit, OnApplicationShutdown {
  private sdk: NodeSDK | null = null;
  private enabled = false;
  private startObservationFn: StartObservationFn | null = null;
  private startActiveObservationFn: StartActiveObservationFn | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const enabledFlag = this.parseBoolean(
      readConfigEnv(this.configService, LangfuseEnvEnum.LANGFUSE_ENABLED),
    );
    const publicKey = readConfigEnv(this.configService, LangfuseEnvEnum.LANGFUSE_PUBLIC_KEY);
    const secretKey = readConfigEnv(this.configService, LangfuseEnvEnum.LANGFUSE_SECRET_KEY);
    const hasCredentials = Boolean(publicKey && secretKey);
    const shouldEnable = enabledFlag ?? hasCredentials;

    if (!shouldEnable) {
      return;
    }

    if (!hasCredentials) {
      throw new InternalServerErrorException(
        'Langfuse is enabled but credentials are not configured.',
      );
    }
    if (publicKey == null || secretKey == null) {
      return;
    }
    // 获取环境配置
    const baseUrl = readConfigEnv(this.configService, LangfuseEnvEnum.LANGFUSE_BASE_URL);
    const environment = readConfigEnv(
      this.configService,
      LangfuseEnvEnum.LANGFUSE_TRACING_ENVIRONMENT,
    );
    const release = readConfigEnv(this.configService, LangfuseEnvEnum.LANGFUSE_RELEASE);
    const exportMode = this.resolveExportMode(
      readConfigEnv(this.configService, LangfuseEnvEnum.LANGFUSE_EXPORT_MODE),
    );

    try {
      const [{ LangfuseSpanProcessor }, tracing] = await Promise.all([
        import('@langfuse/otel'),
        import('@langfuse/tracing'),
      ]);
      this.startObservationFn = tracing.startObservation as StartObservationFn;
      this.startActiveObservationFn = tracing.startActiveObservation as StartActiveObservationFn;

      this.sdk = new NodeSDK({
        spanProcessors: [
          new LangfuseSpanProcessor({
            publicKey, // 公共密钥
            secretKey, // 私有密钥
            baseUrl, // 基础URL
            environment, // 环境
            release, // 版本
            exportMode, // 导出方式 ：batched(批量) 或 immediate(即时)
          }),
        ],
      });

      this.sdk.start();
      this.enabled = true;
    } catch (error) {
      throw this.normalizeException(error, 'Failed to initialize Langfuse tracing.');
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.sdk?.shutdown();
    this.sdk = null;
    this.enabled = false;
    this.startObservationFn = null;
    this.startActiveObservationFn = null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
  // 启动span
  startSpan(name: string, attributes?: LangfuseAttributes): LangfuseSpan | null {
    if (!this.enabled || this.startObservationFn === null) {
      return null;
    }
    return this.startObservationFn(name, attributes);
  }

  // 跟踪生成器 专门用于跟踪 LLM 的生成过程
  async traceGenerator<T>(
    name: string,
    runner: () => Promise<T>, // 运行器 用于去执行 LLM 的逻辑
    options?: TraceGeneratorOptions,
  ): Promise<T> {
    if (!this.enabled || this.startActiveObservationFn === null) {
      return runner();
    }
    return this.startActiveObservationFn(
      name,
      async (generator) => {
        if (options != null) {
          generator.update({
            input: options.input,
            model: options.model,
            modelParameters: options.modelParameters,
            metadata: options.metadata,
          });
        }

        try {
          const output = await runner();
          generator.update({
            output: output,
          });
          return output;
        } catch (error) {
          const message = this.getErrorMessage(error);

          generator.update({
            level: 'error',
            statusMessage: message,
            output: { error: message },
          });
          throw this.normalizeException(error, 'Langfuse generation trace failed.');
        }
      },
      {
        asType: 'generation',
      },
    );
  }

  // 解析布尔值
  private parseBoolean(value: string | undefined): boolean | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    return undefined;
  }
  // 解析导出模式
  private resolveExportMode(value: string | undefined): 'batched' | 'immediate' | undefined {
    if (value === 'batched' || value === 'immediate') {
      return value;
    }

    return undefined;
  }

  // 获取错误消息
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  // 标准化异常
  private normalizeException(error: unknown, fallbackMessage: string): HttpException {
    if (error instanceof HttpException) {
      return error;
    }
    const message = this.getErrorMessage(error) || fallbackMessage;
    return new InternalServerErrorException(message);
  }
}
