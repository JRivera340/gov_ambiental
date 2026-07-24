import React from 'react';
import { NavIcon, type NavIconName } from './NavIcon';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: NavIconName;
  /** Siempre verde, no participa del resaltado activo/inactivo normal. */
  highlight?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ items, activeKey, onSelect }) => (
  <nav
    className="shrink-0 flex bg-white/95 backdrop-blur-md border-t border-neutral-100 shadow-xl z-[1600]"
    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
  >
    {items.map((item) => {
      const active = item.key === activeKey;
      const colorClass = item.highlight
        ? 'text-green-600'
        : active ? 'text-green-700' : 'text-neutral-400 hover:text-neutral-600';
      return (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors ${colorClass}`}
          aria-current={!item.highlight && active ? 'page' : undefined}
        >
          <NavIcon name={item.icon} className={`w-5 h-5 ${item.highlight || active ? 'stroke-[2.5]' : ''}`} />
          <span className={`text-[10px] font-bold ${colorClass}`}>{item.label}</span>
        </button>
      );
    })}
  </nav>
);
