// Sondas del B01 en el esquema del perfil (D-125): color de cada una y su última humedad.

export const COLOR_SONDA = ["#2563eb", "#16a34a", "#ea580c"];

export type HumedadSonda = { valor: number; unidad: string; t: string };

/** Última humedad de cada sonda si la lectura es de las últimas 24 h (% vol; si no, % grav). */
export function humedadDeSondas(
  ultima:
    | ({ t: string } & Partial<Record<string, number | null | string | string[] | undefined>>)
    | null
    | undefined,
  ahora = Date.now(),
): Partial<Record<number, HumedadSonda>> {
  const out: Partial<Record<number, HumedadSonda>> = {};
  if (!ultima || ahora - Date.parse(ultima.t) > 24 * 3600 * 1000) return out;
  for (const i of [1, 2, 3]) {
    const hv = ultima[`e${i}_hv`];
    const hg = ultima[`e${i}_hg`];
    if (typeof hv === "number")
      out[i] = { valor: hv, unidad: "% vol", t: ultima.t };
    else if (typeof hg === "number")
      out[i] = { valor: hg, unidad: "% grav", t: ultima.t };
  }
  return out;
}
