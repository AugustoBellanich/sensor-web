// Copiado de sensor-app/src/componentes/useAccion.ts. Ejecuta una acción contra la base una sola vez
// aunque se haga clic varias veces: el bloqueo es inmediato (una referencia, no el estado, que tarda
// un render) y `procesando` tiene el texto para <Procesando />, que tapa la página mientras dura.
import { useCallback, useRef, useState } from "react";

export function useAccion() {
  const enCurso = useRef(false);
  const [procesando, setProcesando] = useState<string | null>(null);

  const ejecutar = useCallback(async <T,>(texto: string, accion: () => Promise<T>): Promise<T | undefined> => {
    if (enCurso.current) return undefined;
    enCurso.current = true;
    setProcesando(texto);
    try {
      return await accion();
    } finally {
      enCurso.current = false;
      setProcesando(null);
    }
  }, []);

  return { ejecutar, procesando, ocupado: procesando !== null };
}
