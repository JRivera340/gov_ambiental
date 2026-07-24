import { PuntosService } from './puntos.service';
import { InMemoryPuntosRepository } from './puntos.repository.memory';

describe('PuntosService', () => {
  const makeService = () => {
    const repo = new InMemoryPuntosRepository();
    return { service: new PuntosService(repo), repo };
  };

  it('crea un punto asignando el creador desde el usuario autenticado', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 4.1, lng: -74.2, barrio: 'Centro' });
    expect(punto.createdByUserId).toBe('user-1');
    expect(punto.status).toBe('BORRADOR');
    expect(punto.residuos).toEqual([]);
  });

  it('findMine devuelve solo los puntos del usuario que pregunta', async () => {
    const { service } = makeService();
    await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await service.create('user-2', { lat: 2, lng: 2, barrio: 'B' });

    const mios = await service.findMine('user-1');
    expect(mios).toHaveLength(1);
    expect(mios[0].createdByUserId).toBe('user-1');
  });
});
