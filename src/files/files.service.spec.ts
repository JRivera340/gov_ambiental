import { BadRequestException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  let sendMock: jest.SpyInstance;

  beforeEach(() => {
    process.env.JWT_SECRET = 'secret';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';
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

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('sube una foto valida y devuelve una key bajo photos/', async () => {
    const service = new FilesService();
    const key = await service.uploadFile(makeFile(), 'photos');

    expect(key).toMatch(/^photos\/.+\.jpg$/);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('sube una foto y la agrupa bajo el activityId cuando se provee', async () => {
    const service = new FilesService();
    const key = await service.uploadFile(makeFile(), 'photos', 'punto-1');

    expect(key).toMatch(/^photos\/punto-1\/.+\.jpg$/);
  });

  it('rechaza una foto con mimetype no permitido', async () => {
    const service = new FilesService();
    await expect(
      service.uploadFile(makeFile({ mimetype: 'application/pdf', originalname: 'foto.pdf' }), 'photos'),
    ).rejects.toThrow(BadRequestException);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rechaza una foto que excede 10MB', async () => {
    const service = new FilesService();
    await expect(
      service.uploadFile(makeFile({ size: 11 * 1024 * 1024 }), 'photos'),
    ).rejects.toThrow('Cada foto no puede exceder 10MB');
  });

  it('sube un acta PDF valida', async () => {
    const service = new FilesService();
    const file = makeFile({ mimetype: 'application/pdf', originalname: 'acta.pdf' });
    const key = await service.uploadFile(file, 'actas');

    expect(key).toMatch(/^actas\/.+\.pdf$/);
  });

  it('rechaza un acta que no es PDF', async () => {
    const service = new FilesService();
    await expect(service.uploadFile(makeFile(), 'actas')).rejects.toThrow(
      'El acta debe ser un archivo PDF',
    );
  });

  it('rechaza un acta que excede 10MB', async () => {
    const service = new FilesService();
    const file = makeFile({
      mimetype: 'application/pdf',
      originalname: 'acta.pdf',
      size: 11 * 1024 * 1024,
    });
    await expect(service.uploadFile(file, 'actas')).rejects.toThrow('El PDF no puede exceder 10MB');
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
    expect(() => new FilesService()).toThrow(/Variables de entorno/);
  });
});
