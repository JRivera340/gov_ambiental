import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FilesService } from './files.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'evidencia.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('contenido'),
    destination: '',
    filename: '',
    path: '',
    stream: undefined as any,
    ...overrides,
  };
}

describe('FilesService', () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'files-service-test-'));
    process.env.JWT_SECRET = 'secret';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';
    process.env.API_PUBLIC_URL = 'http://localhost:3001';
    jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('driver local (default)', () => {
    it('sube una foto y la guarda en disco bajo UPLOADS_DIR', async () => {
      const service = new FilesService();
      const key = await service.uploadFile(makeFile(), 'photos');

      expect(key).toMatch(/^photos\/.+\.jpg$/);
      const guardado = await fs.readFile(path.join(tmpDir, 'uploads', key));
      expect(guardado.toString()).toBe('contenido');
    });

    it('agrupa bajo el activityId cuando se provee', async () => {
      const service = new FilesService();
      const key = await service.uploadFile(makeFile(), 'photos', 'punto-1');
      expect(key).toMatch(/^photos\/punto-1\/.+\.jpg$/);
    });

    it('rechaza una foto con mimetype no permitido', async () => {
      const service = new FilesService();
      await expect(
        service.uploadFile(makeFile({ mimetype: 'application/pdf', originalname: 'foto.pdf' }), 'photos'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza una foto que excede 10MB', async () => {
      const service = new FilesService();
      await expect(
        service.uploadFile(makeFile({ size: 11 * 1024 * 1024 }), 'photos'),
      ).rejects.toThrow('Cada foto no puede exceder 10MB');
    });

    it('rechaza un acta que no es PDF', async () => {
      const service = new FilesService();
      await expect(service.uploadFile(makeFile(), 'actas')).rejects.toThrow(
        'El acta debe ser un archivo PDF',
      );
    });

    it('getFileUrl construye la URL de descarga propia (GET /api/files/raw/:key)', async () => {
      const service = new FilesService();
      const url = await service.getFileUrl('photos/abc.jpg');
      expect(url).toBe('http://localhost:3001/api/files/raw/photos/abc.jpg');
    });

    it('readLocalFile lee lo que uploadFile guardó', async () => {
      const service = new FilesService();
      const key = await service.uploadFile(makeFile(), 'photos');
      const buffer = await service.readLocalFile(key);
      expect(buffer.toString()).toBe('contenido');
    });
  });

  describe('driver s3', () => {
    let sendMock: jest.SpyInstance;

    beforeEach(() => {
      process.env.STORAGE_DRIVER = 's3';
      process.env.S3_ENDPOINT = 'https://s3.test.local';
      process.env.S3_REGION = 'auto';
      process.env.S3_BUCKET = 'bucket-test';
      process.env.S3_ACCESS_KEY_ID = 'key-id';
      process.env.S3_SECRET_ACCESS_KEY = 'secret-key';
      delete process.env.S3_PUBLIC_URL;

      sendMock = jest.spyOn(S3Client.prototype, 'send') as unknown as jest.SpyInstance;
      sendMock.mockResolvedValue({});
      (getSignedUrl as jest.Mock).mockReset();
    });

    it('sube una foto valida al bucket S3', async () => {
      const service = new FilesService();
      const key = await service.uploadFile(makeFile(), 'photos');

      expect(key).toMatch(/^photos\/.+\.jpg$/);
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('getFileUrl usa S3_PUBLIC_URL cuando esta configurado, sin firmar', async () => {
      process.env.S3_PUBLIC_URL = 'https://cdn.test.local';
      const service = new FilesService();

      const url = await service.getFileUrl('photos/abc.jpg');

      expect(url).toBe('https://cdn.test.local/photos/abc.jpg');
      expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it('getFileUrl genera una URL firmada cuando no hay S3_PUBLIC_URL', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.test.local/signed?token=abc');
      const service = new FilesService();

      const url = await service.getFileUrl('photos/abc.jpg');

      expect(url).toBe('https://s3.test.local/signed?token=abc');
      expect(getSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('falla al construir el servicio si falta una variable S3 requerida', () => {
      delete process.env.S3_BUCKET;
      expect(() => new FilesService()).toThrow(InternalServerErrorException);
    });
  });
});
