import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseData {
  @ApiProperty({
    description: '文件访问地址',
    example: 'http://127.0.0.1:9000/cloud-transformer/doc/abc123.webp',
  })
  fileUrl!: string;

  @ApiProperty({
    description: '文件内容哈希（SHA-256）',
    example: '61f4f6f36573ff66d7f3bc7f0f1dd8e521dd6d2b30fbdb82987430417ecf0f79',
  })
  fileHash!: string;

  @ApiProperty({
    description: '存储后的文件名',
    example: '61f4f6f36573ff66d7f3bc7f0f1dd8e521dd6d2b30fbdb82987430417ecf0f79.webp',
  })
  fileName!: string;

  @ApiProperty({ description: '原始文件大小（字节）', example: 245760 })
  originalSize!: number;

  @ApiProperty({ description: '处理后文件大小（字节）', example: 102400 })
  processedSize!: number;

  @ApiProperty({ description: '是否命中去重（已存在则跳过上传）', example: false })
  deduplicated!: boolean;
}
