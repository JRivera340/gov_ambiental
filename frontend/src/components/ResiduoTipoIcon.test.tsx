/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ResiduoTipoIcon } from './ResiduoTipoIcon';

describe('ResiduoTipoIcon', () => {
  it('colorea distinto cada tipo conocido', () => {
    const { container: ordinarios } = render(<ResiduoTipoIcon tipo="RESIDUOS_ORDINARIOS" />);
    const { container: voluminosos } = render(<ResiduoTipoIcon tipo="RESIDUOS_VOLUMINOSOS" />);
    const { container: escombros } = render(<ResiduoTipoIcon tipo="ESCOMBROS" />);

    const bg = (c: HTMLElement) => c.querySelector('span')?.style.background;
    expect(bg(ordinarios)).toBe('#3b82f6');
    expect(bg(voluminosos)).toBe('#f97316');
    expect(bg(escombros)).toBe('#8b5cf6');
    expect(bg(ordinarios)).not.toBe(bg(voluminosos));
  });

  it('cae a color gris para un tipo desconocido, sin romper', () => {
    const { container } = render(<ResiduoTipoIcon tipo="ALGO_RARO" />);
    expect(container.querySelector('span')?.style.background).toBe('#6b7280');
  });
});
