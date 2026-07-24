export type VisibleIf = { name: string; value?: string; valueIn?: string[] };

// Evalúa la condición visibleIf de una pregunta. `resolveValueByName` devuelve el
// valor actual de otra pregunta dado su `name`. Regla: si el valor objetivo aún no
// existe, NO se oculta (visible), para no esconder campos por falta de dato.
export function isFieldVisible(
  visibleIf: VisibleIf | undefined,
  resolveValueByName: (name: string) => unknown,
): boolean {
  if (!visibleIf) return true;
  const current = resolveValueByName(visibleIf.name);
  if (current === undefined || current === null || current === '') return true;
  const cur = String(current).toLowerCase();
  if (Array.isArray(visibleIf.valueIn)) {
    return visibleIf.valueIn.some((v) => String(v).toLowerCase() === cur);
  }
  if (visibleIf.value !== undefined) {
    return cur === String(visibleIf.value).toLowerCase();
  }
  return true;
}
