import React from 'react';
import { NavIcon, type NavIconName } from './NavIcon';

export interface SideNavItem {
  key: string;
  label: string;
  icon: NavIconName;
  /** Siempre verde, no participa del resaltado activo/inactivo normal. */
  highlight?: boolean;
}

interface SideNavProps {
  items: SideNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  footer?: (collapsed: boolean) => React.ReactNode;
}

export const SideNav: React.FC<SideNavProps> = ({ items, activeKey, onSelect, collapsed, onToggleCollapse, footer }) => (
  <aside className={`shrink-0 hidden md:flex flex-col bg-white border-r border-neutral-100 transition-all ${collapsed ? 'w-[72px]' : 'w-56'}`}>
    <button
      onClick={onToggleCollapse}
      className="m-2 self-end p-2 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
      aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
    >
      <NavIcon name={collapsed ? 'chevron-right' : 'chevron-left'} className="w-4 h-4" />
    </button>
    <nav className="flex-1 flex flex-col gap-1 px-2">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${collapsed ? 'justify-center' : ''} ${
              item.highlight
                ? 'bg-green-600 text-white hover:bg-green-700'
                : active ? 'bg-green-50 text-green-700' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
            }`}
            aria-current={!item.highlight && active ? 'page' : undefined}
          >
            <NavIcon name={item.icon} className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </nav>
    {footer && <div className="p-2 border-t border-neutral-100">{footer(collapsed)}</div>}
  </aside>
);
