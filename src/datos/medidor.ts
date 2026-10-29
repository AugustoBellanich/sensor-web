// Copiado de sensor-app/src/datos/medidor.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Medidor por zonas (bullet graph de Stephen Few, con el estado en ícono + texto como pide el
// patrón de indicadores de estado de Carbon): una escala con rangos y una marca en el valor, y una
// línea corta que dice cuánto falta o cuánto se pasa. Funciones puras: se prueban con jest.

export type Nivel = "bien" | "aviso" | "grave" | "info";

/** Una zona de la escala: de `desde` a `hasta` (en la unidad del dato). Se pasan en orden. */
/** `corte`: cómo se llama el borde superior (PMP, CC…); si falta, se escribe el número. */
export type Zona = { hasta: number; nivel: Nivel; nombre: string; corte?: string };

/**
 * Escala: mínimo y zonas consecutivas (la última termina en el máximo). `visual`, opcional: dónde
 * termina cada zona en el dibujo (0–1, una por zona, la última en 1), para dar más ancho a la zona
 * que importa; sin él, el dibujo es proporcional al valor.
 */
export type Escala = { min: number; zonas: Zona[]; unidad: string; decimales: number; visual?: number[] };

export type Ubicacion = {
  zona: Zona;
  indice: number;
  /** 0–1 dentro de la escala completa (recortado a los extremos). */
  posicion: number;
  /** El valor está fuera de la escala (se dibuja la marca en el borde). */
  fuera: "abajo" | "arriba" | null;
  /** Frase corta: "0,25 sobre Adecuado", "faltan 6,6 para CC", "cerca de Alto". */
  frase: string;
};

const fmt = (n: number, d: number) => n.toFixed(d).replace(".", ",");

export function maxEscala(e: Escala): number {
  return e.zonas[e.zonas.length - 1].hasta;
}

/** Inicio de la zona i. */
export function desdeZona(e: Escala, i: number): number {
  return i === 0 ? e.min : e.zonas[i - 1].hasta;
}

/**
 * Dónde cae el valor y la frase de cuánto. Regla de la frase:
 * - fuera de las zonas "bien": la distancia al borde de la zona "bien" más cercana
 *   ("0,25 sobre Adecuado", "3 por debajo de Bien");
 * - dentro de una zona "bien" y cerca del borde con una zona que no lo es (en el último cuarto
 *   de la zona): "a 0,2 de Alto";
 * - si no, vacía (no hace falta decir nada).
 */
export function ubicar(valor: number, e: Escala): Ubicacion {
  const max = maxEscala(e);
  const ancho = max - e.min || 1;
  let indice = e.zonas.findIndex((z) => valor < z.hasta);
  if (indice === -1) indice = e.zonas.length - 1;
  const zona = e.zonas[indice];
  const fuera = valor < e.min ? "abajo" : valor > max ? "arriba" : null;
  const posicion = e.visual ? posicionVisual(valor, e) : Math.min(1, Math.max(0, (valor - e.min) / ancho));
  const u = e.unidad ? ` ${e.unidad}` : "";

  let frase = "";
  if (zona.nivel !== "bien") {
    // Zona "bien" más cercana, hacia arriba o hacia abajo.
    let mejor: { distancia: number; texto: string } | null = null;
    e.zonas.forEach((z, i) => {
      if (z.nivel !== "bien") return;
      const a = desdeZona(e, i);
      const b = z.hasta;
      const d = valor < a ? a - valor : valor > b ? valor - b : 0;
      if (d > 0 && (!mejor || d < mejor.distancia)) {
        mejor = { distancia: d, texto: valor < a ? `${fmt(d, e.decimales)}${u} por debajo de ${z.nombre}` : `${fmt(d, e.decimales)}${u} sobre ${z.nombre}` };
      }
    });
    frase = (mejor as { texto: string } | null)?.texto ?? "";
  } else {
    const a = desdeZona(e, indice);
    const b = zona.hasta;
    const umbral = (b - a) * 0.25;
    const abajo = indice > 0 && e.zonas[indice - 1].nivel !== "bien" ? valor - a : Infinity;
    const arriba = indice < e.zonas.length - 1 && e.zonas[indice + 1].nivel !== "bien" ? b - valor : Infinity;
    if (arriba <= umbral && arriba <= abajo) frase = `a ${fmt(arriba, e.decimales)}${u} de ${e.zonas[indice + 1].nombre}`;
    else if (abajo <= umbral) frase = `a ${fmt(abajo, e.decimales)}${u} de ${e.zonas[indice - 1].nombre}`;
  }
  return { zona, indice, posicion, fuera, frase };
}

/** Fin de cada zona en el dibujo (0–1). */
export function finesVisuales(e: Escala): number[] {
  if (e.visual && e.visual.length === e.zonas.length) return e.visual;
  const ancho = maxEscala(e) - e.min || 1;
  return e.zonas.map((z) => (z.hasta - e.min) / ancho);
}

/** Posición en el dibujo (0–1): lineal dentro de cada zona, con el ancho que le da `visual`. */
export function posicionVisual(valor: number, e: Escala): number {
  const fines = finesVisuales(e);
  if (valor <= e.min) return 0;
  for (let i = 0; i < e.zonas.length; i++) {
    const a = desdeZona(e, i);
    const b = e.zonas[i].hasta;
    if (valor <= b) {
      const va = i === 0 ? 0 : fines[i - 1];
      return va + ((valor - a) / (b - a || 1)) * (fines[i] - va);
    }
  }
  return 1;
}

// ---------------------------------------------------------------- escalas del proyecto

/** DPV (kPa). Mismos cortes que lecturaDpv. */
export const ESCALA_DPV: Escala = {
  min: 0,
  unidad: "kPa",
  decimales: 2,
  zonas: [
    { hasta: 0.4, nivel: "info", nombre: "Muy bajo" },
    { hasta: 1.2, nivel: "bien", nombre: "Adecuado" },
    { hasta: 2, nivel: "aviso", nombre: "Alto" },
    { hasta: 3, nivel: "grave", nombre: "Muy alto" },
  ],
};

/** Distancia al punto de rocío (temperatura − rocío, °C): cerca de 0 se mojan las hojas. */
export const ESCALA_ROCIO: Escala = {
  min: 0,
  unidad: "°C",
  decimales: 1,
  zonas: [
    { hasta: 2, nivel: "aviso", nombre: "Mojado probable" },
    { hasta: 4, nivel: "info", nombre: "Húmedo" },
    { hasta: 20, nivel: "bien", nombre: "Seco" },
  ],
};

/** Batería (%). Mismos cortes que network_health (health_thresholds). */
export const ESCALA_BATERIA: Escala = {
  min: 0,
  unidad: "%",
  decimales: 0,
  zonas: [
    { hasta: 10, nivel: "grave", nombre: "Crítica" },
    { hasta: 25, nivel: "aviso", nombre: "Baja" },
    { hasta: 100, nivel: "bien", nombre: "Bien" },
  ],
};

/** Temperatura dentro de la carcasa (°C): arriba de 45 °C se daña la batería de litio. */
export const ESCALA_CAJA: Escala = {
  min: -5,
  unidad: "°C",
  decimales: 1,
  zonas: [
    { hasta: 35, nivel: "bien", nombre: "Normal" },
    { hasta: 45, nivel: "aviso", nombre: "Caliente" },
    { hasta: 60, nivel: "grave", nombre: "Daña la batería" },
  ],
};

/** Señal WiFi del gateway (dBm). Mismos cortes que calidadWifi y network_health. */
export const ESCALA_WIFI: Escala = {
  min: -100,
  unidad: "dBm",
  decimales: 0,
  zonas: [
    { hasta: -80, nivel: "grave", nombre: "Muy débil" },
    { hasta: -75, nivel: "aviso", nombre: "Débil" },
    { hasta: -30, nivel: "bien", nombre: "Buena" },
  ],
};

/** Lecturas recibidas en 24 h (%). Menos de 80 % es "con cortes" (network_health). */
export const ESCALA_COMPLETITUD: Escala = {
  min: 0,
  unidad: "%",
  decimales: 0,
  zonas: [
    { hasta: 80, nivel: "aviso", nombre: "Con cortes" },
    { hasta: 100, nivel: "bien", nombre: "Completo" },
  ],
};

/**
 * Humedad de suelo (% vol) con las referencias del electrodo. Casi siempre el valor está entre PMP
 * y CC, así que esa zona se lleva el ancho: CC al 80 % del dibujo y SAT en el borde derecho; debajo
 * de PMP, una franja angosta. Si el valor pasa de SAT (`valor`), la escala se estira para mostrar
 * la zona saturada y CC baja al 70 %.
 */
export function escalaSuelo(r: { pmp: number; cc: number; sat: number }, valor?: number | null): Escala {
  const margen = Math.max(1, (r.cc - r.pmp) * 0.12);
  const zonas: Zona[] = [
    { hasta: r.pmp, nivel: "grave", nombre: "Estrés", corte: "PMP" },
    { hasta: r.cc, nivel: "bien", nombre: "Agua útil", corte: "CC" },
    { hasta: r.sat, nivel: "info", nombre: "Sobre CC", corte: "SAT" },
  ];
  const base = { min: Math.max(0, r.pmp - margen), unidad: "%", decimales: 1 };
  if (valor != null && Number.isFinite(valor) && valor > r.sat) {
    const tope = Math.max(r.sat + margen, valor + (valor - r.sat) * 0.25);
    return { ...base, zonas: [...zonas, { hasta: tope, nivel: "info", nombre: "Saturado" }], visual: [0.07, 0.7, 0.86, 1] };
  }
  return { ...base, zonas, visual: [0.08, 0.8, 1] };
}

/**
 * Estado de la humedad de suelo en una sola frase (D-82): "Agua útil al 95 %",
 * "Sobre capacidad de campo (+1,1 %)", "Estrés hídrico (2,0 % debajo de PMP)",
 * "Saturado (+3,0 % sobre SAT)". `valor` y las referencias en % vol.
 */
export function fraseSuelo(valor: number, r: { pmp: number; cc: number; sat: number }): string {
  if (valor < r.pmp) return `Estrés hídrico (${fmt(r.pmp - valor, 1)} % debajo de PMP)`;
  if (valor <= r.cc) return `Agua útil al ${Math.round(((valor - r.pmp) / (r.cc - r.pmp || 1)) * 100)} %`;
  if (valor <= r.sat) return `Sobre capacidad de campo (+${fmt(valor - r.cc, 1)} %)`;
  return `Saturado (+${fmt(valor - r.sat, 1)} % sobre SAT)`;
}

/** Marcas de la escala: el valor de cada borde interno, con su nombre si tiene. */
export function cortes(e: Escala): { valor: number; posicion: number; texto: string }[] {
  const fines = finesVisuales(e);
  // Con SAT en el borde (la última zona termina en un corte con nombre), también se marca.
  const ultima = e.zonas[e.zonas.length - 1];
  const zonas = ultima.corte ? e.zonas : e.zonas.slice(0, -1);
  return zonas.map((z, i) => ({
    valor: z.hasta,
    posicion: fines[i],
    texto: z.corte ?? String(Number(z.hasta.toFixed(e.decimales))).replace(".", ","),
  }));
}
