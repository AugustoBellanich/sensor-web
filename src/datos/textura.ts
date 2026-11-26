// Textura y color de las capas del perfil (D-125): la clase textural USDA a partir de arena, limo y
// arcilla (o solo la clase, si se clasificó al tacto o por sedimentación), y el color con que se
// dibuja cada capa: el Munsell si se cargó y, si no, un color genérico de tierra que cambia sutilmente
// con la profundidad y la textura (no es un dato: el esquema lo aclara).
import { TEXTURAS } from "./calibracion";
import { MUNSELL } from "./munsell";

export type Clase = (typeof TEXTURAS)[number];
export type Fracciones = { arena: number; limo: number; arcilla: number };

/** Arena, limo y arcilla (%): completa la que falta y normaliza si suman entre 95 y 105. */
export function fracciones(
  arena: number | null | undefined,
  limo: number | null | undefined,
  arcilla: number | null | undefined,
): Fracciones | null {
  const v = [arena, limo, arcilla].map((x) => (x == null ? null : x));
  const faltan = v.filter((x) => x == null).length;
  if (faltan > 1) return null;
  if (faltan === 1) {
    const suma = v.reduce<number>((s, x) => s + (x ?? 0), 0);
    if (suma > 100) return null;
    const i = v.indexOf(null);
    v[i] = 100 - suma;
  }
  const [a, l, c] = v as number[];
  const suma = a + l + c;
  if (a < 0 || l < 0 || c < 0 || suma < 95 || suma > 105) return null;
  return {
    arena: (a * 100) / suma,
    limo: (l * 100) / suma,
    arcilla: (c * 100) / suma,
  };
}

/** Clase textural del triángulo USDA (nombres en castellano de TEXTURAS). */
export function claseUSDA({ arena, limo, arcilla }: Fracciones): Clase {
  if (limo + 1.5 * arcilla < 15) return "Arenoso";
  if (limo + 2 * arcilla < 30) return "Arenoso franco";
  if (
    (arcilla >= 7 && arcilla < 20 && arena > 52) ||
    (arcilla < 7 && limo < 50)
  )
    return "Franco arenoso";
  if (arcilla >= 7 && arcilla < 27 && limo >= 28 && limo < 50 && arena <= 52)
    return "Franco";
  if (limo >= 80 && arcilla < 12) return "Limoso";
  if (limo >= 50 && arcilla < 27) return "Franco limoso";
  if (arcilla >= 20 && arcilla < 35 && limo < 28 && arena > 45)
    return "Franco arcillo arenoso";
  if (arcilla >= 27 && arcilla < 40 && arena > 20 && arena <= 45)
    return "Franco arcilloso";
  if (arcilla >= 27 && arcilla < 40 && arena <= 20)
    return "Franco arcillo limoso";
  if (arcilla >= 35 && arena > 45) return "Arcillo arenoso";
  if (arcilla >= 40 && limo >= 40) return "Arcillo limoso";
  return "Arcilloso";
}

/** Centro aproximado de cada clase en el triángulo (para dibujar cuando solo hay clase). */
export const CENTRO: Record<Clase, Fracciones> = {
  Arenoso: { arena: 92, limo: 5, arcilla: 3 },
  "Arenoso franco": { arena: 82, limo: 12, arcilla: 6 },
  "Franco arenoso": { arena: 65, limo: 25, arcilla: 10 },
  Franco: { arena: 41, limo: 40, arcilla: 19 },
  "Franco limoso": { arena: 20, limo: 65, arcilla: 15 },
  Limoso: { arena: 7, limo: 87, arcilla: 6 },
  "Franco arcillo arenoso": { arena: 60, limo: 13, arcilla: 27 },
  "Franco arcilloso": { arena: 32, limo: 34, arcilla: 34 },
  "Franco arcillo limoso": { arena: 10, limo: 56, arcilla: 34 },
  "Arcillo arenoso": { arena: 52, limo: 6, arcilla: 42 },
  "Arcillo limoso": { arena: 7, limo: 46, arcilla: 47 },
  Arcilloso: { arena: 20, limo: 20, arcilla: 60 },
};

/** Clase escrita → la de la lista (sin importar mayúsculas, tildes ni guiones). */
export function claseDeLista(texto: string | null | undefined): Clase | null {
  const n = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[-\s]+/g, " ")
      .trim()
      .toLowerCase();
  if (!texto) return null;
  const t = n(texto);
  return TEXTURAS.find((c) => n(c) === t) ?? null;
}

/** Composición con la que se dibuja una capa: la medida, o el centro de su clase. */
export function composicion(c: {
  sand_pct: number | null;
  silt_pct: number | null;
  clay_pct: number | null;
  texture_class: string | null;
}): Fracciones | null {
  const f = fracciones(c.sand_pct, c.silt_pct, c.clay_pct);
  if (f) return f;
  const clase = claseDeLista(c.texture_class);
  return clase ? CENTRO[clase] : null;
}

/** Munsell escrito ("10YR 4/3", "7,5YR5/4", "N 3/") → color sRGB, el más cercano de la tabla. */
export function colorMunsell(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const t = texto.trim().toUpperCase().replace(",", ".");
  const n = t.match(/^N\s*(\d+(?:\.\d+)?)\s*\/?\s*0?$/);
  if (n) {
    const v = cercano(Number(n[1]), [2, 2.5, 3, 4, 5, 6, 7, 8]);
    return MUNSELL[`N ${v}/`] ?? null;
  }
  const m = t.match(
    /^(\d+(?:\.\d+)?)\s*(R|YR|Y)\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/,
  );
  if (!m) return null;
  const matiz = `${Number(m[1])}${m[2]}`;
  const valor = cercano(Number(m[3]), [2, 2.5, 3, 4, 5, 6, 7, 8]);
  for (const croma of [1, 2, 3, 4, 6, 8].sort(
    (a, b) => Math.abs(a - Number(m[4])) - Math.abs(b - Number(m[4])),
  )) {
    const c = MUNSELL[`${matiz} ${valor}/${croma}`];
    if (c) return c;
  }
  return null;
}

function cercano(x: number, lista: number[]): number {
  return lista.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
}

/**
 * Color de la capa: el Munsell (húmedo, si no seco) o uno genérico de tierra, un poco más oscuro
 * con cada capa y corrido por la textura (más claro y amarillo si es arenosa, más oscuro y rojizo
 * si es arcillosa). Devuelve también si es medido.
 */
export function colorCapa(
  c: {
    munsell_moist: string | null;
    munsell_dry: string | null;
    sand_pct: number | null;
    silt_pct: number | null;
    clay_pct: number | null;
    texture_class: string | null;
  },
  i: number,
): { color: string; medido: boolean } {
  const m = colorMunsell(c.munsell_moist) ?? colorMunsell(c.munsell_dry);
  if (m) return { color: m, medido: true };
  const f = composicion(c) ?? { arena: 40, limo: 40, arcilla: 20 };
  const luz = limitar(
    54 - i * 4 + (f.arena - 40) * 0.08 - (f.arcilla - 20) * 0.1,
    34,
    66,
  );
  const matiz = limitar(
    32 + (f.arena - 40) * 0.06 - (f.arcilla - 20) * 0.1,
    20,
    40,
  );
  return { color: hsl(matiz, 26, luz), medido: false };
}

/** Mismo color con otra luz (para la cara del costado y la de arriba). */
export function variante(color: string, deltaLuz: number): string {
  const [h, s, l] = aHsl(color);
  return hsl(h, s, limitar(l + deltaLuz, 5, 95));
}

/** ¿Texto claro u oscuro encima de este color? */
export function textoSobre(color: string): string {
  return aHsl(color)[2] > 62 ? "#3f2d1c" : "#fbf7f0";
}

const limitar = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const hsl = (h: number, s: number, l: number) =>
  `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`;

function aHsl(color: string): [number, number, number] {
  const m = color.match(/^hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)$/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const x = color.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(x.slice(k, k + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return [h, s * 100, l * 100];
}

/** Números pseudoaleatorios con semilla (el dibujo de los granos no cambia entre cargas). */
export function azar(semilla: number): () => number {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
