// Copiado de sensor-app/src/datos/errores.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Funciones puras de la cuenta (sin red): mensajes de error en español y validaciones.
// Separadas de cuenta.ts para poder probarlas sin el cliente de Supabase.
import type { AuthError } from "@supabase/supabase-js";

// Mensajes en español para los errores que puede ver el usuario.
export function mensajeDeError(error: AuthError | Error | null | undefined): string {
  if (!error) return "Ocurrió un error inesperado.";
  const codigo = "code" in error ? error.code : undefined;
  switch (codigo) {
    case "invalid_credentials":
      return "El correo o la contraseña no son correctos.";
    case "email_not_confirmed":
      return "Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo.";
    case "weak_password":
      return "La contraseña es muy débil: usá al menos 8 caracteres.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos seguidos. Esperá unos minutos y volvé a probar.";
    case "otp_expired":
      return "El código venció o no es correcto. Pedí uno nuevo.";
    case "same_password":
      return "La contraseña nueva tiene que ser distinta de la anterior.";
  }
  if (/network|fetch/i.test(error.message)) {
    return "No hay conexión con el servidor. Revisá tu internet.";
  }
  return error.message;
}

export const correoValido = (correo: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

/**
 * Código numérico que llega por mail. Supabase lo manda de 6 dígitos por defecto (el largo
 * se configura en el proyecto, hasta 10); se aceptan espacios o guiones al pegarlo.
 */
export const limpiarCodigo = (codigo: string): string => codigo.replace(/\D/g, "").slice(0, 10);

export const codigoCompleto = (codigo: string): boolean => limpiarCodigo(codigo).length >= 6;

// Errores de las funciones de la base (vienen como código en el texto del error).
const MENSAJES: Record<string, string> = {
  device_not_found: "No existe un equipo con ese id. Revisá la etiqueta.",
  device_already_claimed: "Ese equipo ya tiene dueño. Pedile que te lo comparta.",
  device_requires_admin_assignment: "Ese equipo no tiene código: lo asigna un administrador.",
  invalid_claim_code: "El código no es correcto.",
  too_many_attempts: "Demasiados intentos. Esperá 15 minutos y probá de nuevo.",
  user_not_found: "No hay ninguna cuenta con ese correo. La persona tiene que crearse una cuenta primero.",
  already_owner: "Esa persona ya es la dueña del equipo.",
  owner_required: "Solo el dueño del equipo puede hacer eso.",
  admin_required: "Necesitás ser administrador.",
  device_exists: "Ese equipo ya está dado de alta.",
  invalid_device_id: "El id tiene que ser como B01-A1B2C3.",
  type_mismatch: "El id no corresponde al modelo elegido.",
  invalid_role: "Rol no válido.",
  alias_too_long: "El nombre puede tener hasta 60 letras.",
  establishment_permission_required: "No tenés permiso para cambiar este campo.",
  invalid_range: "El final del período tiene que ser posterior al inicio.",
  invalid_bucket: "Intervalo no válido para el gráfico.",
  too_many_points: "Son demasiados puntos para ese período: elegí un período más corto.",
  no_readings_at_time: "No hay lecturas de ese electrodo media hora antes o después de esa hora. Revisá la fecha y la hora.",
  several_devices_at_time: "A esa hora hay lecturas de más de un equipo en el sitio.",
  invalid_mv: "El mV tiene que estar entre 1 y 3300.",
  invalid_mv_source: "El origen del mV no es válido.",
  no_device_at_time: "El sitio no tenía un equipo instalado en esa fecha y hora.",
  device_not_in_site: "El equipo conectado no es el que está instalado en este sitio.",
  invalid_time: "Revisá la fecha y la hora: falta o es del futuro.",
  density_required: "Para usar humedad gravimétrica falta la densidad aparente del suelo de esa profundidad.",
  invalid_theta: "La humedad tiene que estar entre 0 y 100 %.",
  reason_required: "Escribí el motivo.",
  texture_required: "Para estimar por textura cargá arena y arcilla (%) de esa profundidad.",
  invalid_texture: "Arena + limo + arcilla no puede pasar de 100 %.",
  point_not_found: "Ese punto ya no existe.",
  name_required: "Escribí un nombre.",
  invalid_polygon: "El lote no es válido: revisá que tenga al menos 3 puntos y que el borde no se cruce.",
  vigencia_anterior: "La fecha tiene que ser igual o posterior a la de la versión vigente.",
  invalid_location: "Elegí la ubicación del sitio en el mapa.",
  site_plot_establishment_mismatch: "El lote elegido es de otro campo.",
  site_has_history: "Ese sitio tiene datos: no se borra, se archiva.",
  plot_has_history: "Ese lote tiene sitios, actividades o historial: no se borra, se archiva.",
  owner_of_establishment_required: "Solo el dueño del campo puede borrar, archivar o restaurar.",
  already_archived: "Ya estaba archivado.",
  not_archived: "No está archivado.",
  plot_archived: "Su lote está archivado: restaurá primero el lote.",
  site_archived: "Ese sitio está archivado: restauralo antes de ubicar un equipo.",
  site_not_found: "Ese sitio ya no existe.",
  plot_not_found: "Ese lote ya no existe.",
  use_remove_functions: "Para archivar o restaurar usá las opciones de la app.",
  establishment_not_found: "Ese campo ya no existe.",
  establishment_archived: "El campo está archivado: restauralo primero.",
  device_has_history: "Ese equipo tiene datos: no se borra, se retira.",
  device_retired: "Ese equipo está retirado: reactivalo antes de usarlo.",
  already_retired: "Ya estaba retirado.",
  not_retired: "No está retirado.",
  no_pending_request: "No hay un pedido de baja pendiente.",
  cannot_delete_self: "No podés dar de baja tu propia cuenta: pedíselo a otro administrador.",
  target_is_admin: "Es administrador o personal del laboratorio: quitale el rol antes de darlo de baja.",
  device_permission_required: "Necesitás ser dueño o editor del equipo.",
  site_permission_required: "Necesitás ser dueño o editor del campo.",
  permission_required: "No tenés permiso para hacer eso.",
  too_many_rows: "Demasiadas filas en un envío.",
  invalid_rows: "El archivo no tiene filas válidas.",
  unsupported_type: "Ese tipo de equipo todavía no se puede subir desde la SD.",
  method_required: "Elegí el tipo de riego.",
  plot_irrigation_: "Algún dato del sistema de riego está fuera de rango: revisalo.",
  plot_activities_: "Algún dato del cultivo está fuera de rango: revisalo.",
  kind_required: "Elegí si es riego o lluvia.",
  client_id_required: "Falta el identificador del envío: actualizá la app.",
  started_at_required: "Poné la fecha y la hora.",
  started_at_future: "La fecha y hora no pueden ser futuras.",
  started_at_invalid: "Revisá la fecha.",
  water_events_lluvia: "La lluvia se carga en milímetros.",
  water_events_datos: "Faltan datos para la cantidad de agua (duración, lecturas del medidor, volumen o caudal).",
  water_events_: "Algún dato del riego está fuera de rango: revisalo.",
  water_event_voided: "Ese riego está anulado.",
  water_event_not_found: "Ese riego ya no existe.",
  too_many_plots: "Demasiados lotes a la vez.",
  canopy_algun_valor: "Cargá al menos un valor de la copa.",
  canopy_: "Algún dato de la copa está fuera de rango: revisalo.",
  measured_on_future: "La fecha de la medición no puede ser futura.",
  "Could not find the function": "La base todavía no tiene esta función: hay que actualizarla.",
  no_overlapping_assignments: "Ese equipo ya estaba en un sitio en esa fecha. Elegí una fecha posterior a su ubicación actual.",
  valid_assignment_range: "La fecha tiene que ser posterior al inicio de la ubicación actual.",
};

/** Mensaje en español para un código de error de la base (viene en el texto del error). */
export function mensajeBase(texto: string | null | undefined): string {
  if (!texto) return "Ocurrió un error inesperado.";
  const clave = Object.keys(MENSAJES).find((k) => texto.includes(k));
  if (clave) return MENSAJES[clave];
  if (/network|fetch/i.test(texto)) return "No hay conexión con el servidor. Revisá tu internet.";
  return texto;
}
