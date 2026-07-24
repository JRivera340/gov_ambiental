import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(() => {
    controller = new AppController(new AppService());
  });

  it('health() devuelve status ok', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });

  it('getHello() devuelve un saludo', () => {
    expect(controller.getHello()).toContain('Ambiental');
  });
});
