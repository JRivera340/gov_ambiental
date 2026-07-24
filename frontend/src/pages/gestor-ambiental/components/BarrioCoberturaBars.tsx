import React from 'react';

interface BarrioCoberturaBarsProps {
  data: { barrio: string; count: number }[];
  maxCount: number;
}

export const BarrioCoberturaBars: React.FC<BarrioCoberturaBarsProps> = ({ data, maxCount }) => {
  if (data.length === 0) return <p className="text-[11px] text-neutral-400">Sin datos</p>;
  return (
    <div className="flex flex-col gap-2">
      {data.map(({ barrio, count }) => (
        <div key={barrio}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-neutral-700 truncate max-w-[180px]">{barrio}</span>
            <span className="text-[11px] font-bold text-neutral-500">{count}</span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
