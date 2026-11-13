// Copiado de sensor-app/src/datos/personas.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Elegir personas sin recordar correos, invitaciones a correos sin cuenta y pedidos de alta
// (sensor-db, migración 20261113120000_personas_y_altas). La base vuelve a controlar cada permiso.
import type { Resultado } from "./cuenta";
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type Persona = { id: string; nombre: string | null; correo: string; detalle?: string };

/** Para un usuario común: solo las personas con las que ya comparte algo (la base no deja buscar
 * fuera de ese círculo). Para admin y staff: además, todas las cuentas que coinciden con el texto. */
export async function buscarPersonas(texto: string, esAdmin: boolean): Promise<{ personas: Persona[]; error: string | null }> {
  const t = texto.trim();
  const frecuentes = supabase.rpc("my_contacts", { p_search: t || null });
  const todas = esAdmin && t.length >= 2 ? supabase.rpc("admin_list_users", { p_search: t }) : null;
  const [f, a] = await Promise.all([frecuentes, todas]);
  if (f.error) return { personas: [], error: mensajeBase(f.error.message) };
  const lista: Persona[] = ((f.data ?? []) as { user_id: string; full_name: string | null; email: string; shared_count: number }[]).map(
    (x) => ({ id: x.user_id, nombre: x.full_name, correo: x.email, detalle: x.shared_count === 1 ? "1 en común" : `${x.shared_count} en común` }),
  );
  if (a && !a.error) {
    const vistos = new Set(lista.map((x) => x.id));
    for (const u of (a.data ?? []) as { id: string; full_name: string | null; email: string; status: string }[]) {
      if (!vistos.has(u.id) && u.status !== "disabled") lista.push({ id: u.id, nombre: u.full_name, correo: u.email });
    }
  }
  return { personas: lista.slice(0, 20), error: null };
}

export type TipoObjeto = "equipo" | "campo";
const KIND: Record<TipoObjeto, string> = { equipo: "device", campo: "establishment" };

/** Resultado de compartir: sinCuenta indica que se puede dejar una invitación. */
export type ResultadoCompartir = Resultado | { ok: false; mensaje: string; sinCuenta: true };

export function resultadoCompartir(error: { message: string } | null, data: unknown): ResultadoCompartir {
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  const r = data as { ok: boolean; error?: string };
  if (r.ok) return { ok: true };
  if (r.error === "user_not_found") {
    return { ok: false, sinCuenta: true, mensaje: "No hay ninguna cuenta con ese correo. Se puede dejar una invitación: se aplica cuando la persona cree su cuenta." };
  }
  return { ok: false, mensaje: mensajeBase(r.error) };
}

export type Invitacion = { id: number; email: string; role: "editor" | "viewer"; created_at: string; expires_at: string };

export async function invitar(tipo: TipoObjeto, id: string, correo: string, rol: "editor" | "viewer"): Promise<Resultado> {
  const { data, error } = await supabase.rpc("invite_access", { p_kind: KIND[tipo], p_object_id: id, p_email: correo.trim(), p_role: rol });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  const r = data as { ok: boolean; error?: string };
  return r.ok ? { ok: true } : { ok: false, mensaje: mensajeBase(r.error) };
}

export async function invitaciones(tipo: TipoObjeto, id: string): Promise<{ invitaciones: Invitacion[]; error: string | null }> {
  const { data, error } = await supabase.rpc("pending_invitations", { p_kind: KIND[tipo], p_object_id: id });
  if (error) return { invitaciones: [], error: mensajeBase(error.message) };
  return { invitaciones: (data ?? []) as Invitacion[], error: null };
}

export async function cancelarInvitacion(id: number): Promise<Resultado> {
  const { error } = await supabase.rpc("cancel_invitation", { p_id: id });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

// ---------------------------------------------------------------- pedidos de alta

export type EstadoRegistro = { state: "sin_alta" | "sin_dueno" | "con_acceso" | "otro_dueno"; my_request_pending: boolean };

/** Qué pasa con un equipo en la base (al conectarse por Bluetooth). */
export async function estadoRegistro(id: string): Promise<{ estado: EstadoRegistro | null; error: string | null }> {
  const { data, error } = await supabase.rpc("device_registration_state", { p_device_id: id });
  if (error) return { estado: null, error: mensajeBase(error.message) };
  return { estado: data as EstadoRegistro, error: null };
}

export async function pedirAlta(id: string, nota: string): Promise<Resultado> {
  const { error } = await supabase.rpc("request_device_registration", { p_device_id: id, p_note: nota.trim() || null });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export type PedidoAlta = { id: number; device_id: string; user_id: string; full_name: string | null; email: string; note: string | null; created_at: string };

export async function pedidosAlta(): Promise<{ pedidos: PedidoAlta[]; error: string | null }> {
  const { data, error } = await supabase.rpc("admin_device_registrations");
  if (error) return { pedidos: [], error: mensajeBase(error.message) };
  return { pedidos: (data ?? []) as PedidoAlta[], error: null };
}

export async function aprobarPedido(id: number, alias: string): Promise<Resultado> {
  const { error } = await supabase.rpc("admin_approve_device_registration", { p_request_id: id, p_alias: alias.trim() || null });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export async function rechazarPedido(id: number, motivo: string): Promise<Resultado> {
  const { error } = await supabase.rpc("admin_reject_device_registration", { p_request_id: id, p_reason: motivo.trim() || null });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}
