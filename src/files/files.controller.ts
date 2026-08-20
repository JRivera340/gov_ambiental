import {
  Controller,
  Post,
  Put,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
  Body,
  Get,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // POST /files/acta
  @Post('acta')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
  async uploadActa(
    @UploadedFile() file: Express.Multer.File,
    @Body('activityId') activityId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    const key = await this.filesService.uploadFile(file, 'actas', activityId);
    const url = await this.filesService.getFileUrl(key);
    return { success: true, key, url, message: 'Acta subida exitosamente' };
  }

  // POST /files/photos
  @Post('photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('files', 5))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
  async uploadPhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('activityId') activityId?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron archivos');
    }
    if (files.length > 5) {
      throw new BadRequestException('No puede subir más de 5 fotos');
    }

    const keys = await Promise.all(files.map((file) => this.filesService.uploadFile(file, 'photos', activityId)));
    const urls = await Promise.all(keys.map((key) => this.filesService.getFileUrl(key)));

    return { success: true, keys, urls, count: files.length, message: `${files.length} foto(s) subida(s) exitosamente` };
  }

  // GET /files/proxy/* — público, sin auth (headers de auth no viajan en <img> tags).
  @Get('proxy/*')
  async proxyFile(@Param('0') key: string, @Res() res: Response) {
    try {
      let decodedKey = key || '';
      try {
        decodedKey = decodeURIComponent(decodedKey);
      } catch {
        decodedKey = key;
      }

      const fileBuffer = await this.filesService.getFileBuffer(decodedKey);
      if (!fileBuffer) {
        throw new NotFoundException(`Archivo no encontrado: ${decodedKey}`);
      }

      const contentType = this.getContentType(decodedKey);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(fileBuffer);
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Error al obtener el archivo: ${error.message}`);
    }
  }

  // PUT /files/replace/*
  @Put('replace/*')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async replaceFile(@Param('0') key: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    try {
      let decodedKey = key || '';
      try {
        decodedKey = decodeURIComponent(decodedKey);
      } catch {
        decodedKey = key;
      }
      const replacedKey = await this.filesService.replaceFile(file.buffer, decodedKey, file.mimetype);
      return { success: true, key: replacedKey, message: 'Archivo reemplazado exitosamente' };
    } catch (error: any) {
      throw new BadRequestException('Error al reemplazar el archivo');
    }
  }

  // GET /files/config/public-url
  @Get('config/public-url')
  async getPublicUrl() {
    return { publicUrl: this.filesService.getPublicUrl() };
  }

  // GET /files/:key
  @Get(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  async getFileUrl(@Param('key') key: string) {
    const url = await this.filesService.getFileUrl(decodeURIComponent(key));
    return { url };
  }

  private getContentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      pdf: 'application/pdf',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  // DELETE /files/:key
  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  async deleteFile(@Param('key') key: string) {
    await this.filesService.deleteFile(key);
    return { success: true, message: 'Archivo eliminado exitosamente' };
  }
}
