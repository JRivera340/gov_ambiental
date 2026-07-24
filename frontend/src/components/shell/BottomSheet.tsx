import React from 'react';
import { NavIcon } from './NavIcon';

export type BottomSheetState = 'collapsed' | 'expanded' | 'full';

interface BottomSheetProps {
  state: BottomSheetState;
  onStateChange: (state: BottomSheetState) => void;
  title: string;
  count?: number;
  children: React.ReactNode;
}

const HEIGHTS: Record<BottomSheetState, string> = {
  collapsed: '56px',
  expanded: '45vh',
  full: 'calc(100% - 16px)',
};

const NEXT_UP: Record<BottomSheetState, BottomSheetState> = {
  collapsed: 'expanded',
  expanded: 'full',
  full: 'full',
};

const NEXT_DOWN: Record<BottomSheetState, BottomSheetState> = {
  collapsed: 'collapsed',
  expanded: 'collapsed',
  full: 'expanded',
};

export const BottomSheet: React.FC<BottomSheetProps> = ({ state, onStateChange, title, count, children }) => (
  <div
    className="absolute bottom-0 left-0 right-0 bg-white/97 backdrop-blur-md rounded-t-[24px] shadow-2xl border-t border-white/50 flex flex-col overflow-hidden transition-[height] duration-300 ease-out z-[1400]"
    style={{ height: HEIGHTS[state] }}
  >
    <div className="shrink-0 flex items-center justify-between gap-2 pt-2 pb-2 pl-4 pr-2">
      <span className="flex items-center gap-2 text-xs font-bold text-neutral-700 uppercase tracking-widest">
        {title}
        {typeof count === 'number' && (
          <span className="bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5 text-[11px]">{count}</span>
        )}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onStateChange(NEXT_DOWN[state])}
          disabled={state === 'collapsed'}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Bajar el panel de puntos"
        >
          <NavIcon name="chevron-down" className="w-4 h-4" />
        </button>
        <button
          onClick={() => onStateChange(NEXT_UP[state])}
          disabled={state === 'full'}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Subir el panel de puntos"
        >
          <NavIcon name="chevron-up" className="w-4 h-4" />
        </button>
      </div>
    </div>
    {state !== 'collapsed' && (
      <div className="flex-1 overflow-y-auto">{children}</div>
    )}
  </div>
);
