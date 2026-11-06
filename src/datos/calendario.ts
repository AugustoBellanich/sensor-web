// Copiado de sensor-app/src/datos/calendario.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Cuentas del calendario chico de los campos de fecha: semanas de lunes a domingo.

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"] as const;

/** Mes de calendario: año y mes de 1 a 12. */
export type Mes = { anio: number; mes: number };

/** Mes de una fecha AAAA-MM-DD. */
export function mesDe(iso: string): Mes {
  return { anio: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) };
}

/** Mes anterior o siguiente. */
export function moverMes(m: Mes, delta: number): Mes {
  const total = m.anio * 12 + (m.mes - 1) + delta;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/** AAAA-MM-DD de un día del mes. */
export function isoDe(m: Mes, dia: number): string {
  return `${m.anio}-${String(m.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Semanas del mes, de lunes a domingo. Cada casilla es la fecha AAAA-MM-DD o null si cae en otro
 * mes. Siempre filas completas de 7.
 */
export function semanasDelMes(m: Mes): (string | null)[][] {
  const dias = new Date(Date.UTC(m.anio, m.mes, 0)).getUTCDate();
  const primero = new Date(Date.UTC(m.anio, m.mes - 1, 1)).getUTCDay(); // 0 = domingo
  const vacias = (primero + 6) % 7; // casillas antes del día 1, empezando el lunes
  const casillas: (string | null)[] = [
    ...Array<null>(vacias).fill(null),
    ...Array.from({ length: dias }, (_, i) => isoDe(m, i + 1)),
  ];
  while (casillas.length % 7) casillas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < casillas.length; i += 7) semanas.push(casillas.slice(i, i + 7));
  return semanas;
}

// ---------------------------------------------------------------- rango de días

/** Días marcados al elegir un rango: el primero, y el último cuando ya se tocó. */
export type Seleccion = { inicio: string | null; fin: string | null };

/**
 * Elegir un rango con dos toques: el primero marca el inicio y el segundo el fin (si se toca un
 * día anterior, pasa a ser el inicio). Con el rango completo, un toque nuevo empieza otro.
 */
export function tocarDia(s: Seleccion, iso: string): Seleccion {
  if (!s.inicio || s.fin) return { inicio: iso, fin: null };
  return iso < s.inicio ? { inicio: iso, fin: s.inicio } : { inicio: s.inicio, fin: iso };
}

/** Lugar del día en la selección, para pintarlo. */
export function lugarEnRango(s: Seleccion, iso: string): "borde" | "medio" | null {
  if (iso === s.inicio || iso === s.fin) return "borde";
  if (s.inicio && s.fin && iso > s.inicio && iso < s.fin) return "medio";
  return null;
}
