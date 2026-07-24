/**
 * PieChart.tsx — Gráfico de torta reutilizable para el AdminDashboard.
 * Extraído del AdminDashboard.tsx original para modularizar la visualización.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { tipoResiduoColors, residuoLabels } from '../../utils/adminConstants';

// Helper para obtener color de residuo (insensible a mayúsculas)
const getResiduoColor = (key: string): string | undefined => {
  if (!key) return undefined;
  const k = key.trim().toLowerCase();
  const found = Object.entries(tipoResiduoColors).find(([ck]) => ck.toLowerCase() === k);
  return found ? found[1] : undefined;
};

// Helper para etiqueta legible
const getResiduoLabel = (key: string): string | undefined => {
  if (!key) return undefined;
  const k = key.trim().toLowerCase();
  const found = Object.entries(residuoLabels).find(([rk]) => rk.toLowerCase() === k);
  return found ? found[1] : undefined;
};

export interface PieChartProps {
  data: Record<string, number>;
  suffix?: string;
  size?: number;
  hideLegend?: boolean;
  hideCenterText?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  suffix = '',
  size = 140,
  hideLegend = false,
  hideCenterText = false,
}) => {
  const [animationProgress] = useState(1);
  const [prevData, setPrevData] = useState<Record<string, number>>(data);

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  useEffect(() => {
    const dataChanged = JSON.stringify(data) !== JSON.stringify(prevData);
    if (dataChanged) setPrevData(data);
  }, [data, prevData]);

  const radius = 80;
  const centerX = 120;
  const centerY = 120;

  const segments = useMemo(() => {
    let currentAngle = -90;
    return Object.entries(data)
      .filter(([_, count]) => count > 0)
      .map(([cat, count]) => {
        const percentage = (count / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;
        return {
          cat,
          count,
          percentage,
          color: getResiduoColor(cat) || tipoResiduoColors[cat] || '#6b7280',
          startAngle,
          endAngle,
        };
      });
  }, [data, total]);

  if (total === 0) {
    return <p className="text-neutral-400 text-center py-4 text-[10px]">No hay datos</p>;
  }

  return (
    <div className={`flex ${hideLegend ? 'items-center justify-center' : 'flex-col md:flex-row items-center gap-3'}`} style={{ width: '100%', height: '100%' }}>
      <div className="flex-shrink-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox="0 0 240 240" className="drop-shadow-sm">
          {segments.map((seg, idx) => {
            const animatedPercentage = seg.percentage * animationProgress;
            const animatedAngle = Math.max((animatedPercentage / 100) * 360, 0.1);

            let segCurrentAngle = -90;
            for (let i = 0; i < idx; i++) {
              segCurrentAngle += (segments[i].percentage * animationProgress / 100) * 360;
            }

            const startAngleRad = (segCurrentAngle * Math.PI) / 180;
            const endAngleRad = ((segCurrentAngle + animatedAngle) * Math.PI) / 180;
            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);
            const largeArcFlag = animatedAngle > 180 ? 1 : 0;

            if (animatedAngle >= 359.9) {
              return <circle key={seg.cat} cx={centerX} cy={centerY} r={radius} fill={seg.color} stroke="#ffffff" strokeWidth="2" style={{ opacity: 0.9 }} />;
            }

            return (
              <path
                key={seg.cat}
                d={[`M ${centerX} ${centerY}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, 'Z'].join(' ')}
                fill={seg.color}
                stroke="#ffffff"
                strokeWidth="2"
                style={{ opacity: 0.9 }}
              />
            );
          })}
          <circle cx={centerX} cy={centerY} r={radius * 0.6} fill="white" />
          {!hideCenterText && (
            <>
              <text x={centerX} y={centerY - 5} textAnchor="middle" className="font-bold" fill="#1f2937" style={{ fontSize: '28px' }}>
                {Math.round(total * animationProgress)}{suffix}
              </text>
              <text x={centerX} y={centerY + 25} textAnchor="middle" fill="#6b7280" style={{ fontSize: '14px' }}>
                Total
              </text>
            </>
          )}
        </svg>
      </div>
      {!hideLegend && (
        <div className="flex-1 space-y-1 py-1 w-full overflow-y-auto thin-scrollbar">
          {segments.map((seg) => (
            <div key={seg.cat} className="flex items-center justify-between p-1.5 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: seg.color }} />
                <span className="font-medium text-[10px]">{getResiduoLabel(seg.cat) || seg.cat}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold block" style={{ fontSize: '11px', color: seg.color }}>{seg.count}{suffix}</span>
                <span className="text-[9px] text-neutral-500">{seg.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
