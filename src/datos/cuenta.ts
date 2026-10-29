// Copiado de sensor-app/src/datos/cuenta.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Cuenta de usuario: ingresar, crear cuenta, recuperar contraseña, perfil.
// Las confirmaciones por mail usan un CÓDIGO de 6 dígitos (no un enlace), así no hace
// falta abrir la app desde el mail. Requiere que las plantillas de mail de Supabase
// muestren {{ .Token }} (ver README).
import { codigoCompleto, correoValido, limpiarCodigo, mensajeDeError } from "./errores";
import { supabase } from "./supabase";

export { mensajeDeError };

export type Resultado = { ok: true } | { ok: false; mensaje: string };

/** sinConfirmar: la cuenta existe pero falta el código del mail. */
export async function ingresar(
  correo: string,
  contrasena: string,
): Promise<Resultado | { ok: false; mensaje: string; sinConfirmar: boolean }> {
  if (!correoValido(correo)) return { ok: false, mensaje: "Ingresá un correo válido." };
  if (!contrasena) return { ok: false, mensaje: "Ingresá tu contraseña." };
  const { error } = await supabase.auth.signInWithPassword({
    email: correo.trim().toLowerCase(),
    password: contrasena,
  });
  if (!error) return { ok: true };
  return { ok: false, mensaje: mensajeDeError(error), sinConfirmar: error.code === "email_not_confirmed" };
}

/** Devuelve "confirmar" si la cuenta quedó esperando el código que llega por mail. */
export async function crearCuenta(
  nombre: string,
  correo: string,
  contrasena: string,
): Promise<Resultado & { confirmar?: boolean }> {
  if (!nombre.trim()) return { ok: false, mensaje: "Ingresá tu nombre." };
  if (!correoValido(correo)) return { ok: false, mensaje: "Ingresá un correo válido." };
  if (contrasena.length < 8) {
    return { ok: false, mensaje: "La contraseña tiene que tener al menos 8 caracteres." };
  }
  const { data, error } = await supabase.auth.signUp({
    email: correo.trim().toLowerCase(),
    password: contrasena,
    // La base crea el perfil con este nombre (trigger handle_new_user).
    options: { data: { full_name: nombre.trim() } },
  });
  if (error) return { ok: false, mensaje: mensajeDeError(error) };
  return { ok: true, confirmar: !data.session };
}

export async function confirmarCuenta(correo: string, codigo: string): Promise<Resultado> {
  if (!codigoCompleto(codigo)) return { ok: false, mensaje: "Ingresá el código que te llegó por mail." };
  const { error } = await supabase.auth.verifyOtp({
    email: correo.trim().toLowerCase(),
    token: limpiarCodigo(codigo),
    type: "email",
  });
  return error ? { ok: false, mensaje: mensajeDeError(error) } : { ok: true };
}

/** Vuelve a mandar el código de confirmación de una cuenta nueva. */
export async function reenviarCodigoDeAlta(correo: string): Promise<Resultado> {
  const { error } = await supabase.auth.resend({ type: "signup", email: correo.trim().toLowerCase() });
  return error ? { ok: false, mensaje: mensajeDeError(error) } : { ok: true };
}

export async function pedirCodigoDeRecuperacion(correo: string): Promise<Resultado> {
  if (!correoValido(correo)) return { ok: false, mensaje: "Ingresá un correo válido." };
  const { error } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase());
  return error ? { ok: false, mensaje: mensajeDeError(error) } : { ok: true };
}

export async function cambiarContrasenaConCodigo(
  correo: string,
  codigo: string,
  nueva: string,
): Promise<Resultado> {
  if (!codigoCompleto(codigo)) return { ok: false, mensaje: "Ingresá el código que te llegó por mail." };
  if (nueva.length < 8) {
    return { ok: false, mensaje: "La contraseña tiene que tener al menos 8 caracteres." };
  }
  // Al verificar el código ya queda la sesión iniciada y la app pasa a las pestañas; por eso
  // la contraseña se valida antes. Si updateUser fallara igual, se cambia desde Cuenta.
  const verificado = await supabase.auth.verifyOtp({
    email: correo.trim().toLowerCase(),
    token: limpiarCodigo(codigo),
    type: "recovery",
  });
  if (verificado.error) return { ok: false, mensaje: mensajeDeError(verificado.error) };
  const { error } = await supabase.auth.updateUser({ password: nueva });
  return error ? { ok: false, mensaje: mensajeDeError(error) } : { ok: true };
}

export async function cerrarSesion(): Promise<void> {
  await supabase.auth.signOut();
}

export type Perfil = {
  id: string;
  nombre: string | null;
  rol: "user" | "staff" | "admin";
  estado: string;
};

export async function miPerfil(): Promise<Perfil | null> {
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("id", usuario.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    nombre: data.full_name,
    rol: data.role as Perfil["rol"],
    estado: data.status,
  };
}
