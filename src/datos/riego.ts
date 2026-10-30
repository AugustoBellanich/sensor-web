// Copiado de sensor-app/src/datos/riego.ts (misma lógica en app y web, D-83; cambiar en los dos). En la
// web no hay cola sin señal: si falla, se avisa y no se pierde lo escrito.
// Riego del lote (D-50 a D-52): el sistema de riego con su historial y los riegos y lluvias. La
// base guarda lo que carga el usuario tal cual y calcula los mm (plot_water); acá se arma lo que
// se manda y se calcula la vista previa "aplica ≈ X mm/h", que tiene que dar lo mismo que la base.
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

/** "2,5" → 2.5; null si no es un número. */
export function leerNumero(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Hora actual en Argentina (UTC−3, sin horario de verano) como HH:MM. */
export function horaArgAhora(ahora: Date = new Date()): string {
  const d = new Date(ahora.getTime() - 3 * 3600e3);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Fecha actual en Argentina como AAAA-MM-DD. */
export function fechaArgHoy(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - 3 * 3600e3).toISOString().slice(0, 10);
}

export type MetodoRiego =
  | "goteo"
  | "goteo_subterraneo"
  | "microaspersion"
  | "aspersion"
  | "pivote"
  | "surco"
  | "manto_melga"
  | "secano"
  | "otro";

export const METODOS: readonly MetodoRiego[] = [
  "goteo",
  "goteo_subterraneo",
  "microaspersion",
  "aspersion",
  "pivote",
  "surco",
  "manto_melga",
  "secano",
  "otro",
];

export const NOMBRE_METODO: Record<MetodoRiego, string> = {
  goteo: "Goteo",
  goteo_subterraneo: "Goteo subterráneo",
  microaspersion: "Microaspersión",
  aspersion: "Aspersión",
  pivote: "Pivote",
  surco: "Surco",
  manto_melga: "Manto o melga",
  secano: "Secano (sin riego)",
  otro: "Otro",
};

export type FuenteAgua = "canal_turno" | "pozo" | "represa" | "red" | "otro";
export const NOMBRE_FUENTE: Record<FuenteAgua, string> = {
  canal_turno: "Canal (turno)",
  pozo: "Pozo",
  represa: "Represa o reservorio",
  red: "Red",
  otro: "Otra",
};

export type SistemaRiego = {
  id?: string;
  valid_from?: string;
  valid_to?: string | null;
  method: MetodoRiego;
  water_source: FuenteAgua | null;
  emitter_flow_lph: number | null;
  emitter_spacing_m: number | null;
  laterals_per_row: number | null;
  emitters_per_plant: number | null;
  application_rate_mmh: number | null;
  delivery_flow_lps: number | null;
  irrigated_area_ha: number | null;
  application_efficiency: number | null;
  has_flowmeter: boolean;
  notes: string | null;
};

export type CampoSistema =
  | "emitter_flow_lph"
  | "emitter_spacing_m"
  | "laterals_per_row"
  | "emitters_per_plant"
  | "application_rate_mmh"
  | "delivery_flow_lps"
  | "irrigated_area_ha";

/** Qué datos se piden para cada método (todos opcionales). */
export const CAMPOS_POR_METODO: Record<MetodoRiego, CampoSistema[]> = {
  goteo: ["emitter_flow_lph", "emitter_spacing_m", "laterals_per_row", "application_rate_mmh"],
  goteo_subterraneo: ["emitter_flow_lph", "emitter_spacing_m", "laterals_per_row", "application_rate_mmh"],
  microaspersion: ["emitter_flow_lph", "emitters_per_plant", "application_rate_mmh"],
  aspersion: ["application_rate_mmh"],
  pivote: ["application_rate_mmh"],
  surco: ["delivery_flow_lps", "irrigated_area_ha"],
  manto_melga: ["delivery_flow_lps", "irrigated_area_ha"],
  secano: [],
  otro: ["application_rate_mmh", "delivery_flow_lps", "irrigated_area_ha"],
};

export const DATOS_CAMPO: Record<CampoSistema, { etiqueta: string; ayuda: string; unidad: string }> = {
  emitter_flow_lph: { etiqueta: "Caudal del gotero (L/h)", ayuda: "Está impreso en la manguera o en el gotero: 1,6, 2, 4…", unidad: "L/h" },
  emitter_spacing_m: { etiqueta: "Distancia entre goteros (m)", ayuda: "Por ejemplo 0,5 si hay uno cada 50 cm.", unidad: "m" },
  laterals_per_row: { etiqueta: "Mangueras por hilera", ayuda: "1 o 2, las que corren a lo largo de cada hilera.", unidad: "" },
  emitters_per_plant: { etiqueta: "Emisores por planta", ayuda: "Cuántos microaspersores o goteros tiene cada planta.", unidad: "" },
  application_rate_mmh: { etiqueta: "Pluviometría (mm/h), si la sabés", ayuda: "Si la cargás, vale esta y no se calcula.", unidad: "mm/h" },
  delivery_flow_lps: {
    etiqueta: "Caudal habitual de entrega (L/s), si lo sabés",
    ayuda: "El que suele entrar al lote (turno o aforo). Si cambia en cada riego, dejalo vacío y cargalo en cada riego con «Caudal y horas».",
    unidad: "L/s",
  },
  irrigated_area_ha: { etiqueta: "Superficie regada (ha)", ayuda: "Solo si el riego cubre una parte del lote. Vacío = todo el lote.", unidad: "ha" },
};

/** Eficiencia de aplicación por defecto (la misma que usa la base, Howell 2003). */
export const EFICIENCIA_DEFECTO: Partial<Record<MetodoRiego, number>> = {
  goteo: 0.88,
  goteo_subterraneo: 0.88,
  microaspersion: 0.82,
  pivote: 0.84,
  aspersion: 0.7,
  surco: 0.62,
  manto_melga: 0.62,
};

/**
 * Lámina que aplica el sistema por hora (mm/h), con la misma regla que la base
 * (_irrigation_rate_mmh): la pluviometría cargada; si no, emisores y marco; si no, caudal de
 * entrega sobre la superficie. 1 L/m² = 1 mm.
 */
export function tasaMmH(
  s: Pick<SistemaRiego, "method" | "emitter_flow_lph" | "emitter_spacing_m" | "laterals_per_row" | "emitters_per_plant" | "application_rate_mmh" | "delivery_flow_lps" | "irrigated_area_ha">,
  entreHileras: number | null,
  entrePlantas: number | null,
  areaLoteHa: number | null,
): number | null {
  if (s.application_rate_mmh != null) return s.application_rate_mmh;
  const goteo = s.method === "goteo" || s.method === "goteo_subterraneo";
  if (goteo && s.emitter_flow_lph != null && s.emitter_spacing_m != null && entreHileras != null) {
    return (s.emitter_flow_lph * (s.laterals_per_row ?? 1)) / (s.emitter_spacing_m * entreHileras);
  }
  if ((goteo || s.method === "microaspersion") && s.emitter_flow_lph != null && entreHileras != null && entrePlantas != null) {
    return (s.emitter_flow_lph * (s.emitters_per_plant ?? 1)) / (entreHileras * entrePlantas);
  }
  const area = s.irrigated_area_ha ?? areaLoteHa;
  if (s.delivery_flow_lps != null && area != null && area > 0) return (s.delivery_flow_lps * 3600) / (area * 10000);
  return null;
}

/** Aviso si la lámina por hora es rara para el método (suele ser un dato mal cargado). */
export function avisoTasa(metodo: MetodoRiego, mmh: number | null): string | null {
  if (mmh == null) return null;
  const rango: Partial<Record<MetodoRiego, [number, number]>> = {
    goteo: [0.2, 10],
    goteo_subterraneo: [0.2, 10],
    microaspersion: [0.5, 15],
    aspersion: [2, 30],
    pivote: [2, 60],
  };
  const r = rango[metodo];
  if (!r) return null;
  if (mmh < r[0] || mmh > r[1]) {
    return `Para ${NOMBRE_METODO[metodo].toLowerCase()} lo común es entre ${String(r[0]).replace(".", ",")} y ${r[1]} mm/h: revisá los datos.`;
  }
  return null;
}

/** "2,5" → 150 min; "2:30" → 150; "45 min" no: solo horas. null si no se entiende o es 0. */
export function leerDuracion(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  const hm = t.match(/^(\d{1,3})[:h](\d{1,2})$/);
  if (hm) {
    const min = Number(hm[1]) * 60 + Number(hm[2]);
    return Number(hm[2]) < 60 && min > 0 ? min : null;
  }
  const h = leerNumero(t);
  return h != null && h > 0 ? Math.round(h * 60) : null;
}

/** 150 → "2 h 30 min". */
export function textoDuracion(min: number | null): string {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} h` : null, m ? `${m} min` : null].filter(Boolean).join(" ");
}

/** Número para mostrar: "2,7". */
export function mm(v: number | null | undefined, decimales = 1): string {
  return v == null ? "—" : v.toFixed(decimales).replace(".", ",");
}

// ---------------------------------------------------------------- eventos

export type TipoEvento = "riego" | "lluvia";
export type FormaCantidad = "horas" | "caudalimetro" | "volumen" | "lamina" | "caudal_y_horas" | "sin_cantidad";

export const NOMBRE_FORMA: Record<FormaCantidad, string> = {
  horas: "Horas",
  lamina: "Milímetros",
  caudalimetro: "Caudalímetro",
  volumen: "Volumen (m³)",
  caudal_y_horas: "Caudal y horas",
  sin_cantidad: "No sé",
};

/** Formas de cargar la cantidad, la más común primero según el sistema. */
export function formasPara(tipo: TipoEvento, metodo: MetodoRiego | null): FormaCantidad[] {
  if (tipo === "lluvia") return ["lamina", "sin_cantidad"];
  if (metodo === "pivote") return ["lamina", "horas", "caudalimetro", "volumen", "sin_cantidad"];
  if (metodo === "surco" || metodo === "manto_melga") return ["horas", "caudal_y_horas", "caudalimetro", "volumen", "lamina", "sin_cantidad"];
  return ["horas", "caudalimetro", "lamina", "volumen", "caudal_y_horas", "sin_cantidad"];
}

export type FormularioEvento = {
  tipo: TipoEvento;
  fecha: string | null; // AAAA-MM-DD
  hora: string | null; // HH:MM, hora argentina
  forma: FormaCantidad;
  duracion: string; // "2,5" o "2:30"
  medidorDesde: string;
  medidorHasta: string;
  volumen: string;
  lamina: string;
  caudal: string;
  notas: string;
};

export type EventoParaBase = {
  client_id: string;
  kind: TipoEvento;
  started_at: string;
  input_method: FormaCantidad;
  duration_min: number | null;
  meter_start_m3: number | null;
  meter_end_m3: number | null;
  volume_m3: number | null;
  depth_mm: number | null;
  flow_lps: number | null;
  notes: string | null;
};

/** Identificador del envío, generado en el teléfono: la base no duplica si llega dos veces. */
export function nuevoId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (x) => {
    const r = (Math.random() * 16) | 0;
    return (x === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Valida el formulario y arma lo que se manda a la base. */
export function armarEvento(
  f: FormularioEvento,
  ahora: Date = new Date(),
  id: string = nuevoId(),
): { ok: true; evento: EventoParaBase } | { ok: false; mensaje: string } {
  if (!f.fecha) return { ok: false, mensaje: "Poné la fecha." };
  const hora = f.hora?.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!hora || Number(hora[1]) > 23 || Number(hora[2]) > 59) return { ok: false, mensaje: "Poné la hora de inicio (HH:MM)." };
  const inicio = `${f.fecha}T${hora[1].padStart(2, "0")}:${hora[2]}:00-03:00`;
  if (Date.parse(inicio) > ahora.getTime() + 3600e3) return { ok: false, mensaje: "La fecha y hora no pueden ser futuras." };

  const duracion = leerDuracion(f.duracion);
  if (f.duracion.trim() && duracion == null) return { ok: false, mensaje: "La duración se escribe en horas: 2,5 o 2:30." };
  const n = (t: string) => leerNumero(t);
  const e: EventoParaBase = {
    client_id: id,
    kind: f.tipo,
    started_at: inicio,
    input_method: f.forma,
    duration_min: duracion,
    meter_start_m3: null,
    meter_end_m3: null,
    volume_m3: null,
    depth_mm: null,
    flow_lps: null,
    notes: f.notas.trim() || null,
  };
  switch (f.forma) {
    case "horas":
      if (duracion == null) return { ok: false, mensaje: "Poné cuánto duró el riego." };
      break;
    case "lamina": {
      const v = n(f.lamina);
      if (v == null || v <= 0 || v > 1000) return { ok: false, mensaje: "Poné los milímetros (más de 0)." };
      e.depth_mm = v;
      break;
    }
    case "caudalimetro": {
      const a = n(f.medidorDesde);
      const b = n(f.medidorHasta);
      if (a == null || b == null) return { ok: false, mensaje: "Poné la lectura del medidor al empezar y al terminar." };
      if (b < a) return { ok: false, mensaje: "La lectura final tiene que ser mayor que la inicial." };
      e.meter_start_m3 = a;
      e.meter_end_m3 = b;
      break;
    }
    case "volumen": {
      const v = n(f.volumen);
      if (v == null || v <= 0) return { ok: false, mensaje: "Poné el volumen en m³." };
      e.volume_m3 = v;
      break;
    }
    case "caudal_y_horas": {
      const q = n(f.caudal);
      if (q == null || q <= 0) return { ok: false, mensaje: "Poné el caudal en L/s." };
      if (duracion == null) return { ok: false, mensaje: "Poné cuánto duró el riego." };
      e.flow_lps = q;
      break;
    }
    case "sin_cantidad":
      break;
  }
  if (f.tipo === "lluvia" && f.forma !== "lamina" && f.forma !== "sin_cantidad") {
    return { ok: false, mensaje: "La lluvia se carga en milímetros." };
  }
  return { ok: true, evento: e };
}

/** Riego o lluvia de un lote, con los mm que calculó la base. */
export type EventoAgua = {
  id: string;
  client_id: string;
  kind: TipoEvento;
  started_at: string;
  duration_min: number | null;
  input_method: FormaCantidad;
  origin: string;
  notes: string | null;
  meter_start_m3: number | null;
  meter_end_m3: number | null;
  volume_in_m3: number | null;
  depth_in_mm: number | null;
  flow_lps: number | null;
  voided_at: string | null;
  void_reason: string | null;
  created_by_name: string | null;
  gross_mm: number | null;
  volume_m3: number | null;
  net_mm: number | null;
  calc: string;
  system_id: string | null;
  system_method: MetodoRiego | null;
  rate_mmh: number | null;
  efficiency: number | null;
};

/** Para el gráfico del sitio. */
export type AguaSitio = { id: string; kind: TipoEvento; started_at: string; duration_min: number | null; gross_mm: number | null; net_mm: number | null; calc: string; notes: string | null };

/** Total de mm brutos de una lista (los sin cantidad no suman). */
export function totalMm(eventos: { kind: TipoEvento; gross_mm: number | null }[], tipo: TipoEvento): { mm: number; n: number; sinCantidad: number } {
  const de = eventos.filter((e) => e.kind === tipo);
  return {
    mm: de.reduce((s, e) => s + (e.gross_mm ?? 0), 0),
    n: de.length,
    sinCantidad: de.filter((e) => e.gross_mm == null).length,
  };
}

/** ¿Hay un riego o lluvia registrado a menos de `horas` del momento t? */
export function explicada(t: number, eventos: { started_at: string; duration_min: number | null }[], horas = 3): boolean {
  return eventos.some((e) => {
    const ini = Date.parse(e.started_at);
    const fin = ini + (e.duration_min ?? 0) * 60e3;
    return t >= ini - horas * 3600e3 && t <= fin + horas * 3600e3;
  });
}

// ---------------------------------------------------------------- base

type Resultado = { ok: true } | { ok: false; mensaje: string };

export async function sistemasRiego(lote: string): Promise<{ sistemas: SistemaRiego[]; error: string | null }> {
  const { data, error } = await supabase
    .from("plot_irrigation_systems")
    .select("*")
    .eq("plot_id", lote)
    .order("valid_from", { ascending: false });
  return { sistemas: (data ?? []) as SistemaRiego[], error: error ? mensajeBase(error.message) : null };
}

/** Misma fecha que la versión vigente = corrección; posterior = cambio de sistema. */
export async function guardarSistema(lote: string, s: SistemaRiego, desde: string): Promise<Resultado> {
  const { id: _i, valid_from: _f, valid_to: _t, ...datos } = s;
  const { error } = await supabase.rpc("set_plot_irrigation", { p_plot_id: lote, p_system: datos, p_valid_from: desde });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export async function aguaLote(lote: string, desde: string, hasta: string, conAnulados = false): Promise<{ eventos: EventoAgua[]; error: string | null }> {
  const { data, error } = await supabase.rpc("plot_water", {
    p_plot_id: lote,
    p_from: desde,
    p_to: hasta,
    p_include_voided: conAnulados,
  });
  return { eventos: (data ?? []) as EventoAgua[], error: error ? mensajeBase(error.message) : null };
}

export async function aguaSitio(sitio: string, desde: number, hasta: number): Promise<{ eventos: AguaSitio[]; error: string | null }> {
  const { data, error } = await supabase.rpc("site_water", {
    p_site_id: sitio,
    p_from: new Date(desde).toISOString(),
    p_to: new Date(hasta).toISOString(),
  });
  return { eventos: (data ?? []) as AguaSitio[], error: error ? mensajeBase(error.message) : null };
}

const sinRed = (texto: string) => /network|fetch|timeout|abort/i.test(texto);

/** Manda el evento a la base para uno o varios lotes. */
export async function enviarEvento(lotes: string[], e: EventoParaBase): Promise<{ ok: true } | { ok: false; mensaje: string; sinRed: boolean }> {
  try {
    const { error } = await supabase.rpc("add_water_event", { p_plot_ids: lotes, p_event: e });
    if (!error) return { ok: true };
    return { ok: false, mensaje: mensajeBase(error.message), sinRed: sinRed(error.message) };
  } catch (x) {
    const t = x instanceof Error ? x.message : String(x);
    return { ok: false, mensaje: mensajeBase(t), sinRed: true };
  }
}

export async function corregirEvento(id: string, cambios: Partial<EventoParaBase>): Promise<Resultado> {
  const { error } = await supabase.rpc("edit_water_event", { p_id: id, p_event: cambios });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export async function anularEvento(id: string, motivo: string): Promise<Resultado> {
  if (!motivo.trim()) return { ok: false, mensaje: "Escribí el motivo." };
  const { error } = await supabase.rpc("void_water_event", { p_id: id, p_reason: motivo });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}
