// Copiado de sensor-app/src/datos/equipos.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Equipos: estado, vincular con código, compartir. Todo por funciones de la base (RPC),
// que controlan permisos adentro (sensor-db, migración 20261004100000).
import type { Resultado } from "./cuenta";
import { mensajeBase } from "./errores";
import { normalizarId } from "./estado";
import { supabase } from "./supabase";

export type Rol = "owner" | "editor" | "viewer";

export type EstadoEquipo = {
  id: string;
  type: string;
  alias: string | null;
  activity: string;
  my_role: Rol | null;
  owner_name: string | null; // solo admin/staff
  owner_email: string | null; // solo admin/staff
  claimed: boolean;
  site_id: string | null;
  site_name: string | null;
  plot_name: string | null; // solo si soy miembro del campo (D-11)
  establishment_id: string | null;
  establishment_name: string | null;
  province: string | null;
  is_project: boolean;
  last_reading_at: string | null;
  battery_pct: number | null;
  battery_mv: number | null;
  gateway_last_heartbeat: string | null;
  gateway_fw_version: string | null;
  gateway_pending_batches: number | null;
  gateway_wifi_status: string | null;
};

export { mensajeBase };

export type Miembro = { user_id: string; full_name: string | null; email: string; role: Rol; created_at: string };

export async function estadoEquipos(): Promise<{ equipos: EstadoEquipo[]; error: string | null }> {
  const { data, error } = await supabase.rpc("device_overview");
  if (error) return { equipos: [], error: mensajeBase(error.message) };
  return { equipos: (data ?? []) as EstadoEquipo[], error: null };
}

export async function vincular(id: string, codigo: string): Promise<Resultado> {
  const limpio = normalizarId(id);
  if (!limpio) return { ok: false, mensaje: "Escribí el id del equipo." };
  if (!codigo.trim()) return { ok: false, mensaje: "Escribí el código de vinculación." };
  const { data, error } = await supabase.rpc("claim_device", {
    p_device_id: limpio,
    p_claim_code: codigo.trim().toUpperCase(),
  });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  const r = data as { ok: boolean; error?: string; attempts_left?: number };
  if (r.ok) return { ok: true };
  let mensaje = mensajeBase(r.error);
  if (r.error === "invalid_claim_code" && r.attempts_left != null) {
    mensaje += ` Te quedan ${r.attempts_left} intentos.`;
  }
  return { ok: false, mensaje };
}

export async function miembros(id: string): Promise<{ miembros: Miembro[]; error: string | null }> {
  const { data, error } = await supabase.rpc("device_members", { p_device_id: id });
  if (error) return { miembros: [], error: mensajeBase(error.message) };
  return { miembros: (data ?? []) as Miembro[], error: null };
}

export async function compartir(id: string, correo: string, rol: "editor" | "viewer"): Promise<Resultado> {
  if (!correo.trim()) return { ok: false, mensaje: "Escribí el correo de la persona." };
  const { data, error } = await supabase.rpc("share_device", { p_device_id: id, p_email: correo, p_role: rol });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  const r = data as { ok: boolean; error?: string };
  return r.ok ? { ok: true } : { ok: false, mensaje: mensajeBase(r.error) };
}

/** Nombre del equipo; vacío lo borra (se muestra el sitio o qué mide). */
export async function renombrarEquipo(id: string, nombre: string): Promise<Resultado> {
  const { error } = await supabase.rpc("set_device_alias", { p_device_id: id, p_alias: nombre });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export async function quitarAcceso(id: string, usuario: string): Promise<Resultado> {
  const { error } = await supabase.rpc("unshare_device", { p_device_id: id, p_user_id: usuario });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}
