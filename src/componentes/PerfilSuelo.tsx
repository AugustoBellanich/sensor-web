// Esquema del perfil del sitio (D-106, D-125): un monolito de suelo con el frente a escala (la regla y
// las sondas marcan la profundidad exacta) y la cara de arriba y la del costado solo para dar volumen.
// Cada capa se pinta con su Munsell o con un color genérico (datos/textura.ts) y lleva granos según su
// composición: puntos claros (arena), guiones (limo), líneas horizontales (arcilla) y piedras (gravas).
// Cada sonda es una varilla clavada en el frente con una etiqueta: número, profundidad y la última
// humedad si es de las últimas 24 h.
import type { ReactNode } from "react";

import type { Capa, SueloDeSonda } from "@/datos/suelo";
import { numeroSuelo, textoCapa } from "@/datos/suelo";
import { COLOR_SONDA, type HumedadSonda } from "@/datos/sondas";
import {
  azar,
  colorCapa,
  composicion,
  textoSobre,
  variante,
} from "@/datos/textura";


const X0 = 46; // borde izquierdo del frente
const ANCHO = 150; // ancho del frente
const DX = 18; // profundidad del bloque (oblicua)
const DY = -11;
const Y0 = 34; // superficie
const ALTO = 300;

export function PerfilSuelo({
  capas,
  sondas,
  humedad = {},
}: {
  capas: Capa[];
  sondas: SueloDeSonda[];
  humedad?: Partial<Record<number, HumedadSonda>>;
}) {
  const profundidades = sondas
    .map((s) => s.depth)
    .filter((d): d is number => d != null);
  const fondo = Math.max(
    60,
    ...capas.map((c) => c.bottom_cm),
    ...profundidades.map((d) => d + 10),
  );
  const maximo = Math.ceil(fondo / 20) * 20;
  const y = (cm: number) => Y0 + (cm / maximo) * ALTO;
  const marcas = Array.from({ length: maximo / 10 + 1 }, (_, i) => i * 10);
  const colores = capas.map((c, i) => colorCapa(c, i));
  const hayGenerico = colores.some((c) => !c.medido);
  const arriba = colores[0]?.color ?? "hsl(32 18% 80%)";
  const derecha = X0 + ANCHO + DX + 14;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 375 ${Y0 + ALTO + 20}`}
        className="w-full"
        role="img"
        aria-label="Perfil del suelo con sus capas y las sondas a su profundidad"
      >
        <defs>
          {capas.map((c, i) => (
            <clipPath key={i} id={`capa-${i}`}>
              <rect
                x={X0}
                y={y(c.top_cm)}
                width={ANCHO}
                height={y(c.bottom_cm) - y(c.top_cm)}
              />
            </clipPath>
          ))}
        </defs>

        {/* sombra de apoyo */}
        <ellipse
          cx={X0 + ANCHO / 2 + DX / 2}
          cy={Y0 + ALTO + 6}
          rx={ANCHO / 2 + 16}
          ry={7}
          fill="#94a3b8"
          opacity={0.14}
        />

        {/* cara de arriba con pasto */}
        <polygon
          points={`${X0},${Y0} ${X0 + ANCHO},${Y0} ${X0 + ANCHO + DX},${Y0 + DY} ${X0 + DX},${Y0 + DY}`}
          fill={capas.length ? variante(arriba, 10) : "#f1f5f9"}
        />
        {capas.length
          ? Array.from({ length: 7 }, (_, g) => {
              const gx = X0 + 14 + g * 20;
              const gy = Y0 + DY / 2 + (g % 2 ? 2 : -1);
              return (
                <path
                  key={g}
                  d={`M${gx} ${gy} l-2 -5 M${gx + 3} ${gy} l1 -6 M${gx + 6} ${gy} l3 -4`}
                  stroke="#7d9a3e"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />
              );
            })
          : null}

        {capas.length ? (
          capas.map((c, i) => (
            <CapaDibujo
              key={c.id ?? i}
              capa={c}
              i={i}
              color={colores[i].color}
              a={y(c.top_cm)}
              b={y(c.bottom_cm)}
            />
          ))
        ) : (
          <>
            <rect
              x={X0}
              y={Y0}
              width={ANCHO}
              height={ALTO}
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeDasharray="4 4"
            />
            <text
              x={X0 + ANCHO / 2}
              y={Y0 + ALTO / 2}
              fontSize={11.5}
              fill="#64748b"
              textAnchor="middle"
            >
              Sin capas descriptas
            </text>
          </>
        )}
        {capas.length ? (
          <rect
            x={X0}
            y={Y0}
            width={ANCHO}
            height={y(Math.max(...capas.map((c) => c.bottom_cm))) - Y0}
            fill="none"
            stroke="#fff"
            strokeOpacity={0.5}
          />
        ) : null}

        {/* regla */}
        {marcas.map((m) => {
          const mayor = m % 20 === 0;
          return (
            <g key={m}>
              <line
                x1={X0 - (mayor ? 9 : 5)}
                x2={X0 - 2}
                y1={y(m)}
                y2={y(m)}
                stroke="#b4b2a9"
              />
              {mayor ? (
                <text
                  x={X0 - 13}
                  y={y(m) + 4}
                  fontSize={11}
                  fill="#64748b"
                  textAnchor="end"
                >
                  {m}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={X0 - 13} y={Y0 - 12} fontSize={10.5} fill="#94a3b8" textAnchor="end">
          cm
        </text>

        {/* sondas */}
        {sondas.map((s) => {
          if (s.depth == null) return null;
          const yy = y(s.depth);
          const col = COLOR_SONDA[s.index - 1];
          const h = humedad[s.index];
          const texto = `${numeroSuelo(s.depth, 0)} cm${h ? ` · ${numeroSuelo(h.valor, 1)} ${h.unidad === "% vol" ? "%" : "% g"}` : ""}`;
          const ancho = 50 + texto.length * 6.4;
          return (
            <g key={s.index}>
              <title>
                {`Sonda ${s.index} a ${numeroSuelo(s.depth, 0)} cm${h ? `; ${numeroSuelo(h.valor, 1)} ${h.unidad} el ${fechaHora(h.t)}` : ""}`}
              </title>
              <rect
                x={X0 + ANCHO - 62}
                y={yy - 3}
                width={62}
                height={6}
                rx={3}
                fill="#fff"
                fillOpacity={0.92}
              />
              <rect
                x={X0 + ANCHO - 62}
                y={yy - 3}
                width={11}
                height={6}
                rx={3}
                fill={col}
              />
              <line
                x1={X0 + ANCHO}
                x2={derecha}
                y1={yy}
                y2={yy}
                stroke={col}
                strokeWidth={1.2}
                strokeDasharray="2 2"
              />
              <rect
                x={derecha}
                y={yy - 12}
                width={ancho}
                height={24}
                rx={12}
                fill="#fff"
                stroke={col}
                strokeWidth={1.2}
              />
              <circle cx={derecha + 12} cy={yy} r={4} fill={col} />
              <text
                x={derecha + 21}
                y={yy + 4}
                fontSize={11.5}
                fontWeight={600}
                fill="#0f172a"
              >
                S{s.index}
              </text>
              <text x={derecha + 38} y={yy + 4} fontSize={11} fill="#475569">
                {texto}
              </text>
            </g>
          );
        })}
      </svg>
      {capas.length && hayGenerico ? (
        <figcaption className="mt-1 text-[11.5px] text-texto-3">
          {colores.every((c) => !c.medido)
            ? "Colores ilustrativos: no hay color Munsell cargado."
            : "Las capas sin color Munsell se muestran con un color ilustrativo."}
        </figcaption>
      ) : null}
    </figure>
  );
}

function CapaDibujo({
  capa,
  i,
  color,
  a,
  b,
}: {
  capa: Capa;
  i: number;
  color: string;
  a: number;
  b: number;
}) {
  const alto = b - a;
  const tinta = textoSobre(color);
  const f = composicion(capa);
  const g = granos({ capa, i, a, b, f });
  const dato = [
    capa.texture_class,
    capa.bulk_density != null
      ? `${numeroSuelo(capa.bulk_density, 2)} g/cm³`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <g>
      <polygon
        points={`${X0 + ANCHO},${a} ${X0 + ANCHO + DX},${a + DY} ${X0 + ANCHO + DX},${b + DY} ${X0 + ANCHO},${b}`}
        fill={variante(color, -11)}
      />
      <rect x={X0} y={a} width={ANCHO} height={alto} fill={color} />
      <g clipPath={`url(#capa-${i})`}>{g}</g>
      {i > 0 ? (
        <line
          x1={X0}
          x2={X0 + ANCHO}
          y1={a}
          y2={a}
          stroke="#fff"
          strokeOpacity={0.45}
        />
      ) : null}
      {alto > 20 ? (
        <text x={X0 + 10} y={a + 16} fontSize={11.5} fontWeight={600} fill={tinta}>
          {capa.name ? `${capa.name} · ` : ""}
          {textoCapa(capa)}
        </text>
      ) : null}
      {alto > 36 ? (
        <text
          x={X0 + 10}
          y={a + 30}
          fontSize={11}
          fill={tinta}
          fillOpacity={0.82}
        >
          {dato || "Sin textura"}
        </text>
      ) : null}
    </g>
  );
}

/** Granos de la capa: cantidad según la composición; sin composición, una trama neutra. */
function granos({
  capa,
  i,
  a,
  b,
  f,
}: {
  capa: Capa;
  i: number;
  a: number;
  b: number;
  f: { arena: number; limo: number; arcilla: number } | null;
}) {
  const r = azar(1000 + i * 7919 + Math.round(capa.top_cm * 31));
  const area = (ANCHO * (b - a)) / 1000; // en miles de px²
  const comp = f ?? { arena: 34, limo: 33, arcilla: 33 };
  const tenue = f ? 1 : 0.6;
  const n = (pct: number, densidad: number) =>
    Math.round((pct / 100) * area * densidad);
  const x = () => X0 + 2 + r() * (ANCHO - 4);
  const yy = () => a + 2 + r() * (b - a - 4);
  const out: ReactNode[] = [];
  for (let k = 0; k < n(comp.arena, 9); k++)
    out.push(
      <circle
        key={`a${k}`}
        cx={x()}
        cy={yy()}
        r={0.8 + r() * 0.8}
        fill="#fff"
        opacity={(0.18 + r() * 0.16) * tenue}
      />,
    );
  for (let k = 0; k < n(comp.limo, 6); k++) {
    const cx = x();
    const cy = yy();
    out.push(
      <line
        key={`l${k}`}
        x1={cx}
        x2={cx + 3 + r() * 2}
        y1={cy}
        y2={cy}
        stroke="#3b2a1a"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.16 * tenue}
      />,
    );
  }
  for (let k = 0; k < n(comp.arcilla, 3); k++) {
    const cx = x();
    const cy = yy();
    out.push(
      <line
        key={`c${k}`}
        x1={cx}
        x2={cx + 9 + r() * 6}
        y1={cy}
        y2={cy}
        stroke="#3b2a1a"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.2 * tenue}
      />,
    );
  }
  const piedras = Math.round(((capa.gravel_pct ?? 0) / 100) * area * 5);
  // Las piedras no tapan el rótulo de la capa (los primeros 38 px, si la capa es alta).
  const arribaPiedras = b - a > 70 ? a + 38 : a + 4;
  for (let k = 0; k < piedras; k++)
    out.push(
      <ellipse
        key={`g${k}`}
        cx={x()}
        cy={arribaPiedras + r() * (b - arribaPiedras - 4)}
        rx={2.8 + r() * 3.2}
        ry={2 + r() * 2.2}
        fill="#e2ded3"
        stroke="#00000022"
        strokeWidth={0.6}
      />,
    );
  return out;
}

function fechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
