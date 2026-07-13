import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { ResponseDto } from '@/common/dto/response.dto';

interface ApiResponseOptions {
  description?: string;
  status?: number;
}

export function ApiResponseWithDto<T extends Type<any>>(
  model?: T | [T],
  options?: ApiResponseOptions,
) {
  const { description = 'Operation successful', status = 200 } = options || {};

  // 如果没有传入 model，表示没有 data 内容返回
  if (!model) {
    return applyDecorators(
      ApiExtraModels(ResponseDto),
      ApiResponse({
        status,
        description,
        schema: {
          type: 'object',
          properties: {
            code: {
              type: 'number',
              example: 200,
              description: 'HTTP status code',
            },
            message: {
              type: 'string',
              example: 'OK',
              description: 'Message describing the result of the operation',
            },
            data: {
              type: 'null',
              example: null,
              description: 'No data returned',
            },
            timestamp: {
              type: 'number',
              example: Date.now(),
              description: 'Current timestamp',
            },
          },
          required: ['code', 'message', 'data', 'timestamp'],
        },
      }),
    );
  }

  const isArray = Array.isArray(model);
  const modelType = isArray ? model[0] : model;

  return applyDecorators(
    ApiExtraModels(ResponseDto, modelType),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          code: {
            type: 'number',
            example: 200,
            description: 'HTTP status code',
          },
          message: {
            type: 'string',
            example: 'OK',
            description: 'Message describing the result of the operation',
          },
          data: isArray
            ? {
                type: 'array',
                items: { $ref: getSchemaPath(modelType) },
                description: 'The data returned by the API',
              }
            : {
                $ref: getSchemaPath(modelType),
                description: 'The data returned by the API',
              },
          timestamp: {
            type: 'number',
            example: Date.now(),
            description: 'Current timestamp',
          },
        },
        required: ['code', 'message', 'data', 'timestamp'],
      },
    }),
  );
}
