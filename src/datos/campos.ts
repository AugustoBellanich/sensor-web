// Subconjunto de sensor-app/src/datos/campos.ts, riego.ts, copa.ts y geo.ts (misma lógica en app y
// web, D-83): lo que la web lee de campos, lotes, sitios, riegos y lluvias, copa y miembros.
// Crear y editar campos y sus miembros también se hace acá; dibujar lotes y calibrar siguen en la
// app. Cambiar en los dos.
import type { Resultado } from "./cuenta";
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

export const NOMBRE_CUBIERTA: Record<
  NonNullable<Actividad["inter_row_cover"]>,
  string
> = {
  suelo_desnudo: "Suelo desnudo",
  cubierta_vegetal: "Cubierta vegetal",
  mulch: "Mulch",
};

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
  device: {
    id: string;
    type: string;
    alias: string | null;
    since: string;
  } | null;
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
const fallo = (e: { message: string } | null) =>
  e ? mensajeBase(e.message) : null;

export async function misCampos(): Promise<ConError<{ campos: Campo[] }>> {
  const { data, error } = await supabase.rpc("my_establishments");
  return { campos: (data ?? []) as Campo[], error: fallo(error) };
}

export async function detalleCampo(
  id: string,
): Promise<ConError<{ campo: DetalleCampo | null }>> {
  const { data, error } = await supabase.rpc("establishment_detail", {
    p_establishment_id: id,
  });
  return { campo: (data as DetalleCampo) ?? null, error: fallo(error) };
}

export type FormaLote = {
  id: string;
  valid_from: string;
  valid_to: string | null;
  area_ha: number;
  boundary: PoligonoGeoJson;
  created_by_name: string | null;
};

export async function historialLote(
  lote: string,
): Promise<ConError<{ formas: FormaLote[] }>> {
  const { data, error } = await supabase.rpc("plot_history", {
    p_plot_id: lote,
  });
  return { formas: (data ?? []) as FormaLote[], error: fallo(error) };
}

export type PasoDeEquipo = {
  site_id: string;
  site_name: string;
  establishment_name: string | null;
  start_at: string;
  end_at: string | null;
};

export async function historialEquipo(
  equipo: string,
): Promise<ConError<{ pasos: PasoDeEquipo[] }>> {
  const { data, error } = await supabase.rpc("device_site_history", {
    p_device_id: equipo,
  });
  return { pasos: (data ?? []) as PasoDeEquipo[], error: fallo(error) };
}

export type MiembroCampo = {
  user_id: string;
  full_name: string | null;
  email: string;
  role: RolCampo;
  created_at: string;
};

export async function miembrosCampo(
  campo: string,
): Promise<ConError<{ miembros: MiembroCampo[] }>> {
  const { data, error } = await supabase.rpc("establishment_members", {
    p_establishment_id: campo,
  });
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

export async function sistemasRiego(
  lote: string,
): Promise<ConError<{ sistemas: SistemaRiego[] }>> {
  const { data, error } = await supabase
    .from("plot_irrigation_systems")
    .select("*")
    .eq("plot_id", lote)
    .order("valid_from", { ascending: false });
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

export async function aguaLote(
  lote: string,
  desde: string,
  hasta: string,
): Promise<ConError<{ eventos: EventoAgua[] }>> {
  const { data, error } = await supabase.rpc("plot_water", {
    p_plot_id: lote,
    p_from: desde,
    p_to: hasta,
    p_include_voided: false,
  });
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
  return v == null
    ? "—"
    : `${v.toLocaleString("es-AR", { maximumFractionDigits: decimales })} mm`;
}

// ---------------------------------------------------------------- copa

export type MedicionCopa = {
  id: string;
  measured_on: string;
  fc: number | null;
  height_m: number | null;
  notes: string | null;
};

export async function medicionesCopa(
  lote: string,
): Promise<ConError<{ mediciones: MedicionCopa[] }>> {
  const { data, error } = await supabase.rpc("plot_canopy", {
    p_plot_id: lote,
    p_include_voided: false,
  });
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
export function anillo(
  g: PoligonoGeoJson | null | undefined,
): [number, number][] {
  return (g?.coordinates?.[0] ?? []).map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );
}

// ---------------------------------------------------------------- gestión del campo

export async function crearCampo(
  nombre: string,
  descripcion: string,
  ubicacion: { lat: number; lng: number } | null,
): Promise<{ ok: true; id: string } | { ok: false; mensaje: string }> {
  if (!nombre.trim()) return { ok: false, mensaje: "Escribí un nombre." };
  const { data, error } = await supabase.rpc("create_establishment", {
    p_name: nombre.trim(),
    p_description: descripcion.trim() || null,
    p_lat: ubicacion?.lat ?? null,
    p_lng: ubicacion?.lng ?? null,
  });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  return { ok: true, id: data as string };
}

export async function editarCampo(
  id: string,
  cambios: {
    name?: string;
    description?: string | null;
    province?: string | null;
    department?: string | null;
    lat?: number;
    lng?: number;
  },
): Promise<Resultado> {
  const { error, count } = await supabase
    .from("establishments")
    .update(cambios, { count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  return count
    ? { ok: true }
    : { ok: false, mensaje: "No tenés permiso para cambiar este campo." };
}

/** Marca "del proyecto" (D-37). Solo admin y staff. */
export async function marcarDelProyecto(
  tipo: "device" | "establishment",
  id: string,
  valor: boolean,
): Promise<Resultado> {
  const { error } = await supabase.rpc("set_project_flag", {
    p_kind: tipo,
    p_id: id,
    p_value: valor,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

export async function compartirCampo(
  campo: string,
  correo: string,
  rol: "editor" | "viewer",
): Promise<Resultado> {
  if (!correo.trim())
    return { ok: false, mensaje: "Escribí el correo de la persona." };
  const { data, error } = await supabase.rpc("share_establishment", {
    p_establishment_id: campo,
    p_email: correo.trim().toLowerCase(),
    p_role: rol,
  });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  const r = data as { ok: boolean; error?: string };
  return r.ok ? { ok: true } : { ok: false, mensaje: mensajeBase(r.error) };
}

export async function quitarDelCampo(
  campo: string,
  usuario: string,
): Promise<Resultado> {
  const { error } = await supabase.rpc("unshare_establishment", {
    p_establishment_id: campo,
    p_user_id: usuario,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

// ---------------------------------------------------------------- sitios

/** ¿El punto cae dentro del polígono? (anillo [lat, lng], par-impar). */
export function dentroDe(
  p: { lat: number; lng: number },
  anilloLatLng: [number, number][],
): boolean {
  let adentro = false;
  for (
    let i = 0, j = anilloLatLng.length - 1;
    i < anilloLatLng.length;
    j = i++
  ) {
    const [aLat, aLng] = anilloLatLng[i];
    const [bLat, bLng] = anilloLatLng[j];
    if (
      aLat > p.lat !== bLat > p.lat &&
      p.lng < ((bLng - aLng) * (p.lat - aLat)) / (bLat - aLat) + aLng
    )
      adentro = !adentro;
  }
  return adentro;
}

/** El lote donde cae el punto, si cae en alguno. */
export function loteDelPunto(
  campo: DetalleCampo,
  p: { lat: number; lng: number },
): string | null {
  return (
    campo.plots.find((l) => l.boundary && dentroDe(p, anillo(l.boundary)))
      ?.id ?? null
  );
}

export async function crearSitio(
  campo: string,
  nombre: string,
  punto: { lat: number; lng: number },
  lote: string | null,
  descripcion: string,
): Promise<
  | { ok: true; id: string; dentroDelLote: boolean | null }
  | { ok: false; mensaje: string }
> {
  if (!nombre.trim())
    return { ok: false, mensaje: "Escribí un nombre para el sitio." };
  const { data, error } = await supabase.rpc("create_site", {
    p_establishment_id: campo,
    p_name: nombre.trim(),
    p_lat: punto.lat,
    p_lng: punto.lng,
    p_plot_id: lote,
    p_description: descripcion.trim() || null,
  });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  const r = data as { id: string; inside_plot: boolean | null };
  return { ok: true, id: r.id, dentroDelLote: r.inside_plot };
}

export async function editarSitio(
  id: string,
  cambios: {
    name?: string;
    description?: string | null;
    lat?: number;
    lng?: number;
    plot_id?: string | null;
  },
): Promise<Resultado> {
  const { error, count } = await supabase
    .from("sites")
    .update(cambios, { count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  return count
    ? { ok: true }
    : { ok: false, mensaje: "No tenés permiso para cambiar este sitio." };
}

export type PasoPorSitio = {
  device_id: string;
  device_type: string;
  device_alias: string | null;
  start_at: string;
  end_at: string | null;
};

export async function historialSitio(
  sitio: string,
): Promise<ConError<{ pasos: PasoPorSitio[] }>> {
  const { data, error } = await supabase.rpc("site_device_history", {
    p_site_id: sitio,
  });
  return { pasos: (data ?? []) as PasoPorSitio[], error: fallo(error) };
}

const inicioDelDia = (iso: string) => `${iso}T00:00:00-03:00`;

/** Pone el equipo en el sitio desde esa fecha; si estaba en otro, esa ubicación se cierra. */
export async function ubicarEquipo(
  equipo: string,
  sitio: string,
  desde: string,
): Promise<Resultado> {
  const { error } = await supabase.rpc("reassign_device_to_site", {
    p_device_id: equipo,
    p_site_id: sitio,
    p_at: inicioDelDia(desde),
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

export async function quitarEquipo(
  equipo: string,
  hasta: string,
): Promise<Resultado> {
  const { error } = await supabase.rpc("unassign_device_from_site", {
    p_device_id: equipo,
    p_at: inicioDelDia(hasta),
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

// ---------------------------------------------------------------- lotes, perímetro y cultivo

export async function crearLote(
  campo: string,
  nombre: string,
  forma: PoligonoGeoJson,
  desde: string,
): Promise<{ ok: true; id: string } | { ok: false; mensaje: string }> {
  if (!nombre.trim())
    return { ok: false, mensaje: "Escribí un nombre para el lote." };
  const { data, error } = await supabase.rpc("create_plot", {
    p_establishment_id: campo,
    p_name: nombre.trim(),
    p_boundary: forma,
    p_valid_from: desde,
  });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  return { ok: true, id: data as string };
}

export async function redibujarLote(
  lote: string,
  forma: PoligonoGeoJson,
  desde: string,
): Promise<Resultado> {
  const { error } = await supabase.rpc("set_plot_boundary", {
    p_plot_id: lote,
    p_boundary: forma,
    p_valid_from: desde,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

export async function renombrarLote(
  lote: string,
  nombre: string,
): Promise<Resultado> {
  if (!nombre.trim()) return { ok: false, mensaje: "Escribí un nombre." };
  const { error } = await supabase
    .from("plots")
    .update({ name: nombre.trim() })
    .eq("id", lote);
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

/** Perímetro del campo; null lo borra (la web no completa la provincia sola: se escribe al editar el campo). */
export async function perimetroCampo(
  id: string,
  forma: PoligonoGeoJson | null,
): Promise<Resultado> {
  const { error } = await supabase.rpc("set_establishment_boundary", {
    p_establishment_id: id,
    p_boundary: forma,
  });
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

export type Cultivo = {
  code: string;
  name: string;
  group_name: string;
  perennial: boolean;
  sort: number;
};
export type Variedad = { crop_code: string; name: string };

let listasCache: { cultivos: Cultivo[]; variedades: Variedad[] } | null = null;

/** Cultivos y variedades de la lista de la base (D-54); se leen una vez por sesión. */
export async function listasCultivos(): Promise<
  ConError<{ cultivos: Cultivo[]; variedades: Variedad[] }>
> {
  if (listasCache) return { ...listasCache, error: null };
  const [c, v] = await Promise.all([
    supabase
      .from("crops")
      .select("code, name, group_name, perennial, sort")
      .eq("active", true)
      .order("sort"),
    supabase
      .from("crop_varieties")
      .select("crop_code, name")
      .eq("active", true)
      .order("name"),
  ]);
  const error = c.error ?? v.error;
  if (error)
    return { cultivos: [], variedades: [], error: mensajeBase(error.message) };
  listasCache = {
    cultivos: (c.data ?? []) as Cultivo[],
    variedades: (v.data ?? []) as Variedad[],
  };
  return { ...listasCache, error: null };
}

/** Tipo de actividad según el cultivo (igual que la app). */
export function tipoDeCultivo(
  c: Cultivo | undefined,
): Actividad["activity_type"] {
  if (!c) return "crop";
  if (c.group_name === "Forrajes") return "pasture";
  if (c.code === "forestal" || c.code === "monte_nativo") return "forest";
  if (c.code === "otro") return "other";
  return "crop";
}

/** Plantas por hectárea con el marco (m entre hileras × m entre plantas). */
export function plantasPorHa(
  entreHileras: number | null,
  entrePlantas: number | null,
): number | null {
  if (!entreHileras || !entrePlantas || entreHileras <= 0 || entrePlantas <= 0)
    return null;
  return Math.round(10000 / (entreHileras * entrePlantas));
}

export async function guardarActividad(
  lote: string,
  a: Omit<Actividad, "id"> & { id?: string },
): Promise<Resultado> {
  const fila = {
    plot_id: lote,
    activity_type: a.activity_type,
    crop_code: a.crop_code,
    crop: a.crop?.trim() || null,
    variety: a.variety?.trim() || null,
    row_spacing_m: a.row_spacing_m,
    plant_spacing_m: a.plant_spacing_m,
    planted_year: a.planted_year,
    inter_row_cover: a.inter_row_cover,
    phenological_stage: a.phenological_stage?.trim() || null,
    start_date: a.start_date,
    end_date: a.end_date,
  };
  const { error } = a.id
    ? await supabase.from("plot_activities").update(fila).eq("id", a.id)
    : await supabase.from("plot_activities").insert(fila);
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}

export async function borrarActividad(id: string): Promise<Resultado> {
  const { error } = await supabase
    .from("plot_activities")
    .delete()
    .eq("id", id);
  return error
    ? { ok: false, mensaje: mensajeBase(error.message) }
    : { ok: true };
}
