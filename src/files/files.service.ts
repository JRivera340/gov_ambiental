import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { getEnv } from '../config/env';

// Mismo bucket R2 que el hub (gov-espacio-publico-files) — ver env.schema.ts.
@Injectable()
export class FilesService {
  private s3Client: S3Client;
  private bucketName: string;
  private accountId: string;
  private publicUrl: string | null;

  constructor() {
    const env = getEnv();
    this.accountId = env.R2_ACCOUNT_ID || '';
    const accessKeyId = env.R2_ACCESS_KEY_ID || '';
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY || '';
    this.bucketName = env.R2_BUCKET_NAME || '';
    this.publicUrl = env.R2_PUBLIC_URL || null;

    if (!this.accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
      console.warn('[FILES] R2 credentials not configured. File uploads will fail.');
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  getPublicUrl(): string | null {
    return this.publicUrl;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: 'actas' | 'photos',
    activityId?: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (folder === 'actas') {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('El acta debe ser un archivo PDF');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('El PDF no puede exceder 10MB');
      }
    } else if (folder === 'photos') {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Las fotos deben ser JPG, PNG o WebP');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('Cada foto no puede exceder 10MB');
      }
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;
    const key = activityId ? `${folder}/${activityId}/${fileName}` : `${folder}/${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });
      await this.s3Client.send(command);
      return key;
    } catch (error) {
      console.error('Error uploading file to R2:', error);
      throw new BadRequestException('Error al subir el archivo');
    }
  }

  async replaceFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      await this.s3Client.send(command);
      return key;
    } catch (error) {
      console.error('Error replacing file in R2:', error);
      throw new BadRequestException('Error al reemplazar el archivo');
    }
  }

  async getSignedUrl(key: string, expiresIn = 7 * 24 * 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new BadRequestException('Error al generar URL del archivo');
    }
  }

  // Si es una key relativa (photos/... o actas/...), arma la URL pública o
  // firmada. Si ya es una URL completa (dato migrado del hub, que guardaba
  // URLs firmadas o públicas directamente en `photos`), la reescribe a URL
  // pública permanente cuando puede extraer la key; si no, la deja tal cual.
  async getFileUrl(key: string): Promise<string> {
    const publicUrl = this.publicUrl;

    if (key.startsWith('http://') || key.startsWith('https://')) {
      if (publicUrl && key.startsWith(publicUrl)) {
        return key;
      }
      if (key.includes('r2.cloudflarestorage.com')) {
        try {
          const urlObj = new URL(key);
          const pathParts = urlObj.pathname.split('/').filter((p) => p);
          let extractedKey = '';
          const bucketIndex = pathParts.findIndex((part) => part === this.bucketName);
          if (bucketIndex >= 0 && bucketIndex < pathParts.length - 1) {
            extractedKey = pathParts.slice(bucketIndex + 1).join('/');
          } else if (pathParts.length > 0) {
            extractedKey = pathParts.join('/');
          }
          if (extractedKey && publicUrl) {
            return `${publicUrl}/${extractedKey}`;
          }
        } catch (e) {
          console.error('Error extrayendo key de URL firmada:', e);
        }
      }
      return key;
    }

    if (publicUrl) {
      return `${publicUrl}/${key}`;
    }
    return await this.getSignedUrl(key);
  }

  async getFileBuffer(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
      const response = await this.s3Client.send(command);
      if (!response.Body) return null;
      const chunks: Uint8Array[] = [];
      // @ts-ignore - Body puede ser un stream
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error('Error obteniendo archivo de R2:', error);
      throw new BadRequestException('Error al obtener el archivo');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({ Bucket: this.bucketName, Key: key });
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from R2:', error);
      throw new BadRequestException('Error al eliminar el archivo');
    }
  }
}
