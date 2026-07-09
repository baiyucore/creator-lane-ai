import { MultipartFile } from '@fastify/multipart';
import { ApiProperty } from '@nestjs/swagger';

export class ImageUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary', //
    // 说明文件
    description:
      '要上传的图片文件（最大 20MB）\n支持格式：JPEG、PNG、GIF、WebP、BMP、TIFF、SVG、AVIF\n自动转换为 WebP 格式存储',
  })
  file!: MultipartFile;
}
