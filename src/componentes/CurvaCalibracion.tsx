// Curva de calibración de un electrodo, como en la app: mV (eje horizontal) contra humedad
// volumétrica. Puntos medidos (llenos los activos, huecos los desactivados, blancos los de la
// calibración anterior), la curva ajustada (llena en el rango calibrado, cortada donde extrapola) y
// los niveles PMP, CC y SAT como líneas.
import { useEffect, useRef, useState } from "react";

import { TEXTO_METODO, TEXTO_NIVEL, type ElectrodoCal } from "@/datos/calibracion";
import { extremos, marcasEje } from "@/datos/grafico";

const IZQ = 44;
const DER = 36;
const ARRIBA = 24;
const ABAJO = 30;
const EJES = "#64748b";
const GRILLA = "#e2e8f0";
const NIVEL = "#059669";

const coma = (v: number, d = 1) => v.toLocaleString("es-AR", { maximumFractionDigits: d });

export function CurvaCalibracion({ e, color, alto = 300 }: { e: ElectrodoCal; color: string; alto?: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!caja.current) return;
    const o = new ResizeObserver(([x]) => setAncho(x.contentRect.width));
    o.observe(caja.current);
    return () => o.disconnect();
  }, []);
  const muestras = e.curva_muestras ?? [];
  const rx = extremos([...e.puntos.map((p) => p.mv), ...muestras.map((m) => m.mv)]);
  const ry = extremos([...e.puntos.map((p) => p.theta_v), ...muestras.map((m) => m.hv), ...e.niveles.map((n) => n.theta_v)]);
  if (!rx || !ry) return <p className="text-[13px] text-texto-2">Sin puntos para dibujar.</p>;
  const mx = marcasEje(rx.min, rx.max, 6);
  const my = marcasEje(Math.max(0, ry.min), ry.max, 5);
  const [x0, x1, y0, y1] = [mx[0], mx[mx.length - 1], my[0], my[my.length - 1]];
  const w = Math.max(1, ancho - IZQ - DER);
  const h = alto - ARRIBA - ABAJO;
  const x = (v: number) => IZQ + ((v - x0) / (x1 - x0 || 1)) * w;
  const y = (v: number) => ARRIBA + (1 - (v - y0) / (y1 - y0 || 1)) * h;

  const segmentos: { d: string; extrapolado: boolean }[] = [];
  for (let i = 1; i < muestras.length; i++) {
    const a = muestras[i - 1];
    const b = muestras[i];
    if (a.hv == null || b.hv == null) continue;
    segmentos.push({ d: `M${x(a.mv).toFixed(1)} ${y(a.hv).toFixed(1)} L${x(b.mv).toFixed(1)} ${y(b.hv).toFixed(1)}`, extrapolado: a.estado === "extrapolado" || b.estado === "extrapolado" });
  }

  return (
    <div ref={caja} style={{ height: alto }} className="w-full">
      {ancho > 0 ? (
        <svg width={ancho} height={alto} role="img" aria-label={`Curva de calibración del electrodo ${e.index}`}>
          {my.map((m) => (
            <g key={`y${m}`}>
              <line x1={IZQ} x2={ancho - DER} y1={y(m)} y2={y(m)} stroke={GRILLA} />
              <text x={IZQ - 6} y={y(m) + 4} fontSize={11} fill={EJES} textAnchor="end">
                {coma(m)}
              </text>
            </g>
          ))}
          {mx.map((m) => (
            <text key={`x${m}`} x={x(m)} y={alto - 14} fontSize={11} fill={EJES} textAnchor="middle">
              {m}
            </text>
          ))}
          <text x={ancho - DER} y={alto - 1} fontSize={10.5} fill={EJES} textAnchor="end">
            mV (más = más seco)
          </text>
          <text x={4} y={11} fontSize={10.5} fill={EJES}>
            % vol
          </text>
          {e.niveles.map((n) =>
            n.theta_v >= y0 && n.theta_v <= y1 ? (
              <g key={n.level}>
                <line x1={IZQ} x2={ancho - DER} y1={y(n.theta_v)} y2={y(n.theta_v)} stroke={NIVEL} strokeDasharray="4 4" />
                <text x={ancho - DER + 4} y={y(n.theta_v) + 4} fontSize={10.5} fill={NIVEL} fontWeight={600}>
                  {TEXTO_NIVEL[n.level].corto}
                </text>
              </g>
            ) : null,
          )}
          {segmentos.map((s, i) => (
            <path key={`s${i}`} d={s.d} stroke={color} strokeWidth={s.extrapolado ? 1.5 : 2.5} strokeDasharray={s.extrapolado ? "5 4" : undefined} fill="none" />
          ))}
          {e.puntos.map((p) => (
            <circle
              key={p.id}
              cx={x(p.mv)}
              cy={y(p.theta_v)}
              r={p.active ? 5 : 4}
              fill={p.active ? (p.method === "legado" ? "#ffffff" : color) : "none"}
              stroke={p.active ? color : "#94a3b8"}
              strokeWidth={p.active ? 2 : 1.5}
            >
              <title>{`${coma(p.mv, 0)} mV · ${coma(p.theta_v)} % vol · ${TEXTO_METODO[p.method]}${p.active ? "" : " (desactivado)"}`}</title>
            </circle>
          ))}
        </svg>
      ) : null}
    </div>
  );
}
