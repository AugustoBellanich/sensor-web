// Período de los gráficos: botones fijos (24 h, 7 días…) y "Fechas", que abre el calendario para
// elegir un día o un rango con dos toques. Como en la app (SelectorPeriodo); lo usan sitio y receptor.
import { CalendarRange } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CalendarioRango } from "@/componentes/Calendario";
import { Segmento } from "@/componentes/ui";
import { textoDias, type Dias, type Periodo } from "@/datos/grafico";
import { fechaArgHoy } from "@/datos/riego";

type Props = {
  opciones: readonly { valor: Exclude<Periodo, "fechas">; texto: string }[];
  periodo: Periodo;
  dias: Dias | null;
  alCambiar: (periodo: Periodo, dias: Dias | null) => void;
  /** Primer día con datos (AAAA-MM-DD): antes no se puede elegir. */
  minimo?: string;
};

export function SelectorPeriodo({ opciones, periodo, dias, alCambiar, minimo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const conFechas = periodo === "fechas" && dias !== null;

  // Un clic fuera del calendario lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  return (
    <div ref={caja} className="relative">
      <Segmento
        etiqueta="Período"
        opciones={[
          ...opciones,
          {
            valor: "fechas" as const,
            texto: (
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange size={13} aria-hidden />
                {conFechas ? textoDias(dias) : "Fechas"}
              </span>
            ),
          },
        ]}
        valor={conFechas ? "fechas" : periodo}
        alCambiar={(v) => (v === "fechas" ? setAbierto((a) => !a) : alCambiar(v, dias))}
      />
      {abierto ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30">
          <CalendarioRango
            valor={dias}
            minimo={minimo}
            maximo={fechaArgHoy()}
            alCerrar={() => setAbierto(false)}
            alAplicar={(d) => {
              setAbierto(false);
              alCambiar("fechas", d);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
