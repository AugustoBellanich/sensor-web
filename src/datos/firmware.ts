// Versiones de firmware para actualizar por Bluetooth (D-89, D-92; sensor-db, migración
// 20261102140000). El admin sube el .bin que exporta Arduino IDE al bucket privado "firmware" y lo
// registra; la app lo baja y lo manda al equipo. De cada modelo y canal quedan los archivos de las
// 2 últimas versiones: la base dice cuáles sobran y acá se borran del bucket.
// La revisión del archivo es la misma que hace la app (sensor-app src/ble/ota.ts, revisarBinario).
import type { Resultado } from "./cuenta";
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type Canal = "banco" | "estable";

export type VersionFirmware = {
  id: string;
  model: string;
  version: string;
  channel: Canal;
  sha256: string;
  size_bytes: number;
  notes: string | null;
  storage_path: string;
  file_deleted_at: string | null;
  created_at: string;
};

export type Binario = { valido: boolean; problema: string | null; modelo: string | null; version: string | null };

/**
 * Espacio para el programa de cada modelo (una de las dos particiones de actualización).
 * B01 y C01: esquema "Default 4MB with spiffs" (0x140000). N01: `N01/partitions.csv` (0x1A0000,
 * D-94); Arduino IDE informa otro máximo porque toma el del menú, no el del archivo.
 */
export const MAXIMO_POR_MODELO: Record<string, number> = { B01: 1310720, C01: 1310720, N01: 1703936 };
export const MAXIMO_BYTES = 1310720;

const kb = (n: number) => `${Math.round(n / 1024).toLocaleString("es-AR")} KB`;

/** Que sea una imagen del ESP32 (0xE9 al principio), de qué modelo y versión es, y que entre. */
export function revisarBinario(bytes: Uint8Array): Binario {
  const vacio = { modelo: null, version: null };
  if (bytes.length < 1024 || bytes[0] !== 0xe9)
    return { valido: false, problema: "No es un firmware del ESP32: elegí el .bin que exporta Arduino IDE.", ...vacio };
  const texto = new TextDecoder("latin1").decode(bytes);
  const m = /(B01|C01|N01|C02|A01)-FW-\d+\.\d+\.\d+(?:-[A-Za-z0-9]+)?/.exec(texto);
  if (!m) return { valido: false, problema: "No se encontró la versión dentro del archivo.", ...vacio };
  const limite = MAXIMO_POR_MODELO[m[1]] ?? MAXIMO_BYTES;
  if (bytes.length > limite)
    return {
      valido: false,
      problema: `El archivo (${kb(bytes.length)}) es más grande que el espacio del ${m[1]} (${kb(limite)}).`,
      modelo: m[1],
      version: m[0],
    };
  return { valido: true, problema: null, modelo: m[1], version: m[0] };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function listarVersiones(): Promise<{ versiones: VersionFirmware[]; error: string | null }> {
  const { data, error } = await supabase
    .from("firmware_releases")
    .select("*")
    .order("model")
    .order("created_at", { ascending: false });
  return { versiones: (data ?? []) as VersionFirmware[], error: error ? mensajeBase(error.message) : null };
}

/** Borra del bucket los archivos que sobran. Devuelve cuántos no se pudieron borrar. */
async function borrarSobrantes(rutas: string[]): Promise<number> {
  if (!rutas.length) return 0;
  const { error } = await supabase.storage.from("firmware").remove(rutas);
  return error ? rutas.length : 0;
}

/** Sube el archivo y lo registra. Si el registro falla, saca el archivo recién subido. */
export async function subirVersion(
  bytes: Uint8Array,
  b: Binario,
  canal: Canal,
  notas: string,
  reemplazar: boolean,
): Promise<Resultado & { borradas?: number }> {
  if (!b.valido || !b.modelo || !b.version) return { ok: false, mensaje: b.problema ?? "Archivo inválido." };
  const ruta = `${b.modelo}/${b.version}.bin`;
  const sha = await sha256Hex(bytes);
  const subida = await supabase.storage
    .from("firmware")
    .upload(ruta, new Blob([bytes as BlobPart], { type: "application/octet-stream" }), {
      upsert: reemplazar,
      contentType: "application/octet-stream",
    });
  if (subida.error)
    return {
      ok: false,
      mensaje: /exists|Duplicate/i.test(subida.error.message)
        ? "Esa versión ya está subida. Para reemplazarla (solo de banco), marcá Reemplazar."
        : `No se pudo subir el archivo: ${subida.error.message}`,
    };
  const { data, error } = await supabase.rpc("register_firmware_release", {
    p_model: b.modelo,
    p_version: b.version,
    p_channel: canal,
    p_sha256: sha,
    p_size: bytes.length,
    p_notes: notas.trim() || null,
    p_replace: reemplazar,
  });
  if (error) {
    if (!reemplazar) await supabase.storage.from("firmware").remove([ruta]);
    return { ok: false, mensaje: mensajeBase(error.message) };
  }
  const borrar = ((data as { borrar?: string[] })?.borrar ?? []) as string[];
  const fallidas = await borrarSobrantes(borrar);
  return fallidas
    ? { ok: false, mensaje: `Versión subida, pero no se pudieron borrar ${fallidas} archivos viejos del bucket.` }
    : { ok: true, borradas: borrar.length };
}

/** Pasa una versión de banco a estable (la ven y la usan todos). */
export async function publicarEstable(id: string): Promise<Resultado> {
  const { data, error } = await supabase.rpc("set_firmware_channel", { p_id: id, p_channel: "estable" });
  if (error) return { ok: false, mensaje: mensajeBase(error.message) };
  const fallidas = await borrarSobrantes(((data as { borrar?: string[] })?.borrar ?? []) as string[]);
  return fallidas
    ? { ok: false, mensaje: `Publicada, pero no se pudieron borrar ${fallidas} archivos viejos del bucket.` }
    : { ok: true };
}
