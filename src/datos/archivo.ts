// Copiado de sensor-app/src/datos/archivo.ts (misma lógica en app y web, D-83), sin pasarA (en la web
// está en administracion.ts). Cambiar en los dos.
// Borrar o archivar sitios, lotes y campos, y borrar o retirar equipos (D-45, D-46;
// sensor-db migraciones 20261006160000 y 20261006180000).
// Lo vacío se borra; lo que tiene datos se archiva o se retira y conserva todo.
// Lo decide la base; la app pide antes qué contiene para mostrarlo en la confirmación.
import type { Resultado } from "./cuenta";
import { mensajeBase } from "./errores";
import { mostrarFecha } from "./fechas";
import { supabase } from "./supabase";

export type ContenidoSitio = {
  readings: number;
  first_at: string | null;
  last_at: string | null;
  calibration_points: number;
  soil_records: number;
  assignments: number;
  device: string | null;
  has_data: boolean;
};

export type ContenidoLote = {
  sites: number;
  archived_sites: number;
  activities: number;
  shapes: number;
  readings: number;
  has_data: boolean;
};

export type ContenidoCampo = {
  plots: number;
  sites: number;
  archived: number;
  devices: number;
  readings: number;
  members: number;
  has_data: boolean;
};

export type ContenidoEquipo = {
  readings: number;
  forwarded: number; // lecturas de otros equipos que pasaron por este gateway
  assignments: number;
  calibration: number;
  workshop: number;
  site: string | null;
  has_data: boolean;
};

export type CampoArchivado = { id: string; name: string; archived_at: string; province: string | null };

export type Archivados = {
  plots: { id: string; name: string; archived_at: string }[];
  sites: { id: string; name: string; archived_at: string; plot_id: string | null; plot_archived: boolean }[];
};

/** Espera antes de poder confirmar el archivado de algo con datos. */
export const ESPERA_ARCHIVAR_S = 10;

export type TipoQuitar = "sitio" | "lote" | "campo" | "equipo";
export type Accion = "borrado" | "archivado" | "retirado";

type Contenidos = { sitio: ContenidoSitio; lote: ContenidoLote; campo: ContenidoCampo; equipo: ContenidoEquipo };

const RPC = {
  sitio: { info: "site_removal_info", quitar: "remove_site", restaurar: "restore_site", param: "p_site_id" },
  lote: { info: "plot_removal_info", quitar: "remove_plot", restaurar: "restore_plot", param: "p_plot_id" },
  campo: {
    info: "establishment_removal_info",
    quitar: "remove_establishment",
    restaurar: "restore_establishment",
    param: "p_establishment_id",
  },
  equipo: { info: "device_removal_info", quitar: "remove_device", restaurar: "reactivate_device", param: "p_device_id" },
} as const;

export async function contenido<T extends TipoQuitar>(
  tipo: T,
  id: string,
): Promise<{ contenido: Contenidos[T] | null; error: string | null }> {
  const r = RPC[tipo];
  const { data, error } = await supabase.rpc(r.info, { [r.param]: id });
  if (error) return { contenido: null, error: mensajeBase(error.message) };
  return { contenido: data, error: null };
}

/** Borra, archiva o retira; devuelve qué hizo la base. */
export async function quitar(tipo: TipoQuitar, id: string): Promise<Resultado & { accion?: Accion }> {
  const r = RPC[tipo];
  const { data, error } = await supabase.rpc(r.quitar, { [r.param]: id });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  return { ok: true, accion: data as Accion };
}

/** Restaura lo archivado o reactiva un equipo retirado. */
export async function restaurar(tipo: TipoQuitar, id: string): Promise<Resultado> {
  const r = RPC[tipo];
  const { error } = await supabase.rpc(r.restaurar, { [r.param]: id });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

// ---------------------------------------------------------------- textos (puros)

/** Día en Argentina (UTC−3) de un instante: la primera lectura de las 22 h no es "del día siguiente". */
const diaArg = (instante: string) => new Date(new Date(instante).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);

const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-AR")} ${n === 1 ? uno : varios}`;

/** Lo que tiene un sitio, en renglones cortos para la confirmación. */
export function resumenSitio(c: ContenidoSitio): string[] {
  const r: string[] = [];
  if (c.readings > 0) {
    const desde = c.first_at ? ` desde el ${mostrarFecha(diaArg(c.first_at))}` : "";
    r.push(`${plural(c.readings, "lectura", "lecturas")}${desde}`);
  }
  if (c.calibration_points > 0) r.push(plural(c.calibration_points, "punto de calibración", "puntos de calibración"));
  if (c.soil_records > 0) r.push(plural(c.soil_records, "dato de suelo", "datos de suelo"));
  if (c.device) r.push(`${c.device} instalado (queda libre)`);
  else if (c.assignments > 0) r.push(plural(c.assignments, "equipo en su historial", "equipos en su historial"));
  return r;
}

/** Lo que tiene un lote. */
export function resumenLote(c: ContenidoLote): string[] {
  const r: string[] = [];
  if (c.sites > 0) r.push(`${plural(c.sites, "sitio", "sitios")} (se archivan con el lote)`);
  if (c.readings > 0) r.push(plural(c.readings, "lectura", "lecturas"));
  if (c.activities > 0) r.push(plural(c.activities, "actividad", "actividades"));
  if (c.shapes > 1) r.push(plural(c.shapes, "perímetro en el historial", "perímetros en el historial"));
  return r;
}

/** Campos archivados que la persona puede restaurar (dueña o admin/staff). */
export async function camposArchivados(): Promise<{ campos: CampoArchivado[]; error: string | null }> {
  const { data, error } = await supabase.rpc("archived_establishments");
  if (error) return { campos: [], error: mensajeBase(error.message) };
  return { campos: (data ?? []) as CampoArchivado[], error: null };
}

/** Lo que tiene un campo. */
export function resumenCampo(c: ContenidoCampo): string[] {
  const r: string[] = [];
  if (c.plots > 0) r.push(plural(c.plots, "lote", "lotes"));
  if (c.sites > 0) r.push(plural(c.sites, "sitio", "sitios"));
  if (c.devices > 0) r.push(`${plural(c.devices, "equipo instalado", "equipos instalados")} (quedan libres)`);
  if (c.readings > 0) r.push(plural(c.readings, "lectura", "lecturas"));
  if (c.archived > 0) r.push(plural(c.archived, "lote o sitio ya archivado", "lotes o sitios ya archivados"));
  return r;
}

/** Lo que tiene un equipo. */
export function resumenEquipo(c: ContenidoEquipo): string[] {
  const r: string[] = [];
  if (c.readings > 0) r.push(plural(c.readings, "lectura propia", "lecturas propias"));
  if (c.forwarded > 0) r.push(`${plural(c.forwarded, "lectura reenviada", "lecturas reenviadas")} como receptor`);
  if (c.site) r.push("Instalado en un sitio (queda libre)");
  else if (c.assignments > 0) r.push(plural(c.assignments, "sitio en su historial", "sitios en su historial"));
  if (c.calibration > 0) r.push(plural(c.calibration, "dato de calibración", "datos de calibración"));
  if (c.workshop > 0) r.push(plural(c.workshop, "registro de taller", "registros de taller"));
  return r;
}
