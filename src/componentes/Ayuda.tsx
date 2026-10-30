// Explicación que no hace falta ver siempre (criterio 10 de docs/estilo.md): un ⓘ al lado del índice
// que abre una ventanita con el texto; se cierra con Escape, con la X o tocando afuera. Los textos
// son los mismos de la app (datos/textos.ts).
import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function Ayuda({ que, texto }: { que: string; texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const [aLaDerecha, setALaDerecha] = useState(false);
  const caja = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierta(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierta(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierta]);
  return (
    <span ref={caja} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => {
          // Se abre hacia el lado donde hay lugar, para no salirse de la pantalla.
          const r = caja.current?.getBoundingClientRect();
          setALaDerecha(!!r && r.left > window.innerWidth / 2);
          setAbierta((v) => !v);
        }}
        aria-label={`Qué es ${que}`}
        aria-expanded={abierta}
        aria-controls={id}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors ${abierta ? "text-acento-oscuro" : "text-[#94a3b8] hover:text-texto-2"}`}
      >
        <Info size={14} strokeWidth={2} aria-hidden />
      </button>
      {abierta ? (
        <span
          id={id}
          role="dialog"
          aria-label={que}
          className={`absolute top-6 z-[1100] flex w-72 max-w-[calc(100vw-32px)] flex-col ${aLaDerecha ? "right-[-8px]" : "left-[-8px]"} gap-1.5 rounded-[10px] border border-linea bg-white p-3.5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.16)]`}
        >
          <span className="flex items-center gap-2">
            <Info size={15} className="shrink-0 text-acento-oscuro" aria-hidden />
            <span className="flex-1 text-[13px] font-semibold text-tinta first-letter:uppercase">{que}</span>
            <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar" className="text-texto-3 hover:text-tinta">
              <X size={15} aria-hidden />
            </button>
          </span>
          <span className="text-[12.5px] leading-relaxed font-normal text-texto-2">{texto}</span>
        </span>
      ) : null}
    </span>
  );
}

/** Etiqueta con su ⓘ al lado. */
export function ConAyuda({ que, texto, children }: { que: string; texto: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Ayuda que={que} texto={texto} />
    </span>
  );
}
