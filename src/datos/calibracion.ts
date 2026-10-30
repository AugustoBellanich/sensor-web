// Calibración de un sitio (D-41), solo para ver: tipos y textos copiados de
// sensor-app/src/datos/calibracion.ts (misma lógica en app y web, D-83; cambiar en los dos). Cargar
// puntos, el suelo o los niveles se hace en la app, en el campo.
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type EstadoCurva = "insuficiente" | "provisional" | "incierta" | "calibrada";
export type ModeloCurva = "lineal" | "inversa" | "tramos";
export type EstadoValor = "calibrado" | "provisional" | "extrapolado" | "fuera_de_rango" | "sin_calibracion";
export type OrigenNivel = "textura" | "laboratorio" | "datos" | "muestra" | "legado" | "otro";

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
};

export type Punto = {
  id: string;
  device_id: string;
  sampled_at: string;
  mv: number;
  mv_source?: "lecturas" | "manual" | "ble" | "legado";
  theta_v: number;
  method: "gravimetrico" | "otro_sensor" | "otro" | "legado";
  method_detail: string | null;
  soil_temp: number | null;
  notes: string | null;
  active: boolean;
  deactivated_reason: string | null;
  created_by_name: string | null;
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
