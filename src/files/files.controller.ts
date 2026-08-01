import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { FilesService } from './files.service';

const MAX_PHOTOS = 5;

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // Sirve el archivo cuando STORAGE_DRIVER=local (ver files.service.ts).
  // Público a propósito: en modo S3 el equivalente es una URL pública/firmada
  // que tampoco pasa por el guard de JWT — un <img src> no puede mandar
  // Authorization, así que exigir sesión acá rompería las fotos en la UI.
  @Get('raw/*key')
  async getRaw(@Param('key') key: string | string[], @Res() res: Response) {
    try {
      const keyStr = Array.isArray(key) ? key.join('/') : key;
      const buffer = await this.filesService.readLocalFile(keyStr);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buffer);
    } catch {
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  @Post('acta')
  @UseInterceptors(FileInterceptor('file'))
  async uploadActa(
    @UploadedFile() file: Express.Multer.File,
    @Body('activityId') activityId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const key = await this.filesService.uploadFile(file, 'actas', activityId);
    const url = await this.filesService.getFileUrl(key);

    return {
      success: true,
      key,
      url,
      message: 'Acta subida exitosamente',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  @Post('photos')
  @UseInterceptors(FilesInterceptor('files', MAX_PHOTOS))
  async uploadPhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('activityId') activityId?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron archivos');
    }

    if (files.length > MAX_PHOTOS) {
      throw new BadRequestException(`No puede subir más de ${MAX_PHOTOS} fotos`);
    }

    const keys = await Promise.all(
      files.map((file) => this.filesService.uploadFile(file, 'photos', activityId)),
    );
    const urls = await Promise.all(keys.map((key) => this.filesService.getFileUrl(key)));

    return {
      success: true,
      keys,
      urls,
      count: files.length,
      message: `${files.length} foto(s) subida(s) exitosamente`,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  @Get(':key')
  async getFileUrl(@Param('key') key: string) {
    const url = await this.filesService.getFileUrl(decodeURIComponent(key));
    return { url };
  }
}
