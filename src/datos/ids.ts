// Copiado de sensor-app/src/datos/ids.ts. Identificadores generados en el cliente (envíos que la
// base no duplica si llegan dos veces).

/** UUID v4: el del sistema si está; si no, uno armado con Math.random. */
export function nuevoId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (x) => {
    const r = (Math.random() * 16) | 0;
    return (x === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
