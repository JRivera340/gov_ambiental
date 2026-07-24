import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePuntoDto } from './create-punto.dto';

describe('CreatePuntoDto', () => {
  it('rejects a payload with a missing field and a wrong type', async () => {
    const dto = plainToInstance(CreatePuntoDto, {
      lat: 'no-es-un-numero',
      barrio: 'Centro',
      // lng falta
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a well-formed payload', async () => {
    const dto = plainToInstance(CreatePuntoDto, {
      lat: 4.6,
      lng: -74.1,
      barrio: 'Centro',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
