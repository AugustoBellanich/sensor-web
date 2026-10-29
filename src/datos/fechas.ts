// Copiado de sensor-app/src/datos/fechas.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Fechas como las escribe la gente acá (DD/MM/AAAA) ↔ como las guarda la base (AAAA-MM-DD).

export function hoyIso(ahora: Date = new Date()): string {
  const d = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

/** "5/9/2026" o "05-09-26" → "2026-09-05"; null si no es una fecha válida. */
export function leerFecha(texto: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  let anio = Number(m[3]);
  if (anio < 100) anio += 2000;
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  if (f.getUTCFullYear() !== anio || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== dia) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** "2026-09-05" → "05/09/2026". */
export function mostrarFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Fecha de calendario a instante para las RPC de asignación: el inicio del día en Argentina. */
export function inicioDelDia(iso: string): string {
  return `${iso}T00:00:00-03:00`;
}

// Fecha y hora siempre en 24 h y en hora argentina (UTC−3), escritas a mano: toLocaleString
// depende de la configuración del teléfono y en algunos sale "2:05 p. m.".
const dos = (n: number) => String(n).padStart(2, "0");
const enArg = (t: Date | string | number) => new Date(new Date(t).getTime() - 3 * 3600e3);

/** "20/10/2026 14:05". */
export function fechaHora(t: Date | string | number): string {
  const d = enArg(t);
  if (Number.isNaN(d.getTime())) return "—";
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}

/** "14:05:09". */
export function horaConSegundos(t: Date | string | number): string {
  const d = enArg(t);
  if (Number.isNaN(d.getTime())) return "—";
  return `${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}:${dos(d.getUTCSeconds())}`;
}
