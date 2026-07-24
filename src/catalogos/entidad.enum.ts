// Entidades responsables de operativos en espacio publico
export enum Entidad {
  UAESP = 'UAESP',
  PROMOAMBIENTAL = 'Promoambiental',
  IVC = 'IVC',
  ALCALDIA_SANTA_FE = 'Alcaldía Local de Santa Fé',
  POLICIA = 'Policía Nacional',
  EJERCITO = 'Ejército Nacional',
  SECRETARIA_GOBIERNO = 'Secretaría de Gobierno',
  SECRETARIA_SEGURIDAD = 'Secretaría de Seguridad',
  INSPECCION_POLICIA = 'Inspección de Policía',
  PERSONERIA = 'Personería',
  DEFENSORIA = 'Defensoría del Pueblo',
  ICBF = 'ICBF',
  FISCALIA = 'Fiscalía',
  TRANSITO = 'Tránsito',
  BOMBEROS = 'Bomberos',
  CRUZ_ROJA = 'Cruz Roja',
  DEFENSA_CIVIL = 'Defensa Civil',
  INTEGRACION_SOCIAL = 'Integración Social',
  POLICIA_TRANSITO = 'Policía de Transito',
  SECRETARIA_MOVILIDAD = 'Secretaría de Movilidad',
}

export const ENTIDADES = Object.values(Entidad);
