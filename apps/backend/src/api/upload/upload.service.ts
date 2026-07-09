import { Injectable } from '@nestjs/common';
import { MinioService } from '@/common/minio/minio.service';
import { createHash } from 'node:crypto';
import { UploadResponseData } from './dto/upload-response.dto';
import type { ResponseDto } from '@/common/dto/response.dto';
import sharp from 'sharp';
import type { MulterFile } from '@webundsoehne/nest-fastify-file-upload';

@Injectable()
export class UploadService {
  constructor(private readonly minioService: MinioService) {}

  async uploadImage(
    file: MulterFile,
    folder: 'avatar' | 'doc',
  ): Promise<ResponseDto<UploadResponseData>> {
    const webpBuffer = await sharp(file.buffer).webp({ lossless: true }).toBuffer();
    const fileHash = createHash('sha256').update(webpBuffer).digest('hex');
    const fileName = `${fileHash}.webp`;
    const objectName = `${folder}/${fileName}`;
    const exists = await this.minioService.objectExists(objectName);

    if (!exists) {
      await this.minioService.uploadBuffer(objectName, webpBuffer, {
        contentType: 'image/webp',
        metadata: { 'file-hash': fileHash, 'original-mimetype': file.mimetype },
      });
    }

    return {
      message: exists ? '文件已存在，无需重复上传' : '上传成功',
      data: {
        fileUrl: this.minioService.getPublicUrl(objectName),
        fileHash,
        fileName,
        originalSize: file.size,
        processedSize: webpBuffer.length,
        deduplicated: exists,
      },
    };
  }
}
