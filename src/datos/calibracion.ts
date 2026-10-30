// Copiado de sensor-app/src/datos/calibracion.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Calibración por puntos (D-41): funciones de la base de la migración 20261005100000 y textos.
// Las cuentas (ajuste de la curva, estados) las hace la base; acá solo se arma lo que se manda
// y se ponen palabras a lo que vuelve.
import type { Resultado } from "./cuenta";
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type EstadoCurva = "insuficiente" | "provisional" | "incierta" | "calibrada";
export type ModeloCurva = "lineal" | "inversa" | "tramos";
export type EstadoValor = "calibrado" | "provisional" | "extrapolado" | "fuera_de_rango" | "sin_calibracion";

export type Curva = {
  status: EstadoCurva;
  model: ModeloCurva | null;
  n: number;
  mv_min: number | null;
  mv_max: number | null;
  hv_min: number | null;
  hv_max: number | null;
  rmse_fit: number | null;
  rmse_cv: number | null;
  reason: string | null;
  fitted_at?: string;
  candidates?: { model: ModeloCurva; rmse_fit: number; rmse_cv: number | null }[];
};

export type Nivel = {
  level: "pmp" | "cc" | "sat";
  theta_v: number;
  theta_g: number | null;
  origin: OrigenNivel;
  notes: string | null;
  created_at: string;
  mv: number | null;
  estado: EstadoValor;
};

export type OrigenNivel = "textura" | "laboratorio" | "datos" | "muestra" | "legado" | "otro";

export type Suelo = {
  id: string;
  measured_at: string;
  depth_cm: number | null;
  bulk_density: number | null;
  texture_class: string | null;
  sand_pct: number | null;
  silt_pct: number | null;
  clay_pct: number | null;
  organic_matter_pct: number | null;
  density_method: string | null;
  texture_method: string | null;
  notes: string | null;
  created_at: string;
};

export type Punto = {
  id: string;
  device_id: string;
  sampled_at: string;
  mv: number;
  mv_readings: number;
  mv_source?: OrigenMv | "legado";
  theta_input: number;
  theta_kind: "hv" | "hg";
  bulk_density: number | null;
  theta_v: number;
  method: "gravimetrico" | "otro_sensor" | "otro" | "legado";
  method_detail: string | null;
  subsamples: number | null;
  soil_temp: number | null;
  notes: string | null;
  active: boolean;
  deactivated_reason: string | null;
  created_by_name: string | null;
  created_at: string;
  estimado: number | null;
};

export type ElectrodoCal = {
  index: 1 | 2 | 3;
  depth: number | null;
  device_id: string | null;
  suelo: Suelo | null;
  densidad: number | null;
  historial_suelo: Suelo[];
  niveles: Nivel[];
  curva: Curva | null;
  curva_muestras: { mv: number; hv: number | null; estado: EstadoValor }[] | null;
  puntos: Punto[];
};

export type FichaCalibracion = { site_id: string; name: string; device_id: string | null; can_edit: boolean; electrodes: ElectrodoCal[] };

export async function fichaCalibracion(sitio: string): Promise<{ ficha: FichaCalibracion | null; error: string | null }> {
  const { data, error } = await supabase.rpc("site_calibration", { p_site_id: sitio });
  if (error) return { ficha: null, error: mensajeBase(error.message) };
  return { ficha: (data ?? null) as FichaCalibracion | null, error: null };
}

export type VistaPrevia = {
  mv: number;
  readings: number;
  mv_source?: OrigenMv;
  device_id: string;
  soil_temp: number | null;
  bulk_density: number | null;
  theta_v: number;
  antes: Curva | null;
  despues: Curva;
};

/** De dónde sale el mV de un punto (D-47). */
export type OrigenMv = "lecturas" | "manual" | "ble";

export const TEXTO_ORIGEN_MV: Record<OrigenMv | "legado", string> = {
  lecturas: "de las lecturas",
  manual: "escrito a mano",
  ble: "en vivo por Bluetooth",
  legado: "de la calibración anterior",
};

/** mV que trae la persona (escrito o tomado por Bluetooth). Sin esto, la base lo busca en las lecturas. */
export type MvDado = { valor: number; origen: "manual" | "ble"; lecturas?: number; temperatura?: number | null; equipo?: string };

export type DatosPunto = {
  sitio: string;
  electrodo: number;
  momento: string; // ISO con zona
  humedad: number;
  tipo: "hv" | "hg";
  mv?: MvDado;
};

/** Parámetros del mV para las RPC. Sin mV dado no se mandan, y la llamada es la de siempre. */
function parametrosMv(mv: MvDado | undefined): Record<string, unknown> {
  if (!mv) return {};
  return {
    p_mv: mv.valor,
    p_mv_source: mv.origen,
    p_mv_readings: mv.lecturas ?? null,
    p_soil_temp: mv.temperatura ?? null,
    p_device_id: mv.equipo ?? null,
  };
}

export async function vistaPrevia(p: DatosPunto): Promise<{ vista: VistaPrevia | null; error: string | null }> {
  const { data, error } = await supabase.rpc("calibration_point_preview", {
    p_site_id: p.sitio,
    p_electrode: p.electrodo,
    p_at: p.momento,
    p_theta: p.humedad,
    p_kind: p.tipo,
    ...parametrosMv(p.mv),
  });
  if (error) return { vista: null, error: mensajeBase(error.message) };
  return { vista: data as VistaPrevia, error: null };
}

export async function agregarPunto(
  p: DatosPunto & { metodo: "gravimetrico" | "otro_sensor" | "otro"; detalle: string; submuestras: number | null; notas: string },
): Promise<Resultado> {
  const { error } = await supabase.rpc("add_calibration_point", {
    p_site_id: p.sitio,
    p_electrode: p.electrodo,
    p_at: p.momento,
    p_theta: p.humedad,
    p_kind: p.tipo,
    p_method: p.metodo,
    p_method_detail: p.detalle || null,
    p_subsamples: p.submuestras,
    p_notes: p.notas || null,
    ...parametrosMv(p.mv),
  });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export async function activarPunto(id: string, activo: boolean, motivo: string | null): Promise<Resultado> {
  const { error } = await supabase.rpc("set_calibration_point_active", { p_point_id: id, p_active: activo, p_reason: motivo });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export type DatosSuelo = {
  sitio: string;
  electrodo: number;
  fecha: string;
  profundidad: number | null;
  densidad: number | null;
  textura: string | null;
  arena: number | null;
  limo: number | null;
  arcilla: number | null;
  mo: number | null;
  metodoDensidad: "cilindro" | "laboratorio" | "otro" | null;
  metodoTextura: "laboratorio" | "tacto" | "otro" | null;
  notas: string;
};

export async function guardarSuelo(s: DatosSuelo): Promise<Resultado> {
  const { error } = await supabase.rpc("add_soil_properties", {
    p_site_id: s.sitio,
    p_electrode: s.electrodo,
    p_measured_at: s.fecha,
    p_depth_cm: s.profundidad,
    p_bulk_density: s.densidad,
    p_texture_class: s.textura,
    p_sand_pct: s.arena,
    p_silt_pct: s.limo,
    p_clay_pct: s.arcilla,
    p_organic_matter_pct: s.mo,
    p_density_method: s.densidad != null ? s.metodoDensidad : null,
    p_texture_method: s.textura || s.arena != null ? s.metodoTextura : null,
    p_notes: s.notas || null,
  });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export async function guardarNivel(
  sitio: string,
  electrodo: number,
  nivel: "pmp" | "cc" | "sat",
  humedad: number,
  origen: Exclude<OrigenNivel, "legado">,
  notas?: string,
): Promise<Resultado> {
  const { error } = await supabase.rpc("set_soil_level", {
    p_site_id: sitio,
    p_electrode: electrodo,
    p_level: nivel,
    p_theta_v: humedad,
    p_origin: origen,
    p_notes: notas ?? null,
  });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export type Estimacion = { pmp: number; cc: number; sat: number; sat_origen: "densidad" | "textura"; om_supuesta: boolean };

export async function estimarNiveles(sitio: string, electrodo: number): Promise<{ estimacion: Estimacion | null; error: string | null }> {
  const { data, error } = await supabase.rpc("estimate_soil_levels", { p_site_id: sitio, p_electrode: electrodo });
  if (error) return { estimacion: null, error: mensajeBase(error.message) };
  return { estimacion: data as Estimacion, error: null };
}

// ---------------------------------------------------------------- textos (puros)

export const TEXTO_ESTADO_CURVA: Record<EstadoCurva, { titulo: string; detalle: string; color: string }> = {
  insuficiente: { titulo: "Sin curva", detalle: "Hacen falta al menos dos puntos con mV distintos.", color: "#64748b" },
  provisional: { titulo: "Provisional", detalle: "Dos puntos: la recta pasa por ellos, todavía sin error estimado.", color: "#b45309" },
  incierta: { titulo: "Calibración incierta", detalle: "3 o 4 puntos: el error es una primera estimación.", color: "#b45309" },
  calibrada: { titulo: "Calibrada", detalle: "5 o más puntos: el modelo se eligió por su error de validación.", color: "#059669" },
};

export const TEXTO_MODELO: Record<ModeloCurva, string> = {
  lineal: "Recta",
  inversa: "Inversa (θ = P/mV − Q)",
  tramos: "Tramos (monótona)",
};

export const TEXTO_METODO: Record<Punto["method"], string> = {
  gravimetrico: "Gravimétrico (estufa)",
  otro_sensor: "Otro sensor",
  otro: "Otro",
  legado: "Calibración anterior",
};

export const TEXTO_ORIGEN: Record<OrigenNivel, string> = {
  textura: "Estimado por textura",
  laboratorio: "Laboratorio",
  datos: "De los datos del sensor",
  muestra: "Muestra de campo",
  legado: "Calibración anterior",
  otro: "Otro",
};

export const TEXTO_NIVEL: Record<Nivel["level"], { corto: string; largo: string }> = {
  pmp: { corto: "PMP", largo: "Punto de marchitez" },
  cc: { corto: "CC", largo: "Capacidad de campo" },
  sat: { corto: "SAT", largo: "Saturación" },
};

export const TEXTO_ESTADO_VALOR: Record<EstadoValor, string> = {
  calibrado: "dentro del rango calibrado",
  provisional: "provisional",
  extrapolado: "extrapolado",
  fuera_de_rango: "fuera del rango calibrado",
  sin_calibracion: "sin curva",
};

/** Clases texturales (USDA) para elegir. */
export const TEXTURAS = [
  "Arenoso",
  "Arenoso franco",
  "Franco arenoso",
  "Franco",
  "Franco limoso",
  "Limoso",
  "Franco arcillo arenoso",
  "Franco arcilloso",
  "Franco arcillo limoso",
  "Arcillo arenoso",
  "Arcillo limoso",
  "Arcilloso",
] as const;

/** "HH:MM" válida → la misma normalizada ("7:5" no; "07:05" sí, "7:05" sí). */
export function leerHora(texto: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Fecha "AAAA-MM-DD" + hora "HH:MM" en hora argentina → instante ISO. */
export function momentoArg(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00-03:00`;
}

/** Instante → "DD/MM/AAAA HH:MM" en hora argentina (UTC−3, sin horario de verano). */
export function fechaHoraArg(iso: string): string {
  const d = new Date(Date.parse(iso) - 3 * 3600e3);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}

/** Número escrito con coma o punto; null si vacío o inválido. */
export function leerNumero(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Estado de un electrodo según las marcas de control de calidad de una lectura. */
export function estadoDeMarcas(flags: string[] | null | undefined, electrodo: number): EstadoValor | null {
  const f = new Set(flags ?? []);
  for (const e of ["provisional", "extrapolado", "fuera_de_rango", "sin_calibracion"] as const) {
    if (f.has(`e${electrodo}_${e}`)) return e;
  }
  if (f.has(`e${electrodo}_fuera_de_calibracion`)) return "extrapolado";
  return null;
}
