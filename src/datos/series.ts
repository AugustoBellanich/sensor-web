// Copiado de sensor-app/src/datos/series.ts (D-83); en la web el CSV se descarga en lugar de compartirse.
// Datos de un sitio (D-39) y actividad del gateway: funciones de la base de la migración
// 20261004200000 (sensor-db) y, para el CSV, las tablas de lecturas con sus permisos (RLS).
import type { Dia, Electrodo, Unidad } from "./agro";
import {
  csvB01,
  csvC01,
  hojasLecturas,
  nombreArchivo,
  type FilaB01,
  type FilaC01,
} from "./csv";
import { libroXlsx } from "./planilla";
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type InfoSitio = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  establishment_id: string | null; // solo si soy miembro del campo (D-11)
  establishment_name: string | null;
  plot_name: string | null;
  device: {
    id: string;
    type: string;
    alias: string | null;
    since: string;
  } | null;
  electrodes: (Electrodo & { density: number | null; since: string })[];
  b01: { n: number; first: string; last: string } | null;
  c01: { n: number; first: string; last: string } | null;
  last_b01: LecturaSuelo | null;
  prev_b01: LecturaSuelo | null;
  last_c01: LecturaAire | null;
  prev_c01: LecturaAire | null;
};

export type LecturaSuelo = {
  t: string;
  sensor_id?: string;
  soil_temp: number | null;
  battery_pct?: number | null;
  qc_flags?: string[] | null;
} & Partial<Record<`e${1 | 2 | 3}_${Unidad}`, number | null>>;

export type LecturaAire = {
  t: string;
  sensor_id?: string;
  air_temp: number | null;
  humidity: number | null;
  dpv?: number | null;
  dew_point?: number | null;
  battery_pct?: number | null;
};

export type PuntoSerie = {
  t: string;
  family: "B01" | "C01";
  n: number;
  e1_mv: number | null;
  e2_mv: number | null;
  e3_mv: number | null;
  e1_hv: number | null;
  e2_hv: number | null;
  e3_hv: number | null;
  e1_hg: number | null;
  e2_hg: number | null;
  e3_hg: number | null;
  soil_temp: number | null;
  soil_temp_min: number | null;
  soil_temp_max: number | null;
  air_temp: number | null;
  air_temp_min: number | null;
  air_temp_max: number | null;
  humidity: number | null;
  battery_pct: number | null;
};

export async function infoSitio(
  id: string,
): Promise<{ info: InfoSitio | null; error: string | null }> {
  const { data, error } = await supabase.rpc("site_data_info", {
    p_site_id: id,
  });
  if (error) return { info: null, error: mensajeBase(error.message) };
  return { info: (data ?? null) as InfoSitio | null, error: null };
}

export async function serieSitio(
  id: string,
  desde: number,
  hasta: number,
  intervalo: number,
): Promise<{ b01: PuntoSerie[]; c01: PuntoSerie[]; error: string | null }> {
  const { data, error } = await supabase.rpc("site_series", {
    p_site_id: id,
    p_from: new Date(desde).toISOString(),
    p_to: new Date(hasta).toISOString(),
    p_bucket_s: intervalo,
  });
  if (error) return { b01: [], c01: [], error: mensajeBase(error.message) };
  const filas = ((data ?? []) as PuntoSerie[]).sort((a, b) =>
    a.t.localeCompare(b.t),
  );
  return {
    b01: filas.filter((f) => f.family === "B01"),
    c01: filas.filter((f) => f.family === "C01"),
    error: null,
  };
}

/** Resumen por día (hora argentina) de un rango de fechas "AAAA-MM-DD". */
export async function diarioSitio(
  id: string,
  desde: string,
  hasta: string,
  tbase = 10,
  calor = 30,
): Promise<{ dias: Dia[]; error: string | null }> {
  const { data, error } = await supabase.rpc("site_daily", {
    p_site_id: id,
    p_from: desde,
    p_to: hasta,
    p_tbase: tbase,
    p_calor: calor,
  });
  if (error) return { dias: [], error: mensajeBase(error.message) };
  return {
    dias: ((data ?? []) as Dia[]).sort((a, b) => a.dia.localeCompare(b.dia)),
    error: null,
  };
}

export type Mojado = {
  t: string;
  electrodo: number;
  subida: number;
  unidad: "hv" | "mv";
};

/** Subidas bruscas de humedad (posible riego o lluvia). */
export async function mojadosSitio(
  id: string,
  desde: number,
  hasta: number,
): Promise<{ mojados: Mojado[]; error: string | null }> {
  const { data, error } = await supabase.rpc("site_wetting", {
    p_site_id: id,
    p_from: new Date(desde).toISOString(),
    p_to: new Date(hasta).toISOString(),
  });
  if (error) return { mojados: [], error: mensajeBase(error.message) };
  return { mojados: (data ?? []) as Mojado[], error: null };
}

// ---------------------------------------------------------------- CSV

const PAGINA = 1000; // tope de filas por consulta de la API

async function todasLasFilas<T>(
  tabla: "readings_b01" | "readings_c01",
  columnas: string,
  sitio: string,
  desde: number,
  hasta: number,
) {
  const filas: T[] = [];
  for (let desdeFila = 0; ; desdeFila += PAGINA) {
    const { data, error } = await supabase
      .from(tabla)
      .select(columnas)
      .eq("site_id", sitio)
      .gte("timestamp", new Date(desde).toISOString())
      .lt("timestamp", new Date(hasta).toISOString())
      .order("timestamp")
      .order("sensor_id")
      .range(desdeFila, desdeFila + PAGINA - 1);
    if (error) return { filas, error: mensajeBase(error.message) };
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGINA) return { filas, error: null };
  }
}

export type Formato = "xlsx" | "csv";

/** Lecturas del período (todas, sin promediar) en una planilla .xlsx o un CSV, descargadas en el navegador. */
export async function descargarLecturas(
  info: InfoSitio,
  desde: number,
  hasta: number,
  formato: Formato = "xlsx",
): Promise<{ ok: boolean; mensaje?: string; filas?: number }> {
  const familia = info.c01 && !info.b01 ? "C01" : "B01";
  const prof: Record<number, number | null> = {};
  for (const e of info.electrodes) prof[e.index] = e.depth;
  let b01: FilaB01[] = [];
  let c01: FilaC01[] = [];
  if (familia === "B01") {
    const r = await todasLasFilas<FilaB01>(
      "readings_b01",
      "timestamp,sensor_id,e1_mv,e2_mv,e3_mv,e1_hv,e2_hv,e3_hv,e1_hg,e2_hg,e3_hg,soil_temp,battery_pct,battery_mv,qc_flags",
      info.id,
      desde,
      hasta,
    );
    if (r.error) return { ok: false, mensaje: r.error };
    b01 = r.filas;
  } else {
    const r = await todasLasFilas<FilaC01>(
      "readings_c01",
      "timestamp,sensor_id,air_temp,humidity,battery_pct,battery_mv,qc_flags",
      info.id,
      desde,
      hasta,
    );
    if (r.error) return { ok: false, mensaje: r.error };
    c01 = r.filas;
  }
  const cantidad = b01.length + c01.length;
  if (cantidad === 0)
    return { ok: false, mensaje: "No hay lecturas en ese período." };

  const nombre = nombreArchivo(info.name, desde, hasta);
  const archivo =
    formato === "csv"
      ? new Blob([familia === "B01" ? csvB01(b01, prof) : csvC01(c01)], {
          type: "text/csv;charset=utf-8",
        })
      : new Blob(
          [
            libroXlsx(
              hojasLecturas(info, familia, b01, c01, prof, desde, hasta),
            ) as BlobPart,
          ],
          {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        );
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download =
    formato === "csv" ? nombre : nombre.replace(/\.csv$/, ".xlsx");
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  return { ok: true, filas: cantidad };
}

// ---------------------------------------------------------------- gateway

export type EstadoGateway = {
  device_id: string;
  last_heartbeat: string;
  fw_version: string | null;
  wifi_status: string | null;
  battery_pct: number | null;
  battery_mv: number | null;
  uptime_s: number | null;
  free_heap: number | null;
  lora_ready: boolean | null;
  pending_batches: number | null;
  last_lora_rx: string | null;
  rssi: number | null;
};

export type ActividadHora = {
  t: string;
  envios: number;
  errores: number;
  recibidas: number;
  insertadas: number;
  duplicadas: number;
  rechazadas: number;
  demora_prom_s: number | null;
  demora_max_s: number | null;
  proceso_prom_ms: number | null;
};

export type Envio = {
  id: number;
  received_at: string;
  request_status: string;
  readings_received: number | null;
  readings_inserted: number | null;
  readings_duplicate: number | null;
  readings_rejected: number | null;
  sensors_count: number | null;
  sensor_ids: string[] | null;
  processing_ms: number | null;
  upload_delay_seconds: number | null;
  http_status: number | null;
  error_message: string | null;
};

export async function actividadGateway(
  id: string,
  desde: number,
  hasta: number,
  intervalo: number,
): Promise<{
  estado: EstadoGateway | null;
  horas: ActividadHora[];
  envios: Envio[];
  error: string | null;
}> {
  const [estado, horas, envios] = await Promise.all([
    supabase
      .from("gateway_status")
      .select("*")
      .eq("device_id", id)
      .maybeSingle(),
    supabase.rpc("gateway_activity", {
      p_device_id: id,
      p_from: new Date(desde).toISOString(),
      p_to: new Date(hasta).toISOString(),
      p_bucket_s: intervalo,
    }),
    supabase
      .from("ingest_logs")
      .select(
        "id,received_at,request_status,readings_received,readings_inserted,readings_duplicate,readings_rejected,sensors_count,sensor_ids,processing_ms,upload_delay_seconds,http_status,error_message",
      )
      .eq("uploader_id", id)
      .order("received_at", { ascending: false })
      .limit(30),
  ]);
  const error = estado.error ?? horas.error ?? envios.error;
  return {
    estado: (estado.data ?? null) as EstadoGateway | null,
    horas: (horas.data ?? []) as ActividadHora[],
    envios: (envios.data ?? []) as Envio[],
    error: error ? mensajeBase(error.message) : null,
  };
}
