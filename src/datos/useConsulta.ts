// Carga datos al entrar a la pantalla y cuando cambia lo que se pide; `actualizar` vuelve a
// pedirlos. También recarga al volver a la pestaña del navegador si pasaron más de 5 minutos.
// La función tiene que devolver { error } además de sus datos (igual que en la app).
import { useCallback, useEffect, useRef, useState } from "react";

const RECARGA_MS = 5 * 60 * 1000;

export function useConsulta<T extends { error: string | null }>(cargar: () => Promise<T>) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const ultima = useRef(0);
  const cuando = useRef(0);

  const ejecutar = useCallback(
    async (manual: boolean) => {
      const n = ++ultima.current;
      if (manual) setActualizando(true);
      const r = await cargar();
      if (n !== ultima.current) return; // llegó una respuesta vieja: se descarta
      cuando.current = Date.now();
      setDatos(r);
      setCargando(false);
      setActualizando(false);
    },
    [cargar],
  );

  useEffect(() => {
    void ejecutar(false);
    const alVolver = () => {
      if (document.visibilityState === "visible" && Date.now() - cuando.current > RECARGA_MS) void ejecutar(false);
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [ejecutar]);

  return { datos, error: datos?.error ?? null, cargando, actualizando, actualizar: () => ejecutar(true) };
}
