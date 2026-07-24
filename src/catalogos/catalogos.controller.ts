import { Controller, Get } from '@nestjs/common';
import { BARRIOS } from './barrio.enum';
import { TIPOS_ACTIVIDAD } from './tipo-actividad.enum';
import { ENTIDADES } from './entidad.enum';

@Controller('catalogs')
export class CatalogosController {
  @Get('barrios')
  getBarrios() {
    return { barrios: BARRIOS };
  }

  @Get('tipos-actividad')
  getTiposActividad() {
    return { tiposActividad: TIPOS_ACTIVIDAD };
  }

  @Get('entidades')
  getEntidades() {
    return { entidades: ENTIDADES };
  }

  @Get('all')
  getAllCatalogos() {
    return {
      barrios: BARRIOS,
      tiposActividad: TIPOS_ACTIVIDAD,
      entidades: ENTIDADES,
    };
  }
}
