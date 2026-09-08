// ============================================================
// FORMATO DE FECHA/HORA
// ------------------------------------------------------------

const LOCALE = "es-AR";

// Fecha + hora completa, ej: "08/09/2026, 14:35"
export function formatDateTime(
  iso: string | null | undefined
): string {
  if (!iso) return "-";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Fecha + hora + segundos, ej: "08/09/2026, 14:35:07"
export function formatDateTimeWithSeconds(
  iso: string | null | undefined
): string {
  if (!iso) return "-";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Solo hora:minuto, ej: "14:35" (para ejes de gráficos)
export function formatTimeOnly(
  iso: string | null | undefined
): string {
  if (!iso) return "-";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Fecha corta tipo "YYYY-MM-DD HH:MM" (para inputs / vistas compactas)
export function formatShortDateTime(
  iso: string | null | undefined
): string {
  if (!iso) return "";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============================================================
// FORMATO DE DURACIONES
// ------------------------------------------------------------
// Convierte segundos/milisegundos crudos (que pueden llegar a
// cientos o miles) a algo legible: segundos -> minutos -> horas,
// escalando automáticamente según la magnitud.
// ============================================================

// Recibe segundos totales (puede ser decimal) y devuelve algo
// como "42s", "3m 15s", "2h 05m".
export function formatDurationSeconds(
  totalSeconds: number | null | undefined
): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) {
    return "-";
  }

  const seconds = Math.round(totalSeconds);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const totalMinutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;

  if (totalMinutes < 60) {
    return remSeconds > 0
      ? `${totalMinutes}m ${remSeconds}s`
      : `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;

  return remMinutes > 0
    ? `${hours}h ${remMinutes}m`
    : `${hours}h`;
}

// Recibe milisegundos y devuelve "320 ms" si es corto, o
// reutiliza formatDurationSeconds si ya pasó el minuto/hora.
export function formatDurationMs(
  ms: number | null | undefined
): string {
  if (ms == null || !Number.isFinite(ms)) {
    return "-";
  }

  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return formatDurationSeconds(ms / 1000);
}