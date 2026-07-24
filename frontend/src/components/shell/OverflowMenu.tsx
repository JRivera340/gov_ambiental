import React, { useState, useRef, useEffect } from 'react';
import { NavIcon, type NavIconName } from './NavIcon';

export interface OverflowAction {
  key: string;
  label: string;
  icon: NavIconName;
  onClick: () => void;
  variant?: 'success' | 'danger';
}

interface OverflowMenuProps {
  actions: OverflowAction[];
  /** 'icon' = botón "⋯" (móvil); 'inline' = lista siempre visible (pie del SideNav) */
  trigger?: 'icon' | 'inline';
  /** true cuando el SideNav está colapsado a solo-íconos (pie de página) */
  collapsed?: boolean;
}

export const OverflowMenu: React.FC<OverflowMenuProps> = ({ actions, trigger = 'icon', collapsed = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const variantClass = (variant?: 'success' | 'danger') => {
    if (variant === 'danger') return 'text-red-500 hover:bg-red-50';
    if (variant === 'success') return 'text-green-700 hover:bg-green-50';
    return 'text-neutral-600 hover:bg-neutral-50';
  };

  const list = (
    <div className="flex flex-col gap-0.5">
      {actions.map((a) => (
        <button
          key={a.key}
          onClick={() => { a.onClick(); setOpen(false); }}
          title={trigger === 'inline' && collapsed ? a.label : undefined}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-left transition-colors ${trigger === 'inline' && collapsed ? 'justify-center' : ''} ${variantClass(a.variant)}`}
        >
          <NavIcon name={a.icon} className="w-4 h-4 shrink-0" />
          {!(trigger === 'inline' && collapsed) && <span>{a.label}</span>}
        </button>
      ))}
    </div>
  );

  if (trigger === 'inline') return list;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"
        aria-label="Más acciones"
        aria-expanded={open}
      >
        <NavIcon name="more" className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[220px] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-2 z-[1700]">
          {list}
        </div>
      )}
    </div>
  );
};
