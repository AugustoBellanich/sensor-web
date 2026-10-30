// Copiado de sensor-app/src/datos/bajas.ts (D-83; cambiar en los dos). Bajas de cuenta (D-46): la persona pide la baja; un admin la ejecuta con la Edge Function
// borrar-cuenta (sensor-db), que borra el acceso y deja lo cargado sin autor.
import { FunctionsHttpError } from "@supabase/supabase-js";

import type { Resultado } from "./cuenta";
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type PedidoBaja = { id: number; requested_at: string; reason: string | null; status: "pendiente" };

export type Titularidades = {
  establishments: { id: string; name: string }[];
  devices: { id: string; type: string }[];
};

export type PedidoParaAdmin = {
  request_id: number;
  user_id: string;
  full_name: string | null;
  email: string;
  requested_at: string;
  reason: string | null;
  sole_ownerships: Titularidades;
};

export async function miPedidoDeBaja(): Promise<{ pedido: PedidoBaja | null; error: string | null }> {
  const { data, error } = await supabase.rpc("my_account_deletion");
  if (error) return { pedido: null, error: mensajeBase(error.message) };
  return { pedido: (data ?? null) as PedidoBaja | null, error: null };
}

export async function pedirBaja(motivo: string): Promise<Resultado> {
  const { error } = await supabase.rpc("request_account_deletion", { p_reason: motivo.trim() || null });
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export async function cancelarBaja(): Promise<Resultado> {
  const { error } = await supabase.rpc("cancel_account_deletion");
  return error ? { ok: false, mensaje: mensajeBase(error.message) } : { ok: true };
}

export async function pedidosDeBaja(): Promise<{ pedidos: PedidoParaAdmin[]; error: string | null }> {
  const { data, error } = await supabase.rpc("admin_deletion_requests");
  if (error) return { pedidos: [], error: mensajeBase(error.message) };
  return { pedidos: (data ?? []) as PedidoParaAdmin[], error: null };
}

/** Lo que falta pasar a otra persona antes de la baja, en una línea. null si no falta nada. */
export function textoTitularidades(t: Titularidades | null | undefined): string | null {
  if (!t) return null;
  const partes = [
    ...t.establishments.map((e) => `campo «${e.name}»`),
    ...t.devices.map((d) => `equipo ${d.id}`),
  ];
  return partes.length ? `Es la única dueña de: ${partes.join(", ")}. Pasalos a otra persona antes de la baja.` : null;
}

const ERRORES_BAJA: Record<string, string> = {
  admin_required: "Solo un administrador puede dar de baja cuentas.",
  cannot_delete_self: "No podés dar de baja tu propia cuenta: pedíselo a otro administrador.",
  target_is_admin: "Es administrador o personal del laboratorio: quitale el rol antes de darlo de baja.",
  user_not_found: "Esa cuenta ya no existe.",
  no_session: "La sesión venció. Volvé a ingresar.",
};

/** Ejecuta la baja (solo admin). Si la persona es la única dueña de algo, lo informa. */
export async function ejecutarBaja(usuario: string): Promise<Resultado> {
  const { error } = await supabase.functions.invoke("borrar-cuenta", { body: { user_id: usuario } });
  if (!error) return { ok: true };
  if (error instanceof FunctionsHttpError) {
    const cuerpo = (await error.context.json().catch(() => null)) as {
      error?: string;
      sole_ownerships?: Titularidades;
    } | null;
    if (cuerpo?.error === "sole_owner") {
      return { ok: false, mensaje: textoTitularidades(cuerpo.sole_ownerships) ?? "Es la única dueña de campos o equipos." };
    }
    if (cuerpo?.error && ERRORES_BAJA[cuerpo.error]) return { ok: false, mensaje: ERRORES_BAJA[cuerpo.error] };
  }
  return { ok: false, mensaje: mensajeBase(error.message) };
}
