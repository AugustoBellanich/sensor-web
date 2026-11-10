// Mientras la base procesa una acción (guardar, desactivar, borrar): un velo sobre la página con el
// indicador y qué se está haciendo. Bloquea clics y teclado para que no se edite ni se repita la
// acción a mitad de camino (como en la app). Se usa con useAccion.
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";

export function Procesando({ texto }: { texto: string | null }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (texto) caja.current?.focus();
  }, [texto]);
  if (!texto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.28)] p-6"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={texto}
      onKeyDown={(ev) => ev.preventDefault()}
    >
      <div
        ref={caja}
        tabIndex={-1}
        className="flex max-w-xs items-center gap-3 rounded-xl border border-linea bg-white px-5 py-4 text-[13px] text-tinta outline-none"
      >
        <LoaderCircle size={18} className="shrink-0 animate-spin text-acento-oscuro" aria-hidden />
        {texto}
      </div>
    </div>
  );
}
