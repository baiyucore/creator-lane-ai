import { Injectable } from '@nestjs/common';

type LogLevel = 'error' | 'warn' | 'debug' | 'log';

interface StructuredLogPayload {
  message: string;
  prefix?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LoggerService {
  error(message: string, prefix?: string, metadata?: Record<string, unknown>): void;
  error(payload: StructuredLogPayload): void;
  error(
    messageOrPayload: string | StructuredLogPayload,
    prefix?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.write('error', messageOrPayload, prefix, metadata);
  }

  warn(message: string, prefix?: string, metadata?: Record<string, unknown>): void;
  warn(payload: StructuredLogPayload): void;
  warn(
    messageOrPayload: string | StructuredLogPayload,
    prefix?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.write('warn', messageOrPayload, prefix, metadata);
  }

  debug(message: string, prefix?: string, metadata?: Record<string, unknown>): void;
  debug(payload: StructuredLogPayload): void;
  debug(
    messageOrPayload: string | StructuredLogPayload,
    prefix?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.write('debug', messageOrPayload, prefix, metadata);
  }

  log(message: string, prefix?: string, metadata?: Record<string, unknown>): void;
  log(payload: StructuredLogPayload): void;
  log(
    messageOrPayload: string | StructuredLogPayload,
    prefix?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.write('log', messageOrPayload, prefix, metadata);
  }

  private write(
    level: LogLevel,
    messageOrPayload: string | StructuredLogPayload,
    prefix?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const payload = this.normalizePayload(messageOrPayload, prefix, metadata);
    const output = JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      ...payload,
    });

    if (level === 'error') {
      console.error(output);

      return;
    }

    if (level === 'warn') {
      console.warn(output);

      return;
    }

    console.log(output);
  }

  private normalizePayload(
    messageOrPayload: string | StructuredLogPayload,
    prefix?: string,
    metadata?: Record<string, unknown>,
  ): StructuredLogPayload {
    if (typeof messageOrPayload === 'string') {
      return {
        message: messageOrPayload,
        prefix,
        metadata,
      };
    }

    return messageOrPayload;
  }
}
