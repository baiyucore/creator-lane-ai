/* eslint-disable */
export default async () => {
  const t = {};
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./common/dto/response.dto'),
          {
            ResponseDto: {
              code: { required: false, type: () => Number },
              message: { required: false, type: () => String },
              data: { required: false },
              timestamp: { required: false, type: () => Number },
            },
            RequestDetailsDto: {
              query: { required: true, type: 'object', additionalProperties: true },
              body: { required: true, type: 'object', additionalProperties: true },
              params: { required: true, type: 'object', additionalProperties: true },
              headers: { required: true, type: 'object', additionalProperties: true },
              method: { required: true, type: () => String },
              url: { required: true, type: () => String },
              timestamp: { required: true, type: () => Number },
              ip: { required: true, type: () => String },
            },
            ErrorResponseDto: {
              code: { required: true, type: () => Number },
              message: { required: true, type: () => String },
              timestamp: { required: true, type: () => Number },
              data: { required: false },
            },
          },
        ],
        [
          import('./api/upload/dto/upload-response.dto'),
          {
            UploadResponseData: {
              fileUrl: { required: true, type: () => String },
              fileHash: { required: true, type: () => String },
              fileName: { required: true, type: () => String },
              originalSize: { required: true, type: () => Number },
              processedSize: { required: true, type: () => Number },
              deduplicated: { required: true, type: () => Boolean },
            },
          },
        ],
        [
          import('./api/upload/dto/image-upload.dto'),
          { ImageUploadDto: { file: { required: true, type: () => Object } } },
        ],
      ],
      controllers: [
        [import('./api/health/health.controller'), { HealthController: { check: {} } }],
      ],
    },
  };
};
