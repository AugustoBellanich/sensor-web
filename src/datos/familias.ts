// Copiado de sensor-app/src/datos/familias.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Qué mide cada equipo, en palabras del usuario. El modelo (B01, C01…) es la línea de
// fabricación; al productor le importa si es de suelo, de clima o un gateway.
export type Familia = "suelo" | "clima" | "gateway" | "lluvia" | "agua" | "otro";

// `color`: ícono y texto sobre claro (tono 600). `noche`: el mismo ícono sobre el fondo noche
// (tono 400, se lee con brillo). Sin fondos de color (D-82).
export const FAMILIAS: Record<Familia, { nombre: string; corto: string; color: string; noche: string }> = {
  suelo: { nombre: "Humedad de suelo", corto: "Suelo", color: "#0284c7", noche: "#38bdf8" },
  clima: { nombre: "Clima", corto: "Clima", color: "#ea580c", noche: "#fb923c" },
  // Lluvia en índigo: el azul es del suelo y no deben confundirse.
  lluvia: { nombre: "Lluvia", corto: "Lluvia", color: "#4f46e5", noche: "#818cf8" },
  agua: { nombre: "Agua (nivel y caudal)", corto: "Agua", color: "#0891b2", noche: "#22d3ee" },
  gateway: { nombre: "Receptor", corto: "Receptor", color: "#7c3aed", noche: "#a78bfa" },
  otro: { nombre: "Otro", corto: "Otro", color: "#475569", noche: "#94a3b8" },
};

export const ORDEN_FAMILIAS: Familia[] = ["suelo", "clima", "lluvia", "agua", "gateway", "otro"];

export function familiaDeModelo(modelo: string): Familia {
  switch (modelo.toUpperCase()) {
    case "B01":
      return "suelo";
    case "C01":
      return "clima";
    case "C02":
      return "lluvia";
    case "A01":
      return "agua";
    case "N01":
      return "gateway";
    default:
      return "otro";
  }
}

/** El alias vale si alguien lo escribió (la base guarda el id cuando no hay nombre). */
export const aliasPropio = (alias: string | null | undefined, id: string): string | null =>
  alias && alias.trim() && alias !== id ? alias.trim() : null;

/** Título de un equipo: su nombre, si no el sitio, si no qué mide. */
export function tituloEquipo(e: { id: string; type: string; alias: string | null; site_name?: string | null }): string {
  return aliasPropio(e.alias, e.id) ?? e.site_name ?? `${FAMILIAS[familiaDeModelo(e.type)].nombre} sin ubicar`;
}

/** Agrupa por campo; los sin campo visible van al final. Con `conProvincia`, el título lleva
 * la provincia adelante y se ordena por provincia (para quien tiene campos en varias). */
export function agruparPorCampo<
  T extends { establishment_id: string | null; establishment_name: string | null; site_name: string | null; province?: string | null },
>(lista: T[], conProvincia = false): { clave: string; titulo: string; provincia: string | null; equipos: T[] }[] {
  const grupos = new Map<string, { clave: string; titulo: string; provincia: string | null; equipos: T[] }>();
  for (const e of lista) {
    const clave = e.establishment_id ?? (e.site_name ? "_ajeno" : "_sin");
    const provincia = e.establishment_id ? (e.province ?? null) : null;
    const nombre = e.establishment_name ?? (e.site_name ? "En campos de otras personas" : "Sin ubicar");
    const titulo = conProvincia && e.establishment_id ? `${provincia ?? "Sin provincia"} › ${nombre}` : nombre;
    if (!grupos.has(clave)) grupos.set(clave, { clave, titulo, provincia, equipos: [] });
    grupos.get(clave)!.equipos.push(e);
  }
  const orden = (c: string) => (c === "_sin" ? 2 : c === "_ajeno" ? 1 : 0);
  return [...grupos.values()].sort((a, b) => orden(a.clave) - orden(b.clave) || a.titulo.localeCompare(b.titulo, "es"));
}
