// Gráfico de líneas en el tiempo, igual que la app (sensor-app/src/componentes/Grafico) pero en
// SVG del navegador: varias series con su nombre, banda de mínimo–máximo, franja de referencia
// (agua útil entre PMP y CC), huecos donde no hubo datos y barras de riego y lluvia. Al pasar el
// mouse (o tocar) se ven los valores de ese momento; si no, los últimos.
import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { banda as trazoBanda, etiquetaCorta, extremos, marcasEje, marcasTiempo, masCercano, soloHora, trazo } from "@/datos/grafico";

export type Referencia = { desde: number; hasta: number; color: string; lineas: { valor: number; etiqueta: string }[] };
export type Serie = { nombre: string; color: string; valores: (number | null)[]; referencia?: Referencia | null };

type Props = {
  titulo: string;
  unidad: string;
  decimales?: number;
  tiempos: number[];
  desde: number;
  hasta: number;
  intervaloS: number;
  series: Serie[];
  banda?: { nombre: string; color: string; min: (number | null)[]; max: (number | null)[] };
  alto?: number;
  nota?: string;
  /** Control a la derecha del título (por ejemplo, la unidad). */
  accion?: ReactNode;
  /** Tocar el nombre de una serie la deja sola (y muestra su referencia). */
  aislable?: boolean;
  agua?: { t: number; mm: number | null; tipo: "riego" | "lluvia" }[];
};

const COLOR = { grilla: "#e2e8f0", ejes: "#64748b", riego: "#0891b2", lluvia: "#6366f1", guia: "#64748b" };
const ALTO_AGUA = 0.3;
const IZQ = 44;
const DER = 12;
const ARRIBA = 10;
const ABAJO = 24;

export function Grafico({ titulo, unidad, decimales = 0, tiempos, desde, hasta, intervaloS, series: todas, banda, alto = 240, nota, aislable, agua, accion }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [elegido, setElegido] = useState<number | null>(null);
  const [aislada, setAislada] = useState<string | null>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const series = useMemo(() => {
    const una = aislada ? todas.filter((s) => s.nombre === aislada) : [];
    return una.length ? una : todas;
  }, [todas, aislada]);
  // Con una sola serie (sola o elegida) se dibuja su referencia.
  const referencia = series.length === 1 ? (series[0].referencia ?? null) : null;
  const huecoMs = intervaloS * 1000 * 2.5;

  const rango = useMemo(() => {
    const r = extremos(...series.map((s) => s.valores), ...(banda ? [banda.min, banda.max] : []));
    if (!r || !referencia) return r;
    const margen = (r.max - r.min) * 1.5 + 1;
    const cerca = referencia.lineas.map((l) => l.valor).filter((v) => v >= r.min - margen && v <= r.max + margen);
    return { min: Math.min(r.min, ...cerca), max: Math.max(r.max, ...cerca) };
  }, [series, banda, referencia]);
  const marcasY = useMemo(() => (rango ? marcasEje(rango.min, rango.max) : []), [rango]);
  const yMin = marcasY[0] ?? 0;
  const yMax = marcasY[marcasY.length - 1] ?? 1;
  const anchoUtil = Math.max(1, ancho - IZQ - DER);
  const altoUtil = alto - ARRIBA - ABAJO;
  const x = (t: number) => IZQ + ((t - desde) / (hasta - desde || 1)) * anchoUtil;
  const y = (v: number) => ARRIBA + (1 - (v - yMin) / (yMax - yMin || 1)) * altoUtil;
  const marcasX = marcasTiempo(desde, hasta, ancho > 700 ? 7 : ancho > 420 ? 5 : 4);
  const conHora = hasta - desde <= 3 * 86400e3;

  const validos = series.reduce((n, s) => n + s.valores.filter((v) => v != null).length, 0);
  const puntosSueltos = validos > 0 && validos <= 40 * series.length;

  const indice = useMemo(() => {
    if (elegido != null) return elegido;
    for (let i = tiempos.length - 1; i >= 0; i--) if (series.some((s) => s.valores[i] != null)) return i;
    return -1;
  }, [elegido, tiempos, series]);

  function mover(e: PointerEvent<SVGSVGElement>) {
    if (!tiempos.length || ancho === 0) return;
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const t = desde + ((px - IZQ) / anchoUtil) * (hasta - desde);
    setElegido(masCercano(tiempos, t));
  }

  const aguaVisible = (agua ?? []).filter((a) => a.t >= desde && a.t <= hasta);
  const maxMm = Math.max(10, ...aguaVisible.map((a) => a.mm ?? 0));
  const suma = (tipo: "riego" | "lluvia") => {
    const de = aguaVisible.filter((a) => a.tipo === tipo);
    return de.length ? { n: de.length, mm: de.reduce((s, a) => s + (a.mm ?? 0), 0) } : null;
  };
  const riegos = suma("riego");
  const lluvias = suma("lluvia");
  const formato = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? "—" : v.toFixed(decimales).replace(".", ","));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-tinta">{titulo}</h3>
        <span className="flex items-center gap-3"><span className="text-xs text-texto-3">{indice >= 0 ? `${elegido != null ? "" : "Último: "}${etiquetaCorta(tiempos[indice], true)}` : ""}</span>{accion}</span>
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-xs text-texto-2">
        {todas.map((s) => {
          const visible = series.includes(s);
          const tocable = aislable && todas.length > 1;
          const contenido = (
            <>
              <span className="h-[2px] w-3.5 rounded-full" style={{ background: s.color }} />
              {s.nombre}
              <b className="font-semibold text-texto">{indice >= 0 && visible ? `${formato(s.valores[indice])} ${unidad}` : ""}</b>
            </>
          );
          return tocable ? (
            <button
              key={s.nombre}
              type="button"
              aria-pressed={aislada === s.nombre}
              onClick={() => setAislada(aislada === s.nombre ? null : s.nombre)}
              className={`-mx-2 flex items-center gap-1.5 rounded-lg px-2 py-1 ${aislada === s.nombre ? "bg-superficie" : "hover:bg-superficie"} ${visible ? "" : "opacity-40"}`}
            >
              {contenido}
            </button>
          ) : (
            <span key={s.nombre} className="flex items-center gap-1.5 py-1">
              {contenido}
            </span>
          );
        })}
        {banda && indice >= 0 ? (
          <span className="flex items-center gap-1.5 py-1">
            <span className="h-2.5 w-3 rounded-sm opacity-35" style={{ background: banda.color }} />
            {banda.nombre}
            <b className="font-semibold text-texto">
              {formato(banda.min[indice])} a {formato(banda.max[indice])} {unidad}
            </b>
          </span>
        ) : null}
        {riegos ? (
          <span className="flex items-center gap-1.5 py-1">
            <span className="h-3 w-1.5 rounded-sm opacity-75" style={{ background: COLOR.riego }} />
            Riego <b className="font-semibold text-texto">{Math.round(riegos.mm)} mm</b> ({riegos.n})
          </span>
        ) : null}
        {lluvias ? (
          <span className="flex items-center gap-1.5 py-1">
            <span className="h-3 w-1.5 rounded-sm opacity-75" style={{ background: COLOR.lluvia }} />
            Lluvia <b className="font-semibold text-texto">{Math.round(lluvias.mm)} mm</b> ({lluvias.n})
          </span>
        ) : null}
      </div>
      <div ref={caja} className="relative" style={{ height: alto }}>
        {ancho > 0 ? (
          <svg width={ancho} height={alto} role="img" aria-label={`Gráfico de ${titulo}`} onPointerMove={mover} onPointerLeave={() => setElegido(null)} className="touch-none select-none">
            {marcasY.map((m) => (
              <g key={`y${m}`}>
                <line x1={IZQ} x2={ancho - DER} y1={y(m)} y2={y(m)} stroke={COLOR.grilla} />
                <text x={IZQ - 8} y={y(m) + 4} fontSize={11} fill={COLOR.ejes} textAnchor="end">
                  {formatoEje(m)}
                </text>
              </g>
            ))}
            {marcasX.map((t) => (
              <text key={`x${t}`} x={x(t)} y={alto - 6} fontSize={11} fill={COLOR.ejes} textAnchor={x(t) > ancho - DER - 20 ? "end" : x(t) < IZQ + 16 ? "start" : "middle"}>
                {conHora && soloHora(t) !== "00:00" ? soloHora(t) : etiquetaCorta(t, false)}
              </text>
            ))}
            {referencia ? <Franja referencia={referencia} y={y} ancho={ancho} anchoUtil={anchoUtil} altoUtil={altoUtil} /> : null}
            {aguaVisible.map((a, i) => {
              const h = a.mm != null ? Math.max(3, (a.mm / maxMm) * altoUtil * ALTO_AGUA) : 6;
              return (
                <rect
                  key={`a${a.t}${i}`}
                  x={x(a.t) - 2.5}
                  y={ARRIBA + altoUtil - h}
                  width={5}
                  height={h}
                  rx={1}
                  fill={a.tipo === "riego" ? COLOR.riego : COLOR.lluvia}
                  opacity={a.mm != null ? 0.75 : 0.4}
                />
              );
            })}
            {banda ? <path d={trazoBanda(tiempos, banda.min, banda.max, x, y, huecoMs)} fill={banda.color} opacity={0.18} /> : null}
            {series.map((s) => (
              <path key={s.nombre} d={trazo(tiempos, s.valores, x, y, huecoMs)} stroke={s.color} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
            ))}
            {puntosSueltos
              ? series.map((s) => s.valores.map((v, i) => (v == null ? null : <circle key={`${s.nombre}${i}`} cx={x(tiempos[i])} cy={y(v)} r={2.5} fill={s.color} />)))
              : null}
            {elegido != null && tiempos[elegido] != null ? (
              <g>
                <line x1={x(tiempos[elegido])} x2={x(tiempos[elegido])} y1={ARRIBA} y2={ARRIBA + altoUtil} stroke={COLOR.guia} />
                {series.map((s) =>
                  s.valores[elegido] != null ? <circle key={`c${s.nombre}`} cx={x(tiempos[elegido])} cy={y(s.valores[elegido]!)} r={4} fill="#fff" stroke={s.color} strokeWidth={2} /> : null,
                )}
              </g>
            ) : null}
          </svg>
        ) : null}
        {!rango ? <p className="absolute inset-0 flex items-center justify-center text-sm text-texto-2">Sin datos en este período.</p> : null}
      </div>
      {nota ? <p className="text-xs text-texto-3">{nota}</p> : null}
    </div>
  );
}


/** Franja de referencia (agua útil) con sus líneas con nombre (PMP, CC, SAT). */
function Franja({ referencia: r, y: yy, ancho: w, anchoUtil: au, altoUtil: alu }: { referencia: Referencia; y: (v: number) => number; ancho: number; anchoUtil: number; altoUtil: number }) {
  const a = Math.max(ARRIBA, Math.min(yy(r.desde), yy(r.hasta)));
  const b = Math.min(ARRIBA + alu, Math.max(yy(r.desde), yy(r.hasta)));
  return (
    <g>
      <rect x={IZQ} width={au} y={a} height={Math.max(0, b - a)} fill={r.color} opacity={0.1} />
      {r.lineas.map((l) =>
        yy(l.valor) >= ARRIBA && yy(l.valor) <= ARRIBA + alu ? (
          <g key={l.etiqueta}>
            <line x1={IZQ} x2={w - DER} y1={yy(l.valor)} y2={yy(l.valor)} stroke={r.color} strokeDasharray="4 4" />
            <text x={w - DER - 2} y={yy(l.valor) - 3 < ARRIBA + 8 ? yy(l.valor) + 12 : yy(l.valor) - 4} fontSize={10} fill={r.color} textAnchor="end" fontWeight={700}>
              {l.etiqueta}
            </text>
          </g>
        ) : null,
      )}
    </g>
  );
}

function formatoEje(v: number): string {
  const a = Math.abs(v);
  if (a >= 10000) return `${Math.round(v / 1000)}k`;
  if (a >= 100 || Number.isInteger(v)) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}
