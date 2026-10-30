// Subconjunto de sensor-app/src/datos/campos.ts, riego.ts, copa.ts y geo.ts (misma lógica en app y
// web, D-83): lo que la web lee de campos, lotes, sitios, riegos y lluvias, copa y miembros.
// Cargar riegos, dibujar lotes y calibrar siguen en la app. Cambiar en los dos.
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type RolCampo = "owner" | "editor" | "viewer";
export type PoligonoGeoJson = { type: "Polygon"; coordinates: number[][][] };

export type Campo = {
  id: string;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  my_role: RolCampo | null;
  plots: number;
  sites: number;
  devices: number;
  area_ha: number | null;
  plots_area_ha: number | null;
  province: string | null;
  department: string | null;
  is_project: boolean;
};

export type Actividad = {
  id: string;
  activity_type: "crop" | "pasture" | "forest" | "other";
  crop_code: string | null;
  crop: string | null;
  variety: string | null;
  row_spacing_m: number | null;
  plant_spacing_m: number | null;
  planted_year: number | null;
  inter_row_cover: "suelo_desnudo" | "cubierta_vegetal" | "mulch" | null;
  phenological_stage: string | null;
  start_date: string | null;
  end_date: string | null;
};

export const NOMBRE_ACTIVIDAD: Record<Actividad["activity_type"], string> = {
  crop: "Cultivo",
  pasture: "Pastura",
  forest: "Forestal",
  other: "Otro",
};

export const NOMBRE_CUBIERTA: Record<NonNullable<Actividad["inter_row_cover"]>, string> = {
  suelo_desnudo: "Suelo desnudo",
  cubierta_vegetal: "Cubierta vegetal",
  mulch: "Mulch",
};

export type MetodoRiego = "goteo" | "goteo_subterraneo" | "microaspersion" | "aspersion" | "pivote" | "surco" | "manto_melga" | "secano" | "otro";

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

export type Lote = {
  id: string;
  name: string;
  area_ha: number | null;
  boundary: PoligonoGeoJson | null;
  shape_since: string | null;
  shapes: number;
  activity: (Actividad & { crop_name: string | null }) | null;
  irrigation_method: MetodoRiego | null;
  last_irrigation: string | null;
};

export type SitioCampo = {
  id: string;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  plot_id: string | null;
  device: { id: string; type: string; alias: string | null; since: string } | null;
};

export type DetalleCampo = {
  id: string;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  boundary: PoligonoGeoJson | null;
  area_ha: number | null;
  province: string | null;
  department: string | null;
  is_project: boolean;
  my_role: RolCampo | null;
  can_edit: boolean;
  is_owner: boolean;
  plots: Lote[];
  sites: SitioCampo[];
};

type ConError<T> = T & { error: string | null };
const fallo = (e: { message: string } | null) => (e ? mensajeBase(e.message) : null);

export async function misCampos(): Promise<ConError<{ campos: Campo[] }>> {
  const { data, error } = await supabase.rpc("my_establishments");
  return { campos: (data ?? []) as Campo[], error: fallo(error) };
}

export async function detalleCampo(id: string): Promise<ConError<{ campo: DetalleCampo | null }>> {
  const { data, error } = await supabase.rpc("establishment_detail", { p_establishment_id: id });
  return { campo: (data as DetalleCampo) ?? null, error: fallo(error) };
}

export type FormaLote = { id: string; valid_from: string; valid_to: string | null; area_ha: number; boundary: PoligonoGeoJson; created_by_name: string | null };

export async function historialLote(lote: string): Promise<ConError<{ formas: FormaLote[] }>> {
  const { data, error } = await supabase.rpc("plot_history", { p_plot_id: lote });
  return { formas: (data ?? []) as FormaLote[], error: fallo(error) };
}

export type PasoDeEquipo = { site_id: string; site_name: string; establishment_name: string | null; start_at: string; end_at: string | null };

export async function historialEquipo(equipo: string): Promise<ConError<{ pasos: PasoDeEquipo[] }>> {
  const { data, error } = await supabase.rpc("device_site_history", { p_device_id: equipo });
  return { pasos: (data ?? []) as PasoDeEquipo[], error: fallo(error) };
}

export type MiembroCampo = { user_id: string; full_name: string | null; email: string; role: RolCampo; created_at: string };

export async function miembrosCampo(campo: string): Promise<ConError<{ miembros: MiembroCampo[] }>> {
  const { data, error } = await supabase.rpc("establishment_members", { p_establishment_id: campo });
  return { miembros: (data ?? []) as MiembroCampo[], error: fallo(error) };
}

// ---------------------------------------------------------------- riego del lote

export type SistemaRiego = {
  id?: string;
  valid_from?: string;
  valid_to?: string | null;
  method: MetodoRiego;
  water_source: string | null;
  emitter_flow_lph: number | null;
  emitter_spacing_m: number | null;
  application_rate_mmh: number | null;
  delivery_flow_lps: number | null;
  irrigated_area_ha: number | null;
  application_efficiency: number | null;
  has_flowmeter: boolean;
  notes: string | null;
};

export async function sistemasRiego(lote: string): Promise<ConError<{ sistemas: SistemaRiego[] }>> {
  const { data, error } = await supabase.from("plot_irrigation_systems").select("*").eq("plot_id", lote).order("valid_from", { ascending: false });
  return { sistemas: (data ?? []) as SistemaRiego[], error: fallo(error) };
}

export type EventoAgua = {
  id: string;
  kind: "riego" | "lluvia";
  started_at: string;
  duration_min: number | null;
  origin: string;
  notes: string | null;
  voided_at: string | null;
  created_by_name: string | null;
  gross_mm: number | null;
  net_mm: number | null;
};

export async function aguaLote(lote: string, desde: string, hasta: string): Promise<ConError<{ eventos: EventoAgua[] }>> {
  const { data, error } = await supabase.rpc("plot_water", { p_plot_id: lote, p_from: desde, p_to: hasta, p_include_voided: false });
  return { eventos: (data ?? []) as EventoAgua[], error: fallo(error) };
}

/** "2 h 30 min", "45 min"; "" si no hay duración. */
export function textoDuracion(min: number | null): string {
  if (min == null) return "";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

/** mm con coma; "—" si no hay. */
export function mm(v: number | null | undefined, decimales = 1): string {
  return v == null ? "—" : `${v.toLocaleString("es-AR", { maximumFractionDigits: decimales })} mm`;
}

// ---------------------------------------------------------------- copa

export type MedicionCopa = { id: string; measured_on: string; fc: number | null; height_m: number | null; notes: string | null };

export async function medicionesCopa(lote: string): Promise<ConError<{ mediciones: MedicionCopa[] }>> {
  const { data, error } = await supabase.rpc("plot_canopy", { p_plot_id: lote, p_include_voided: false });
  return { mediciones: (data ?? []) as MedicionCopa[], error: fallo(error) };
}

// ---------------------------------------------------------------- geo

/** Superficie para mostrar: "0,85 ha", "12,3 ha", "1.250 ha". */
export function textoHa(ha: number | null | undefined): string {
  if (ha == null) return "—";
  const decimales = ha < 10 ? 2 : ha < 100 ? 1 : 0;
  return `${ha.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} ha`;
}

/** Anillo exterior de un polígono GeoJSON como [lat, lng] para Leaflet. */
export function anillo(g: PoligonoGeoJson | null | undefined): [number, number][] {
  return (g?.coordinates?.[0] ?? []).map(([lng, lat]) => [lat, lng] as [number, number]);
}
