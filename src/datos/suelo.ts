// Suelo del sitio por capas (D-106): el perfil observado en la excavación del sensor, con sus capas, y lo que toma
// cada sonda. Una lista de renglones (RENGLONES) arma la tabla y el formulario: cada renglón tiene
// uno o más valores y, si corresponde, el método al lado (lista corta con "otro").
import type { Resultado } from "./cuenta";
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type Capa = {
  id?: string;
  top_cm: number;
  bottom_cm: number;
  name: string | null;
  sand_pct: number | null;
  silt_pct: number | null;
  clay_pct: number | null;
  texture_class: string | null;
  texture_method: string | null;
  bulk_density: number | null;
  density_method: string | null;
  gravel_pct: number | null;
  munsell_dry: string | null;
  munsell_moist: string | null;
  structure: string | null;
  organic_matter_pct: number | null;
  om_method: string | null;
  ph: number | null;
  ph_method: string | null;
  ec_ds_m: number | null;
  ec_method: string | null;
  sar: number | null;
  esp_pct: number | null;
  sodicity_method: string | null;
  p_ppm: number | null;
  p_method: string | null;
  n_total_pct: number | null;
  n_method: string | null;
  cec_cmol: number | null;
  cec_method: string | null;
  ca_cmol: number | null;
  mg_cmol: number | null;
  na_cmol: number | null;
  k_cmol: number | null;
  cations_method: string | null;
  caco3_pct: number | null;
  caco3_method: string | null;
  notes: string | null;
};

export type ClaveCapa = Exclude<keyof Capa, "id" | "top_cm" | "bottom_cm">;

export type Descripcion = {
  id: string;
  described_at: string;
  notes: string | null;
  report_url: string | null;
  active: boolean;
  deactivated_reason: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  layers: Capa[];
};

/** Un dato del suelo de una sonda, con su origen: medido en la sonda o tomado de su capa. */
export type DatoSonda<T> = {
  value: T;
  origen: "sonda" | "capa";
  medido?: string;
};

export type SueloDeSonda = {
  index: 1 | 2 | 3;
  depth: number | null;
  capa: {
    id: string;
    top_cm: number;
    bottom_cm: number;
    name: string | null;
  } | null;
  bulk_density?: DatoSonda<number>;
  texture_class?: DatoSonda<string>;
  sand_pct?: DatoSonda<number>;
  silt_pct?: DatoSonda<number>;
  clay_pct?: DatoSonda<number>;
  organic_matter_pct?: DatoSonda<number>;
};

export type SueloSitio = {
  site_id: string;
  name: string;
  can_edit: boolean;
  vigente: string | null;
  descriptions: Descripcion[];
  electrodes: SueloDeSonda[];
};

export type SueloDeLote = {
  site_id: string;
  name: string;
  description: {
    id: string;
    described_at: string;
    report_url: string | null;
    layers: Capa[];
  } | null;
  depths: (number | null)[];
}[];

// ---------------------------------------------------------------- renglones (tabla y formulario)

export type Grupo = "fisicos" | "quimicos" | "descripcion";

export type ValorRenglon = {
  clave: ClaveCapa;
  etiqueta: string;
  unidad?: string;
  decimales?: number;
  min?: number;
  max?: number;
  texto?: boolean;
};

export type Renglon = {
  titulo: string;
  grupo: Grupo;
  valores: ValorRenglon[];
  metodo?: { clave: ClaveCapa; opciones: string[] };
};

export const GRUPOS: Record<Grupo, string> = {
  fisicos: "Físicos",
  quimicos: "Químicos",
  descripcion: "Descripción",
};

const pct = (
  clave: ClaveCapa,
  etiqueta: string,
  decimales = 0,
): ValorRenglon => ({
  clave,
  etiqueta,
  unidad: "%",
  decimales,
  min: 0,
  max: 100,
});
const cmol = (clave: ClaveCapa, etiqueta: string): ValorRenglon => ({
  clave,
  etiqueta,
  unidad: "cmol/kg",
  decimales: 1,
  min: 0,
  max: 300,
});

/** Métodos habituales de los laboratorios de suelo; siempre se puede escribir otro. */
export const RENGLONES: Renglon[] = [
  {
    titulo: "Textura",
    grupo: "fisicos",
    valores: [
      pct("sand_pct", "Arena"),
      pct("silt_pct", "Limo"),
      pct("clay_pct", "Arcilla"),
      { clave: "texture_class", etiqueta: "Clase", texto: true },
    ],
    metodo: {
      clave: "texture_method",
      opciones: [
        "Bouyoucos (hidrómetro)",
        "Pipeta de Robinson",
        "Al tacto",
        "Láser",
      ],
    },
  },
  {
    titulo: "Densidad aparente",
    grupo: "fisicos",
    valores: [
      {
        clave: "bulk_density",
        etiqueta: "Densidad",
        unidad: "g/cm³",
        decimales: 2,
        min: 0.3,
        max: 2.3,
      },
    ],
    metodo: {
      clave: "density_method",
      opciones: ["Cilindro", "Terrón con parafina", "Laboratorio"],
    },
  },
  {
    titulo: "Gravas",
    grupo: "fisicos",
    valores: [pct("gravel_pct", "Gravas")],
  },
  {
    titulo: "Materia orgánica",
    grupo: "quimicos",
    valores: [pct("organic_matter_pct", "MO", 1)],
    metodo: {
      clave: "om_method",
      opciones: ["Walkley-Black", "Combustión seca", "Calcinación"],
    },
  },
  {
    titulo: "pH",
    grupo: "quimicos",
    valores: [{ clave: "ph", etiqueta: "pH", decimales: 1, min: 0, max: 14 }],
    metodo: {
      clave: "ph_method",
      opciones: [
        "Agua 1:2,5",
        "Agua 1:1",
        "Pasta saturada",
        "CaCl₂ 0,01 M",
        "KCl 1 M",
      ],
    },
  },
  {
    titulo: "Conductividad eléctrica",
    grupo: "quimicos",
    valores: [
      {
        clave: "ec_ds_m",
        etiqueta: "CE",
        unidad: "dS/m",
        decimales: 2,
        min: 0,
        max: 200,
      },
    ],
    metodo: {
      clave: "ec_method",
      opciones: ["Extracto de saturación", "Agua 1:2,5", "Agua 1:5"],
    },
  },
  {
    titulo: "Sodicidad",
    grupo: "quimicos",
    valores: [
      { clave: "sar", etiqueta: "RAS", decimales: 1, min: 0, max: 500 },
      pct("esp_pct", "PSI", 1),
    ],
    metodo: {
      clave: "sodicity_method",
      opciones: ["Extracto de saturación", "Acetato de amonio pH 7"],
    },
  },
  {
    titulo: "Fósforo",
    grupo: "quimicos",
    valores: [
      {
        clave: "p_ppm",
        etiqueta: "P",
        unidad: "ppm",
        decimales: 1,
        min: 0,
        max: 5000,
      },
    ],
    metodo: {
      clave: "p_method",
      opciones: ["Bray-Kurtz 1", "Olsen", "Mehlich 3"],
    },
  },
  {
    titulo: "Nitrógeno total",
    grupo: "quimicos",
    valores: [
      {
        clave: "n_total_pct",
        etiqueta: "N total",
        unidad: "%",
        decimales: 3,
        min: 0,
        max: 20,
      },
    ],
    metodo: {
      clave: "n_method",
      opciones: ["Kjeldahl", "Combustión seca (Dumas)"],
    },
  },
  {
    titulo: "Capacidad de intercambio",
    grupo: "quimicos",
    valores: [cmol("cec_cmol", "CIC")],
    metodo: {
      clave: "cec_method",
      opciones: ["Acetato de amonio pH 7", "Suma de bases"],
    },
  },
  {
    titulo: "Cationes intercambiables",
    grupo: "quimicos",
    valores: [
      cmol("ca_cmol", "Ca"),
      cmol("mg_cmol", "Mg"),
      cmol("na_cmol", "Na"),
      cmol("k_cmol", "K"),
    ],
    metodo: { clave: "cations_method", opciones: ["Acetato de amonio pH 7"] },
  },
  {
    titulo: "Carbonatos",
    grupo: "quimicos",
    valores: [pct("caco3_pct", "CaCO₃", 1)],
    metodo: {
      clave: "caco3_method",
      opciones: ["Calcímetro", "Efervescencia con HCl"],
    },
  },
  {
    titulo: "Color Munsell",
    grupo: "descripcion",
    valores: [
      { clave: "munsell_dry", etiqueta: "Seco", texto: true },
      { clave: "munsell_moist", etiqueta: "Húmedo", texto: true },
    ],
  },
  {
    titulo: "Estructura",
    grupo: "descripcion",
    valores: [{ clave: "structure", etiqueta: "Estructura", texto: true }],
  },
  {
    titulo: "Notas",
    grupo: "descripcion",
    valores: [{ clave: "notes", etiqueta: "Notas", texto: true }],
  },
];

/** Claves de texto de la capa (lo demás es numérico). */
export const CLAVES_TEXTO = new Set<ClaveCapa>([
  "name",
  ...RENGLONES.flatMap((r) => [
    ...r.valores.filter((v) => v.texto).map((v) => v.clave),
    ...(r.metodo ? [r.metodo.clave] : []),
  ]),
]);

/** ¿La capa tiene algún dato de este renglón? */
export function renglonConDatos(r: Renglon, capas: Capa[]): boolean {
  return capas.some((c) =>
    r.valores.some((v) => c[v.clave] != null && c[v.clave] !== ""),
  );
}

/** Número con coma y los decimales del dato. */
export function numeroSuelo(v: number, decimales = 1): string {
  return v.toLocaleString("es-AR", { maximumFractionDigits: decimales });
}

/** "0–35 cm" */
export function textoCapa(c: { top_cm: number; bottom_cm: number }): string {
  return `${numeroSuelo(c.top_cm, 0)}–${numeroSuelo(c.bottom_cm, 0)} cm`;
}

// ---------------------------------------------------------------- formulario (puro)

/** Capa del formulario: todo como texto, tal cual se escribe. */
export type CapaFormulario = { clave: string } & Partial<
  Record<"top_cm" | "bottom_cm" | ClaveCapa, string>
>;

let contador = 0;
export function capaVacia(desde = "", hasta = ""): CapaFormulario {
  contador += 1;
  return { clave: `c${contador}`, top_cm: desde, bottom_cm: hasta };
}

export function aFormulario(c: Capa): CapaFormulario {
  const f = capaVacia(String(c.top_cm), String(c.bottom_cm));
  for (const [k, v] of Object.entries(c)) {
    if (k === "id" || k === "top_cm" || k === "bottom_cm" || v == null)
      continue;
    f[k as ClaveCapa] =
      typeof v === "number" ? String(v).replace(".", ",") : String(v);
  }
  return f;
}

function leer(t: string | undefined): number | null {
  const s = (t ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Revisa las capas del formulario y arma lo que se manda a la base. Devuelve los errores por capa
 * (en el orden del formulario) y las capas listas, ordenadas por profundidad.
 */
export function revisarCapas(capas: CapaFormulario[]): {
  errores: (string | null)[];
  listas: Record<string, unknown>[];
} {
  const errores: (string | null)[] = capas.map(() => null);
  const listas: { orden: number; i: number; capa: Record<string, unknown> }[] =
    [];
  const valores = RENGLONES.flatMap((r) => r.valores).filter((v) => !v.texto);
  capas.forEach((c, i) => {
    const desde = leer(c.top_cm);
    const hasta = leer(c.bottom_cm);
    if (
      desde == null ||
      hasta == null ||
      Number.isNaN(desde) ||
      Number.isNaN(hasta)
    ) {
      errores[i] = "Falta la profundidad desde y hasta (cm).";
      return;
    }
    if (desde < 0 || hasta <= desde || hasta > 300) {
      errores[i] =
        "La profundidad hasta tiene que ser mayor que desde (máximo 300 cm).";
      return;
    }
    const capa: Record<string, unknown> = { top_cm: desde, bottom_cm: hasta };
    for (const v of valores) {
      const n = leer(c[v.clave]);
      if (n == null) continue;
      if (Number.isNaN(n)) {
        errores[i] = `${v.etiqueta}: no es un número.`;
        return;
      }
      if ((v.min != null && n < v.min) || (v.max != null && n > v.max)) {
        errores[i] =
          `${v.etiqueta}: tiene que estar entre ${numeroSuelo(v.min ?? 0, 2)} y ${numeroSuelo(v.max ?? 0, 2)}.`;
        return;
      }
      capa[v.clave] = n;
    }
    const suma = ["sand_pct", "silt_pct", "clay_pct"].reduce(
      (a, k) => a + ((capa[k] as number | undefined) ?? 0),
      0,
    );
    if (suma > 100.5) {
      errores[i] = "Arena + limo + arcilla no puede pasar de 100 %.";
      return;
    }
    for (const k of CLAVES_TEXTO) {
      const t = (c[k] ?? "").trim();
      if (t) capa[k] = t;
    }
    listas.push({ orden: desde, i, capa });
  });
  listas.sort((a, b) => a.orden - b.orden);
  for (let k = 1; k < listas.length; k++) {
    const antes = listas[k - 1].capa.bottom_cm as number;
    if ((listas[k].capa.top_cm as number) < antes)
      errores[listas[k].i] = "Se superpone con la capa de arriba.";
  }
  return { errores, listas: listas.map((x) => x.capa) };
}

// ---------------------------------------------------------------- base

export async function sueloSitio(
  sitio: string,
): Promise<{ suelo: SueloSitio | null; error: string | null }> {
  const { data, error } = await supabase.rpc("site_soil", { p_site_id: sitio });
  if (error) return { suelo: null, error: mensajeBase(error.message) };
  return { suelo: (data ?? null) as SueloSitio | null, error: null };
}

export async function sueloLote(
  lote: string,
): Promise<{ sitios: SueloDeLote; error: string | null }> {
  const { data, error } = await supabase.rpc("plot_soil", { p_plot_id: lote });
  if (error) return { sitios: [], error: mensajeBase(error.message) };
  return { sitios: (data ?? []) as SueloDeLote, error: null };
}

export async function guardarDescripcion(d: {
  sitio: string;
  fecha: string;
  capas: Record<string, unknown>[];
  notas: string;
  informe: string;
  /** null: descripción nueva (la anterior queda en el historial); con id: corrige esa. */
  id: string | null;
}): Promise<Resultado> {
  const { error } = await supabase.rpc("save_soil_description", {
    p_site_id: d.sitio,
    p_described_at: d.fecha,
    p_layers: d.capas,
    p_notes: d.notas.trim() || null,
    p_report_url: d.informe.trim() || null,
    p_description_id: d.id,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

export async function activarDescripcion(
  id: string,
  activa: boolean,
  motivo: string | null = null,
): Promise<Resultado> {
  const { error } = await supabase.rpc("set_soil_description_active", {
    p_description_id: id,
    p_active: activa,
    p_reason: motivo,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

/** Profundidad de una sonda: se guarda como dato del sitio (add_soil_properties, solo profundidad). */
export async function guardarProfundidad(
  sitio: string,
  electrodo: number,
  cm: number,
  fecha: string,
): Promise<Resultado> {
  const { error } = await supabase.rpc("add_soil_properties", {
    p_site_id: sitio,
    p_electrode: electrodo,
    p_measured_at: fecha,
    p_depth_cm: cm,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}
