// Copiado de sensor-app/src/datos/administracion.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Administración (admin y staff). La base vuelve a controlar cada permiso.
import type { Resultado } from "./cuenta";
import { mensajeBase } from "./errores";
import { idValido, modeloDeId, normalizarId } from "./estado";
import { supabase } from "./supabase";

export type RolUsuario = "user" | "staff" | "admin";
export type EstadoUsuario = "active" | "pending" | "suspended" | "disabled";

export type Usuario = {
  id: string;
  email: string;
  full_name: string | null;
  role: RolUsuario;
  status: EstadoUsuario;
  created_at: string | null;
  last_sign_in_at: string | null;
  devices_owned: number;
};

export const NOMBRE_ROL: Record<RolUsuario, string> = {
  user: "Usuario",
  staff: "Staff",
  admin: "Administrador",
};

export const NOMBRE_ESTADO: Record<EstadoUsuario, string> = {
  active: "Activo",
  pending: "Pendiente",
  suspended: "Suspendido",
  disabled: "Deshabilitado",
};

export async function listarUsuarios(busqueda?: string): Promise<{ usuarios: Usuario[]; error: string | null }> {
  const { data, error } = await supabase.rpc("admin_list_users", { p_search: busqueda?.trim() || null });
  if (error) return { usuarios: [], error: mensajeBase(error.message) };
  return { usuarios: (data ?? []) as Usuario[], error: null };
}

export async function cambiarRol(usuario: string, rol: RolUsuario): Promise<Resultado> {
  const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: usuario, p_role: rol });
  return error ? { ok: false, mensaje: mensajeDeAdmin(error.message) } : { ok: true };
}

export async function cambiarEstado(usuario: string, estado: EstadoUsuario): Promise<Resultado> {
  const { error } = await supabase.rpc("admin_set_user_status", { p_user_id: usuario, p_status: estado });
  return error ? { ok: false, mensaje: mensajeDeAdmin(error.message) } : { ok: true };
}

function mensajeDeAdmin(texto: string): string {
  if (texto.includes("cannot_change_own")) return "No podés cambiar tu propio rol ni estado.";
  return mensajeBase(texto);
}

export const MODELOS = ["B01", "C01", "N01", "C02", "A01"] as const;
export type ModeloAlta = (typeof MODELOS)[number];

/** Da de alta un equipo y devuelve su código de vinculación (se muestra una sola vez). */
export async function altaEquipo(
  id: string,
  alias: string,
): Promise<{ ok: true; id: string; codigo: string } | { ok: false; mensaje: string }> {
  const limpio = normalizarId(id);
  if (!idValido(limpio)) return { ok: false, mensaje: "El id tiene que ser como B01-A1B2C3." };
  const { data, error } = await supabase.rpc("provision_device_new_code", {
    p_device_id: limpio,
    p_type: modeloDeId(limpio),
    p_alias: alias.trim() || null,
  });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  return { ok: true, id: limpio, codigo: data as string };
}

export async function nuevoCodigo(id: string): Promise<{ ok: true; codigo: string } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("new_claim_code", { p_device_id: id });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  return { ok: true, codigo: data as string };
}
