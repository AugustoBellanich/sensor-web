// Calendario para elegir un día o un rango de días con dos toques (período de los gráficos), igual
// que en la app (sensor-app/src/componentes/Calendario.tsx, CalendarioRango). Lógica en datos/calendario.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { DIAS_SEMANA, MESES, lugarEnRango, mesDe, moverMes, semanasDelMes, tocarDia, type Seleccion } from "@/datos/calendario";
import { textoDias, type Dias } from "@/datos/grafico";
import { fechaArgHoy } from "@/datos/riego";

type Props = {
  /** Rango marcado al abrir, o null. */
  valor: Dias | null;
  alAplicar: (dias: Dias) => void;
  alCerrar: () => void;
  /** Primer y último día que se pueden elegir (AAAA-MM-DD). */
  minimo?: string;
  maximo?: string;
};

export function CalendarioRango({ valor, alAplicar, alCerrar, minimo, maximo }: Props) {
  const hoy = fechaArgHoy();
  const [sel, setSel] = useState<Seleccion>({ inicio: valor?.desde ?? null, fin: valor?.hasta ?? null });
  const [mes, setMes] = useState(mesDe(valor?.hasta ?? maximo ?? hoy));
  const elegido: Dias | null = sel.inicio ? { desde: sel.inicio, hasta: sel.fin ?? sel.inicio } : null;

  return (
    <div
      role="dialog"
      aria-label="Elegir fechas"
      className="w-[292px] rounded-xl border border-linea bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
      onKeyDown={(e) => e.key === "Escape" && alCerrar()}
    >
      <div className="mb-1.5 flex items-center">
        <Flecha izquierda onClick={() => setMes((m) => moverMes(m, -1))} />
        <span className="flex-1 text-center text-[13px] font-semibold text-tinta">
          {MESES[mes.mes - 1]} {mes.anio}
        </span>
        <Flecha onClick={() => setMes((m) => moverMes(m, 1))} />
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-texto-3">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {semanasDelMes(mes)
          .flat()
          .map((iso, i) => {
            if (!iso) return <span key={i} />;
            const lugar = lugarEnRango(sel, iso);
            const fuera = (minimo !== undefined && iso < minimo) || (maximo !== undefined && iso > maximo);
            return (
              <span key={i} className={lugar === "medio" ? "bg-superficie" : ""}>
                <button
                  type="button"
                  disabled={fuera}
                  aria-pressed={lugar !== null}
                  aria-label={`${Number(iso.slice(8))} de ${MESES[mes.mes - 1]}`}
                  onClick={() => setSel((s) => tocarDia(s, iso))}
                  className={`h-8 w-full rounded-md text-[12.5px] transition-colors ${
                    lugar === "borde"
                      ? "bg-tinta font-semibold text-white"
                      : fuera
                        ? "cursor-default text-texto-3/50"
                        : "text-texto hover:bg-superficie"
                  } ${iso === hoy && lugar !== "borde" ? "ring-1 ring-acento-oscuro ring-inset" : ""}`}
                >
                  {Number(iso.slice(8))}
                </button>
              </span>
            );
          })}
      </div>
      <p className="mt-2 text-center text-xs text-texto-3">{elegido ? textoDias(elegido) : "Elegir el primer y el último día."}</p>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={alCerrar} className="h-7 rounded-md px-2.5 text-[12.5px] text-texto-2 hover:text-tinta">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!elegido}
          onClick={() => elegido && alAplicar(elegido)}
          className="h-7 rounded-md bg-tinta px-3 text-[12.5px] font-semibold text-white disabled:opacity-40"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function Flecha({ izquierda, onClick }: { izquierda?: boolean; onClick: () => void }) {
  const Icono = izquierda ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={izquierda ? "Mes anterior" : "Mes siguiente"}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md text-texto-2 hover:bg-superficie hover:text-tinta"
    >
      <Icono size={16} />
    </button>
  );
}
