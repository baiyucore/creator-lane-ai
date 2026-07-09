import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import type { BucketItem, BucketItemStat, ItemBucketMetadata } from 'minio';
import minioConfig, { MinioConfig } from '@/config/minio.config';
import { Readable } from 'node:stream';

// TODO : 类似于云存储，可以上传下载文件，但是需要配置对应的存储桶，以及对应的访问密钥和密钥ID
// TODO : 需要去稍微了解一点
export interface MinioUploadOptions {
  bucket?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface MinioPresignedUrlOptions {
  bucket?: string;
  expiry?: number;
  respHeaders?: Record<string, string>;
}

export interface MinioUploadResult {
  etag: string;
  versionId: string | null;
}

export interface MinioStatus {
  isConnected: boolean; // 是否连接成功
  endpoint: string; // 端点
  port: number; // 端口
  useSSL: boolean; // 是否使用SSL
  defaultBucket: string; // 默认桶
  totalOperations: number; // 总操作数
  totalErrors: number; // 总错误数
  lastError?: string; // 最后一次错误
}

@Injectable()
export class MinioService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Minio.Client;
  private readonly options: MinioConfig;
  private readonly defaultBucket: string;
  private readonly status: MinioStatus;

  constructor(configService: ConfigService) {
    this.options = minioConfig(configService);
    this.defaultBucket = this.options.bucket;
    this.client = new Minio.Client({
      endPoint: this.options.endPoint,
      port: this.options.port,
      useSSL: this.options.useSSL,
      accessKey: this.options.accessKey,
      secretKey: this.options.secretKey,
    });
    this.status = {
      isConnected: false,
      endpoint: this.options.endPoint,
      port: this.options.port,
      useSSL: this.options.useSSL,
      defaultBucket: this.defaultBucket,
      totalOperations: 0,
      totalErrors: 0,
    };
  }

  async onModuleInit(): Promise<void> {
    await this.verifyDefaultBucket();
  }

  async onModuleDestroy(): Promise<void> {
    this.status.isConnected = false;
  }
  // 获取状态
  getStatus(): MinioStatus {
    return { ...this.status };
  }
  // 获取客户端
  getClient(): Minio.Client {
    this.status.totalOperations += 1;
    return this.client;
  }
  // 是否存储桶健康
  async isHealthy(): Promise<boolean> {
    try {
      const exists = await this.client.bucketExists(this.defaultBucket);
      this.status.isConnected = exists;
      return exists;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  // 是否存储桶存在
  async bucketExists(bucket?: string): Promise<boolean> {
    return this.execute('bucket exists check', async () => {
      return this.client.bucketExists(this.resolveBucket(bucket));
    });
  }
  // 是否对象存在
  async objectExists(objectName: string, bucket?: string): Promise<boolean> {
    try {
      this.status.totalOperations += 1;
      await this.client.statObject(this.resolveBucket(bucket), objectName);
      this.status.isConnected = true;
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      this.handleError(error);
      throw this.createException(
        'MinIO object exists check failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  // 上传的方式 之一： 上传缓冲区 （中小型数据的首选）
  async uploadBuffer(
    objectName: string,
    buffer: Buffer,
    operation?: MinioUploadOptions,
  ): Promise<MinioUploadResult> {
    return this.execute('upload buffer', async () => {
      const result = await this.client.putObject(
        this.resolveBucket(operation?.bucket),
        objectName,
        buffer,
        buffer.length,
        this.buildMetadata(operation),
      );
      return {
        etag: result.etag,
        versionId: result.versionId,
      };
    });
  }

  // 上传的方式 之二： 上传流 （大型数据的首选）
  async uploadStream(
    objectName: string,
    stream: Readable,
    size: number,
    operation?: MinioUploadOptions,
  ): Promise<MinioUploadResult> {
    return this.execute('upload stream', async () => {
      const result = await this.client.putObject(
        this.resolveBucket(operation?.bucket),
        objectName,
        stream,
        size,
        this.buildMetadata(operation),
      );
      return {
        etag: result.etag,
        versionId: result.versionId,
      };
    });
  }
  // 上传的方式 之三： 上传文件 (走本地磁盘)
  async uploadFile(
    objectName: string,
    filePath: string,
    operation?: MinioUploadOptions,
  ): Promise<MinioUploadResult> {
    return this.execute('upload file', async () => {
      const result = await this.client.fPutObject(
        this.resolveBucket(operation?.bucket),
        objectName,
        filePath,
        this.buildMetadata(operation),
      );
      return {
        etag: result.etag,
        versionId: result.versionId,
      };
    });
  }
  // 下载的方式 之一： 下载缓冲区
  async downloadBuffer(objectName: string, bucket?: string): Promise<Buffer> {
    return this.execute('download buffer', async () => {
      const result = await this.client.getObject(this.resolveBucket(bucket), objectName);
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        result.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        result.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        result.on('error', reject);
      });
    });
  }

  // 下载的方式 之二： 下载流
  async downloadStream(objectName: string, bucket?: string): Promise<Readable> {
    return this.execute('download stream', async () => {
      return this.client.getObject(this.resolveBucket(bucket), objectName);
    });
  }
  // 下载的方式 之三： 下载文件 (走本地磁盘)
  async downloadFile(objectName: string, filePath: string, bucket?: string): Promise<void> {
    return this.execute('download file', async () => {
      await this.client.fGetObject(this.resolveBucket(bucket), objectName, filePath);
    });
  }
  // 删除的方式 之一： 删除对象
  async deleteObject(objectName: string, bucket?: string): Promise<void> {
    await this.execute('delete object', async () => {
      await this.client.removeObject(this.resolveBucket(bucket), objectName);
    });
  }
  // 删除的方式 之二： 删除多对象
  async deleteObjects(objectNames: string[], bucket?: string): Promise<void> {
    if (objectNames.length === 0) {
      return;
    }
    await this.execute('delete objects', async () => {
      await this.client.removeObjects(this.resolveBucket(bucket), objectNames);
    });
  }

  // 获取对象元数据
  async getObjectMetadata(objectName: string, bucket?: string): Promise<BucketItemStat> {
    return this.execute('get object metadata', async () => {
      return this.client.statObject(this.resolveBucket(bucket), objectName);
    });
  }

  // 列出对象
  async listObjects(prefix?: string, bucket?: string, readonly = true): Promise<BucketItem[]> {
    return this.execute('list objects', async () => {
      const stream = this.client.listObjectsV2(this.resolveBucket(bucket), prefix, readonly);

      return new Promise<BucketItem[]>((resolve, reject) => {
        const items: BucketItem[] = [];
        stream.on('data', (item: BucketItem) => {
          items.push(item);
        });
        stream.on('end', () => {
          resolve(items);
        });
        stream.on('error', reject);
      });
    });
  }
  // 生成临时访问URL （也就是短暂有效下载地址
  async generatePresignedUrl(
    objectName: string,
    operation?: MinioPresignedUrlOptions,
  ): Promise<string> {
    return this.execute('generate presigned url', async () => {
      return this.client.presignedGetObject(
        this.resolveBucket(operation?.bucket),
        objectName,
        operation?.expiry,
        operation?.respHeaders,
      );
    });
  }
  // 生成临时上传URL （也就是短暂有效上传地址）
  async generatePresignedPutUrl(
    objectName: string,
    operation?: MinioPresignedUrlOptions,
  ): Promise<string> {
    return this.execute('generate presigned put url', async () => {
      return this.client.presignedPutObject(
        this.resolveBucket(operation?.bucket),
        objectName,
        operation?.expiry,
      );
    });
  }

  // 复制对象
  async copyObject(
    sourceObjectName: string,
    targetObjectName: string,
    sourceBucket?: string,
    targetBucket?: string,
  ): Promise<void> {
    return this.execute('copy object', async () => {
      await this.client.copyObject(
        this.resolveBucket(targetBucket),
        targetObjectName,
        `/${this.resolveBucket(sourceBucket)}/${sourceObjectName}`,
        new Minio.CopyConditions(),
      );
    });
  }
  // 获取公网访问URL
  getPublicUrl(objectName: string, bucket?: string): string {
    const protocol =
      process.env.NODE_ENV === 'production' ? 'https' : this.options.useSSL ? 'https' : 'http';
    const isDefaultPort =
      (protocol === 'https' && this.options.port === 443) ||
      (protocol === 'http' && this.options.port === 80);
    const portPart = isDefaultPort ? '' : `:${this.options.port}`;
    return `${protocol}://${this.options.endPoint}${portPart}/${this.resolveBucket(bucket)}/${objectName}`;
  }

  // 验证默认桶
  private async verifyDefaultBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.defaultBucket);
      if (!exists) {
        throw new Error(`Bucket "${this.defaultBucket}" does not exist`);
      }
      this.status.isConnected = true;
    } catch (error) {
      this.handleError(error);
      throw this.createException(
        'MinIO initialization failed',
        HttpStatus.SERVICE_UNAVAILABLE,
        error,
      );
    }
  }

  // 错误处理
  private handleError(error: unknown): void {
    this.status.totalErrors += 1;
    this.status.isConnected = false;
    this.status.lastError = this.toErrorMessage(error);
  }
  // 转换错误信息
  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  // 创建异常
  private createException(message: string, status: HttpStatus, cause?: unknown): HttpException {
    if (cause == null) {
      return new HttpException(message, status);
    }
    return new HttpException(`${message}: ${this.toErrorMessage(cause)}`, status);
  }
  // 执行操作
  private async execute<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    this.status.totalOperations += 1;
    try {
      const result = await fn();
      this.status.isConnected = true;
      return result;
    } catch (error) {
      this.handleError(error);
      throw this.createException(
        `MinIO ${operation} failed`,
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  // 解析桶名
  private resolveBucket(bucket?: string): string {
    return bucket && bucket.trim().length > 0 ? bucket : this.defaultBucket;
  }
  // 是否未找到错误， 逐一排查
  private isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error == null || !('code' in error)) {
      return false;
    }
    const code = (error as { code?: unknown }).code;
    if (typeof code !== 'string') {
      return false;
    }
    return ['NotFound', 'NoSuchKey', 'NoSuchObject'].includes(code);
  }
  // 构建元数据
  private buildMetadata(operation?: MinioUploadOptions): ItemBucketMetadata {
    return {
      'Content-Type': operation?.contentType || 'application/octet-stream',
      ...(operation?.metadata ?? {}),
    };
  }
}
