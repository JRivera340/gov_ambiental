import React from 'react';

interface Option { value: string; label: string }
interface SurveyFieldQuestion {
  id: string;
  type: string;
  label?: string;
  placeholder?: string;
  options?: Option[];
}

interface Props {
  question: SurveyFieldQuestion;
  value: any;
  onChange: (id: string, value: any) => void;
}

// Render del input de una pregunta de encuesta (sin label). Fuente unica usada
// por CreateActivity (DynamicFields) y EditActivity para que ambos formularios
// muestren y se comporten igual: un cambio aqui se refleja en crear y actualizar.
export const SurveyFieldInput: React.FC<Props> = ({ question: q, value, onChange }) => {
  const type = String(q.type).toUpperCase();
  const val = value ?? '';

  if (type === 'NUMBER') {
    return (
      <input
        type="number"
        min="0"
        step="any"
        value={value ?? ''}
        onChange={(e) => onChange(q.id, e.target.value === '' ? undefined : Number(e.target.value))}
        className="input-field"
        placeholder={q.placeholder || '0'}
      />
    );
  }
  if (type === 'TEXTAREA' || type === 'TEXT') {
    return (
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(q.id, e.target.value || undefined)}
        rows={type === 'TEXTAREA' ? 4 : 1}
        className="input-field"
        placeholder={q.placeholder || ''}
      />
    );
  }
  if (type === 'DATE') {
    return (
      <input
        type="datetime-local"
        value={value ?? ''}
        onChange={(e) => onChange(q.id, e.target.value)}
        className="input-field"
      />
    );
  }
  if (type === 'RADIO' || type === 'SELECT') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(q.options || []).map((o) => (
          <label key={o.value} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${String(val) === o.value ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-neutral-100 hover:border-neutral-200'}`}>
            <input
              type="radio"
              name={q.id}
              value={o.value}
              checked={String(val) === o.value}
              onChange={() => onChange(q.id, o.value)}
              className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
            />
            <span className={`text-sm ${String(val) === o.value ? 'text-primary font-bold' : 'text-neutral-600'}`}>{o.label}</span>
          </label>
        ))}
      </div>
    );
  }
  if (type === 'MULTISELECT') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(q.options || []).map((o) => {
          const on = arr.includes(o.value);
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => onChange(q.id, on ? arr.filter((x: string) => x !== o.value) : [...arr, o.value])}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${on ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-neutral-200 text-neutral-600'}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  return <input type="text" value={val} onChange={(e) => onChange(q.id, e.target.value)} className="input-field" />;
};
