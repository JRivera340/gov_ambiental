import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { getEnv } from '../config/env';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 3600;

export type FileFolder = 'actas' | 'photos';

@Injectable()
export class FilesService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string | null;

  constructor() {
    const env = getEnv();
    this.bucketName = env.S3_BUCKET;
    this.publicUrl = env.S3_PUBLIC_URL ?? null;
    this.s3Client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: FileFolder,
    activityId?: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (folder === 'actas') {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('El acta debe ser un archivo PDF');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('El PDF no puede exceder 10MB');
      }
    } else {
      if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException('Las fotos deben ser JPG, PNG o WebP');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('Cada foto no puede exceder 10MB');
      }
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;
    const key = activityId ? `${folder}/${activityId}/${fileName}` : `${folder}/${fileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      return key;
    } catch (error) {
      console.error('[FILES] Error subiendo archivo:', error);
      throw new BadRequestException('Error al subir el archivo');
    }
  }

  async getFileUrl(key: string): Promise<string> {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }

    try {
      const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
      return await getSignedUrl(this.s3Client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
    } catch (error) {
      console.error('[FILES] Error generando URL del archivo:', error);
      throw new BadRequestException('Error al generar la URL del archivo');
    }
  }
}
