// Copiado de sensor-app/src/datos/salud.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Salud de la red (D-70 a D-72): estado de cada equipo calculado en la base (network_health,
// sensor-db 20261020120000). La app solo lo muestra y lo pone en palabras.
import { mensajeBase } from "./errores";
import { duracion, hace } from "./estado";
import { supabase, URL_BASE } from "./supabase";

export { URL_BASE };

export type CodigoCausa =
  | "sin-conexion"
  | "sin-conexion-gateway"
  | "bateria-critica"
  | "bateria-baja"
  | "reloj"
  | "intermitente"
  | "no-carga"
  | "no-sube"
  | "sin-radio"
  | "sin-escuchar"
  | "senal-debil"
  | "sensores-sin-alta";

export type EstadoSalud = CodigoCausa | "al-dia" | "sin-datos" | "solo-sd";

export type Causa = {
  code: CodigoCausa | string;
  severity: number;
  title: string;
  advice: string;
  data: Record<string, unknown>;
};

export type SaludEquipo = {
  device_id: string;
  type: string;
  alias: string | null;
  site_name: string | null;
  establishment_id: string | null;
  establishment_name: string | null;
  gateway_id: string | null;
  state: EstadoSalud | string;
  severity: number;
  causes: Causa[];
  last_lora_at: string | null;
  last_reading_at: string | null;
  expected_interval_s: number | null;
  completeness_24h: number | null;
  clock_offset_s: number | null;
  battery_pct: number | null;
  battery_mv: number | null;
};

export async function saludRed(establecimiento?: string | null): Promise<{ equipos: SaludEquipo[]; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "network_health",
    establecimiento ? { p_establishment_id: establecimiento } : {},
  );
  if (error) return { equipos: [], error: mensajeBase(error.message) };
  return { equipos: (data ?? []) as SaludEquipo[], error: null };
}

/** Token nuevo para un gateway (dueño, editor o admin). El anterior deja de valer. */
export async function tokenNuevo(gateway: string): Promise<{ token: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("issue_ingest_token", { p_device_id: gateway });
  if (error) return { token: null, error: mensajeBase(error.message) };
  return { token: typeof data === "string" ? data : null, error: typeof data === "string" ? null : "La base no devolvió el token" };
}

// ---------------------------------------------------------------- en palabras (puras)

/** Gravedad → color del semáforo de la app. */
export type Nivel = "ok" | "aviso" | "grave" | "gris";

export function nivel(e: Pick<SaludEquipo, "state" | "severity">): Nivel {
  if (e.state === "sin-datos" || e.state === "solo-sd") return "gris";
  if (e.severity >= 4) return "grave";
  if (e.severity >= 1) return "aviso";
  return "ok";
}

export const TEXTO_ESTADO: Record<string, string> = {
  "al-dia": "Al día",
  "sin-datos": "Todavía no mandó datos",
  "solo-sd": "Solo guarda en la tarjeta SD",
};

/** Resumen del estado en la ficha: cuántos problemas y de qué gravedad (las causas se listan aparte). */
export function resumenEstado(e: Pick<SaludEquipo, "state" | "causes">): string {
  if (!e.causes.length) return TEXTO_ESTADO[e.state] ?? e.state;
  const graves = e.causes.filter((c) => c.severity >= 4).length;
  const avisos = e.causes.length - graves;
  return [graves ? `${graves} ${graves === 1 ? "problema grave" : "problemas graves"}` : null, avisos ? `${avisos} ${avisos === 1 ? "aviso" : "avisos"}` : null]
    .filter(Boolean)
    .join(" · ");
}

/** Título del estado: el de la causa más grave, o el del estado sin problemas. */
export function tituloEstado(e: Pick<SaludEquipo, "state" | "causes">): string {
  return e.causes[0]?.title ?? TEXTO_ESTADO[e.state] ?? e.state;
}

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const txt = (x: unknown): string | null => (typeof x === "string" && x ? x : null);

/** Detalle medible de una causa ("hace 5 h", "62 % de lo esperado en 24 h", "atrasado 1 h 10 min"). */
export function detalleCausa(c: Causa, ahora: Date = new Date()): string | null {
  const d = c.data ?? {};
  switch (c.code) {
    case "sin-conexion":
    case "sin-conexion-gateway":
    case "sin-escuchar": {
      const desde = txt(d.since);
      return desde ? `Último dato ${hace(desde, ahora)}` : "Nunca llegó un dato";
    }
    case "reloj": {
      const s = num(d.offset_s);
      if (s === null) return null;
      return `${s > 0 ? "Atrasado" : "Adelantado"} ${duracion(Math.abs(s))}`;
    }
    case "intermitente": {
      const p = num(d.completeness);
      const g = num(d.gaps);
      const partes = [p !== null ? `${Math.round(p * 100)} % de lo esperado en 24 h` : null, g ? `${g} cortes` : null];
      return partes.filter(Boolean).join(" · ") || null;
    }
    case "bateria-critica":
    case "bateria-baja": {
      const p = num(d.battery_pct);
      const mv = num(d.battery_mv);
      return [p !== null ? `${p} %` : null, mv !== null ? `${(mv / 1000).toFixed(2)} V` : null].filter(Boolean).join(" · ") || null;
    }
    case "no-carga": {
      const caida = num(d.drop_pct);
      const dias = num(d.days);
      return caida !== null ? `Bajó ${caida} puntos en ${dias ?? 3} días` : null;
    }
    case "no-sube": {
      const lotes = num(d.pending_batches);
      const err = num(d.errors_1h);
      return [lotes ? `${lotes} ${lotes === 1 ? "lote" : "lotes"} sin subir` : null, err ? `${err} ${err === 1 ? "envío" : "envíos"} con error en la última hora` : null]
        .filter(Boolean)
        .join(" · ") || null;
    }
    case "sensores-sin-alta": {
      const ids = Array.isArray(d.ids) ? (d.ids as unknown[]).filter((x): x is string => typeof x === "string") : [];
      return ids.length ? ids.join(", ") : null;
    }
    case "senal-debil": {
      const r = num(d.rssi);
      return r !== null ? `${r} dBm` : null;
    }
    default:
      return null;
  }
}

/**
 * Una sola frase por causa: qué pasa, el dato que lo mide y qué hacer, en ese orden y corta
 * ("Batería baja (22 %): limpiá el panel solar."). Reemplaza en pantalla al título, el detalle y
 * el consejo de la base, que siguen llegando para la web y los informes. `tipo`: modelo del
 * equipo (el receptor tiene otros consejos). Si el código es nuevo, título + consejo de la base.
 */
export function fraseCausa(c: Causa, tipo: string, ahora: Date = new Date()): string {
  const d = c.data ?? {};
  const desde = txt(d.since);
  const pct = num(d.battery_pct);
  const conPct = (t: string) => (pct !== null ? `${t} (${pct} %)` : t);
  switch (c.code) {
    case "sin-conexion":
      return tipo === "N01"
        ? `${desde ? `Sin conexión ${hace(desde, ahora)}` : "Sin conexión"}: revisá la alimentación y el WiFi.`
        : `${desde ? `Sin datos ${hace(desde, ahora)}` : "Nunca llegó un dato"}: revisá la batería y la antena.`;
    case "sin-conexion-gateway":
      return `Su receptor está sin conexión${desde ? ` ${hace(desde, ahora)}` : ""}: el problema está en el receptor.`;
    case "bateria-critica":
      return `${conPct("Batería crítica")}: cambiala o cargala.`;
    case "bateria-baja":
      return `${conPct("Batería baja")}: limpiá el panel solar.`;
    case "no-carga":
      return "La batería no carga: revisá el panel solar y el cable.";
    case "reloj": {
      const o = num(d.offset_s);
      const cuanto = o !== null ? ` ${duracion(Math.abs(o))}` : "";
      return `Reloj ${o !== null && o < 0 ? "adelantado" : "atrasado"}${cuanto}: ponelo en hora por Bluetooth.`;
    }
    case "intermitente": {
      const p = num(d.completeness);
      return `${p !== null ? `Llega el ${Math.round(p * 100)} % de los datos` : "Datos con cortes"}: revisá la antena y la distancia al receptor.`;
    }
    case "no-sube":
      return d.token === true ? "La base rechaza sus envíos: cargale un token nuevo." : "No puede subir los datos: revisá la conexión.";
    case "sin-radio":
      return "Radio LoRa sin iniciar: reiniciá el receptor.";
    case "sin-escuchar":
      return "No recibe sensores: revisá la antena del receptor.";
    case "sensores-sin-alta": {
      const n = Array.isArray(d.ids) ? d.ids.length : 0;
      return `${n > 1 ? `Recibe ${n} sensores` : "Recibe un sensor"} sin dar de alta: dalos de alta para guardar sus datos.`;
    }
    case "senal-debil":
      return "Señal WiFi débil: acercá el receptor al router.";
    default:
      return c.advice ? `${c.title}: ${c.advice.charAt(0).toLowerCase()}${c.advice.slice(1)}` : c.title;
  }
}

export type Resumen = { total: number; problemas: number; graves: number; gateways: number; sensores: number };

/** Cuántos equipos hay y cuántos necesitan atención (sin contar los que nunca mandaron). */
export function resumen(lista: SaludEquipo[]): Resumen {
  let problemas = 0;
  let graves = 0;
  let gateways = 0;
  for (const e of lista) {
    if (e.type === "N01") gateways++;
    const n = nivel(e);
    if (n === "aviso" || n === "grave") problemas++;
    if (n === "grave") graves++;
  }
  return { total: lista.length, problemas, graves, gateways, sensores: lista.length - gateways };
}

/** Frase de una línea para la cabecera del campo. */
export function fraseResumen(r: Resumen): string {
  if (r.total === 0) return "Este campo todavía no tiene equipos";
  if (r.problemas === 0) return r.total === 1 ? "El equipo está bien" : `Los ${r.total} equipos están bien`;
  const que = r.problemas === 1 ? "1 equipo necesita atención" : `${r.problemas} equipos necesitan atención`;
  return r.graves > 0 ? `${que} (${r.graves} con un problema grave)` : que;
}

/** Equipos que necesitan atención, de lo más grave a lo menos; después los demás. */
export function ordenar(lista: SaludEquipo[]): SaludEquipo[] {
  const peso = (e: SaludEquipo) => (nivel(e) === "gris" ? -1 : e.severity);
  return [...lista].sort((a, b) => peso(b) - peso(a) || a.type.localeCompare(b.type) || a.device_id.localeCompare(b.device_id));
}

/** Sensores que dependen de un gateway (su último dato LoRa llegó por él). */
export function sensoresDe(gateway: string, lista: SaludEquipo[]): SaludEquipo[] {
  return ordenar(lista.filter((e) => e.type !== "N01" && e.gateway_id === gateway));
}

/**
 * ok: la base aceptó al gateway (HTTP < 400), aunque haya rechazado lecturas.
 * sinAlta: lecturas rechazadas por sensores que no están dados de alta.
 */
export type Contacto = { http: number | null; ok: boolean; mensaje: string | null; cuando: string; sinAlta: number } | null;

/** Primer contacto del gateway con la base después de `desde`: un envío (ingest_logs) o un latido. */
export async function contactoDesde(gateway: string, desde: Date): Promise<{ contacto: Contacto; error: string | null }> {
  const iso = desde.toISOString();
  const [envios, latido] = await Promise.all([
    supabase
      .from("ingest_logs")
      .select("received_at,request_status,http_status,error_message,rejections")
      .eq("uploader_id", gateway)
      .gte("received_at", iso)
      .order("received_at", { ascending: false })
      .limit(1),
    supabase.from("gateway_status").select("last_heartbeat").eq("device_id", gateway).gte("last_heartbeat", iso).maybeSingle(),
  ]);
  const error = envios.error ?? latido.error;
  if (error) return { contacto: null, error: mensajeBase(error.message) };
  const e = envios.data?.[0] as
    | {
        received_at: string;
        request_status: string;
        http_status: number | null;
        error_message: string | null;
        rejections: Record<string, number> | null;
      }
    | undefined;
  if (e) {
    // "partial" o "rejected" con HTTP 200: la base aceptó el envío y rechazó algunas lecturas.
    const ok = e.request_status !== "error" && (e.http_status ?? 200) < 400;
    const sinAlta = e.rejections?.equipo_no_registrado ?? 0;
    return { contacto: { http: e.http_status, ok, mensaje: e.error_message, cuando: e.received_at, sinAlta }, error: null };
  }
  const l = latido.data as { last_heartbeat: string } | null;
  return { contacto: l ? { http: 200, ok: true, mensaje: null, cuando: l.last_heartbeat, sinAlta: 0 } : null, error: null };
}
