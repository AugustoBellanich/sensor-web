// Copiado de sensor-app/src/datos/copa.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Copa del lote (D-55): altura, anchos y fracción cubierta. Primero se carga el valor que se sabe
// (con su origen); si no se sabe, una estimación guiada con dibujos y el marco del lote como
// escala. No se guardan fotos.
import { leerNumero } from "./riego";
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type OrigenCopa =
  "cinta" | "jalon" | "dron" | "satelite" | "otra_app" | "otro";
export const NOMBRE_ORIGEN: Record<OrigenCopa, string> = {
  cinta: "Cinta",
  jalon: "Jalón",
  dron: "Dron",
  satelite: "Satélite",
  otra_app: "Otra app",
  otro: "Otro",
};

export type MedicionCopa = {
  id: string;
  measured_on: string;
  method: "manual" | "estimado" | "clinometro" | "foto_jalon";
  source: OrigenCopa | null;
  height_m: number | null;
  width_along_m: number | null;
  width_across_m: number | null;
  cover_fraction: number | null;
  trees: number | null;
  raw: Record<string, unknown> | null;
  notes: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_by_name: string | null;
  fc: number | null;
  fc_calc: "cargada" | "ancho_sobre_hileras" | "falta_dato";
};

export type DatosCopa = {
  measured_on: string;
  method: "manual" | "estimado";
  source?: OrigenCopa | null;
  height_m?: number | null;
  width_along_m?: number | null;
  width_across_m?: number | null;
  cover_fraction?: number | null;
  trees?: number | null;
  raw?: Record<string, unknown> | null;
  notes?: string | null;
};

/** Cuánto del interfilar cubre la copa (dibujos de la estimación). */
export const FRACCIONES = [
  { clave: "1/4", valor: 0.25, texto: "¼" },
  { clave: "1/3", valor: 1 / 3, texto: "⅓" },
  { clave: "1/2", valor: 0.5, texto: "½" },
  { clave: "2/3", valor: 2 / 3, texto: "⅔" },
  { clave: "3/4", valor: 0.75, texto: "¾" },
  { clave: "casi", valor: 0.95, texto: "Casi todo" },
] as const;

/** Altura comparada con una persona de 1,7 m. */
export const PERSONA_M = 1.7;
export const ALTURAS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5] as const;

export const textoPersonas = (n: number) =>
  n === 0.5
    ? "Media persona"
    : n === 1
      ? "Una persona"
      : `${String(n).replace(".", ",")} personas`;

/** Arma la estimación: fracción del interfilar y altura en personas → valores en metros. */
export function estimarCopa(
  fraccion: (typeof FRACCIONES)[number] | null,
  personas: number | null,
  entreHileras: number | null,
  fecha: string,
): { ok: true; datos: DatosCopa } | { ok: false; mensaje: string } {
  if (!fraccion && personas == null)
    return { ok: false, mensaje: "Elegí cuánto cubre la copa o su altura." };
  return {
    ok: true,
    datos: {
      measured_on: fecha,
      method: "estimado",
      cover_fraction: fraccion
        ? Math.round(fraccion.valor * 1000) / 1000
        : null,
      width_across_m:
        fraccion && entreHileras
          ? Math.round(fraccion.valor * entreHileras * 100) / 100
          : null,
      height_m:
        personas != null ? Math.round(personas * PERSONA_M * 100) / 100 : null,
      raw: {
        interfilar: fraccion?.clave ?? null,
        personas,
        entre_hileras_m: entreHileras,
      },
    },
  };
}

/** Valida lo cargado a mano. La fracción se escribe en %. */
export function armarManual(f: {
  fecha: string | null;
  origen: OrigenCopa | null;
  altura: string;
  anchoHilera: string;
  anchoTransversal: string;
  cobertura: string;
  arboles: string;
  notas: string;
}): { ok: true; datos: DatosCopa } | { ok: false; mensaje: string } {
  if (!f.fecha) return { ok: false, mensaje: "Poné la fecha de la medición." };
  const altura = leerNumero(f.altura);
  const a1 = leerNumero(f.anchoHilera);
  const a2 = leerNumero(f.anchoTransversal);
  const pct = leerNumero(f.cobertura);
  const arboles = leerNumero(f.arboles);
  if (altura == null && a1 == null && a2 == null && pct == null)
    return { ok: false, mensaje: "Cargá al menos un valor." };
  if (altura != null && (altura <= 0 || altura > 40))
    return { ok: false, mensaje: "La altura tiene que estar entre 0 y 40 m." };
  if (
    (a1 != null && (a1 <= 0 || a1 > 50)) ||
    (a2 != null && (a2 <= 0 || a2 > 50))
  )
    return {
      ok: false,
      mensaje: "Los anchos tienen que estar entre 0 y 50 m.",
    };
  if (pct != null && (pct < 0 || pct > 100))
    return { ok: false, mensaje: "La cobertura va de 0 a 100 %." };
  if (
    arboles != null &&
    (!Number.isInteger(arboles) || arboles < 1 || arboles > 50)
  )
    return { ok: false, mensaje: "Árboles medidos: entre 1 y 50." };
  return {
    ok: true,
    datos: {
      measured_on: f.fecha,
      method: "manual",
      source: f.origen,
      height_m: altura,
      width_along_m: a1,
      width_across_m: a2,
      cover_fraction: pct != null ? pct / 100 : null,
      trees: arboles,
      notes: f.notas.trim() || null,
    },
  };
}

export async function medicionesCopa(
  lote: string,
): Promise<{ mediciones: MedicionCopa[]; error: string | null }> {
  const { data, error } = await supabase.rpc("plot_canopy", {
    p_plot_id: lote,
    p_include_voided: false,
  });
  return {
    mediciones: (data ?? []) as MedicionCopa[],
    error: error ? mensajeBase(error.message) : null,
  };
}

export async function cargarCopa(
  lote: string,
  d: DatosCopa,
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.rpc("add_canopy_measurement", {
    p_plot_id: lote,
    p_data: d,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

export async function anularCopa(
  id: string,
  motivo: string,
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  if (!motivo.trim()) return { ok: false, mensaje: "Escribí el motivo." };
  const { error } = await supabase.rpc("void_canopy_measurement", {
    p_id: id,
    p_reason: motivo,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}
