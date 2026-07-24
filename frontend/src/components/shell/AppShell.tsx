import React from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { BottomNav, type BottomNavItem } from './BottomNav';
import { SideNav } from './SideNav';
import { OverflowMenu, type OverflowAction } from './OverflowMenu';

interface AppShellProps {
  title: string;
  subtitle?: string;
  navItems: BottomNavItem[];
  activeNavKey: string;
  onSelectNav: (key: string) => void;
  secondaryActions: OverflowAction[];
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  title,
  subtitle,
  navItems,
  activeNavKey,
  onSelectNav,
  secondaryActions,
  children,
}) => {
  const [collapsed, setCollapsed] = usePersistentState<boolean>('sidenav-collapsed', false);

  return (
    // 100vh en navegadores móviles incluye la barra de direcciones oculta —
    // el layout queda más alto que el viewport visible y el BottomNav se
    // renderiza fuera de pantalla. 100dvh sigue el viewport visible real;
    // se mantiene la clase h-screen como fallback si dvh no es soportado.
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-neutral-50" style={{ height: '100dvh' }}>
      {/* Header angosto — visible siempre, acciones secundarias solo aquí en móvil */}
      <header className="shrink-0 flex items-center justify-between bg-white border-b border-neutral-100 px-4 py-2.5 md:hidden">
        <div>
          <h1 className="text-base font-black text-neutral-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-[11px] text-neutral-400 font-medium">{subtitle}</p>}
        </div>
        <OverflowMenu actions={secondaryActions} trigger="icon" />
      </header>

      <div className="flex-1 flex flex-row overflow-hidden">
        <SideNav
          items={navItems}
          activeKey={activeNavKey}
          onSelect={onSelectNav}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          footer={(navCollapsed) => <OverflowMenu actions={secondaryActions} trigger="inline" collapsed={navCollapsed} />}
        />
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </div>

      <div className="md:hidden">
        <BottomNav items={navItems} activeKey={activeNavKey} onSelect={onSelectNav} />
      </div>
    </div>
  );
};
