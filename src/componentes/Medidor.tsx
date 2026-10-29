// Medidor por zonas, igual que la app (sensor-app/src/componentes/Medidor): pista gris con la
// zona del valor en color pleno, marca en el valor, cortes centrados y el estado en una frase.
import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";

import { cortes, finesVisuales, ubicar, type Escala, type Nivel } from "@/datos/medidor";

const ICONO: Record<Nivel, LucideIcon> = { bien: CircleCheck, aviso: TriangleAlert, grave: OctagonAlert, info: Info };

export const COLOR_NIVEL: Record<Nivel, { activa: string; fuerte: string }> = {
  bien: { activa: "#059669", fuerte: "#047857" },
  aviso: { activa: "#f59e0b", fuerte: "#b45309" },
  grave: { activa: "#dc2626", fuerte: "#b91c1c" },
  info: { activa: "#0284c7", fuerte: "#0369a1" },
};

type Props = {
  escala: Escala;
  valor: number | null;
  nombre: string;
  /** La línea de estado entera, ya armada ("Agua útil al 95 %"). */
  oracion?: string | null;
  soloBarra?: boolean;
};

export function Medidor({ escala, valor, nombre, oracion, soloBarra }: Props) {
  if (valor === null || !Number.isFinite(valor)) return null;
  const u = ubicar(valor, escala);
  const fines = finesVisuales(escala);
  const Icono = ICONO[u.zona.nivel];
  const color = COLOR_NIVEL[u.zona.nivel].fuerte;
  const linea = oracion ?? (u.frase ? `${u.zona.nombre}: ${u.frase}` : u.zona.nombre);
  return (
    <div className="flex flex-col gap-1" role="img" aria-label={`${nombre}: ${linea}`}>
      <div className="relative flex h-[18px] items-center">
        <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
          {escala.zonas.map((z, i) => (
            <span
              key={i}
              style={{ flex: Math.max(0.0001, fines[i] - (i === 0 ? 0 : fines[i - 1])), background: i === u.indice ? COLOR_NIVEL[z.nivel].activa : "#e2e8f0" }}
            />
          ))}
        </div>
        <span className="absolute h-[18px] w-1 -translate-x-1/2 rounded-sm bg-tinta shadow-[0_0_0_1.5px_#fff]" style={{ left: `${u.posicion * 100}%` }} />
      </div>
      <div className="relative h-3.5 text-[10px] font-semibold tracking-wide text-texto-3" aria-hidden>
        {cortes(escala).map((c) => (
          <span
            key={c.valor}
            className={`absolute ${c.posicion < 0.06 ? "" : c.posicion > 0.94 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: `${c.posicion * 100}%` }}
          >
            {c.texto}
          </span>
        ))}
      </div>
      {soloBarra ? null : (
        <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color }}>
          <Icono size={15} aria-hidden />
          {linea}
        </p>
      )}
    </div>
  );
}
