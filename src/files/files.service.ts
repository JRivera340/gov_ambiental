import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getEnv } from '../config/env';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 3600;

export type FileFolder = 'actas' | 'photos';

// Dos drivers de almacenamiento (ver env.schema.ts, STORAGE_DRIVER):
// - 'local' (default): guarda en disco bajo UPLOADS_DIR, se sirve desde
//   este mismo backend en GET /api/files/raw/:key — sin configurar nada
//   externo, pensado para instalar el módulo standalone.
// - 's3': cliente compatible con S3 (R2, AWS, etc), como antes.
@Injectable()
export class FilesService {
  private readonly driver: 'local' | 's3';
  private readonly uploadsDir: string;
  private readonly apiPublicUrl: string;
  private readonly s3Client?: S3Client;
  private readonly bucketName?: string;
  private readonly publicUrl: string | null;

  constructor() {
    const env = getEnv();
    this.driver = env.STORAGE_DRIVER;
    this.uploadsDir = path.resolve(process.cwd(), env.UPLOADS_DIR);
    this.apiPublicUrl = env.API_PUBLIC_URL.replace(/\/$/, '');
    this.publicUrl = env.S3_PUBLIC_URL ?? null;

    if (this.driver === 's3') {
      if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
        throw new InternalServerErrorException(
          'STORAGE_DRIVER=s3 requiere S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY',
        );
      }
      this.bucketName = env.S3_BUCKET;
      this.s3Client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
      });
    }
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

    if (this.driver === 'local') {
      return this.saveLocal(key, file.buffer);
    }
    return this.saveS3(key, file.buffer, file.mimetype);
  }

  private async saveLocal(key: string, buffer: Buffer): Promise<string> {
    try {
      const destino = path.join(this.uploadsDir, key);
      await fs.mkdir(path.dirname(destino), { recursive: true });
      await fs.writeFile(destino, buffer);
      return key;
    } catch (error) {
      console.error('[FILES] Error guardando archivo en disco:', error);
      throw new BadRequestException('Error al guardar el archivo');
    }
  }

  private async saveS3(key: string, buffer: Buffer, mimetype: string): Promise<string> {
    try {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: this.bucketName!,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        }),
      );
      return key;
    } catch (error) {
      console.error('[FILES] Error subiendo archivo:', error);
      throw new BadRequestException('Error al subir el archivo');
    }
  }

  async getFileUrl(key: string): Promise<string> {
    if (this.driver === 'local') {
      return `${this.apiPublicUrl}/api/files/raw/${key}`;
    }

    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }

    try {
      const command = new GetObjectCommand({ Bucket: this.bucketName!, Key: key });
      return await getSignedUrl(this.s3Client!, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
    } catch (error) {
      console.error('[FILES] Error generando URL del archivo:', error);
      throw new BadRequestException('Error al generar la URL del archivo');
    }
  }

  // Solo se usa en modo local (ver FilesController::getRaw) para leer el
  // archivo del disco y transmitirlo en la respuesta.
  async readLocalFile(key: string): Promise<Buffer> {
    const destino = path.join(this.uploadsDir, key);
    // Evita path traversal (".." fuera de uploadsDir) — la key siempre debe
    // resolver dentro de this.uploadsDir.
    if (!destino.startsWith(this.uploadsDir)) {
      throw new BadRequestException('Ruta de archivo inválida');
    }
    return fs.readFile(destino);
  }
}
