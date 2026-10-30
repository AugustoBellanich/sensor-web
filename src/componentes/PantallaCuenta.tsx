// Pantallas sin sesión (ingresar, crear cuenta, recuperar): panel noche a la izquierda con la red
// (cada nodo emite una onda que se agranda y se desvanece, como su rango de recepción), la frase y el
// laboratorio; tarjeta blanca con el formulario a la derecha. Retoma el inicio de la web v1, que es la
// referencia de la línea visual (docs/estilo.md). En el teléfono la tarjeta va sola, con los logos.
import { BadgeCheck, FlaskConical } from "lucide-react";
import type { CSSProperties, PropsWithChildren, ReactNode } from "react";

// Posición (en % del panel), tamaño del punto, duración de la onda y desfase de aparición.
const NODOS = [
  { y: 25, x: 20, r: 4, retraso: "0s", duracion: "4s", aparece: "0.1s" },
  { y: 40, x: 45, r: 5, retraso: "1.5s", duracion: "3s", aparece: "0.3s" },
  { y: 30, x: 75, r: 3, retraso: "0.5s", duracion: "4.5s", aparece: "0.5s" },
  { y: 75, x: 30, r: 4.5, retraso: "2.5s", duracion: "8s", aparece: "0.7s" },
  { y: 75, x: 65, r: 5, retraso: "1s", duracion: "3.5s", aparece: "0.9s" },
  { y: 50, x: 88, r: 3.5, retraso: "2s", duracion: "4s", aparece: "1.1s" },
  { y: 35, x: 55, r: 8, retraso: "0.2s", duracion: "3s", aparece: "0.4s" },
];

function Nodo({ n }: { n: (typeof NODOS)[number] }) {
  const tiempo = { "--duracion": n.duracion, animationDelay: n.retraso } as CSSProperties;
  return (
    <div className="nodo-aparece absolute" style={{ top: `${n.y}%`, left: `${n.x}%`, animationDelay: n.aparece }}>
      <span
        className="nodo-onda absolute rounded-full border border-acento bg-acento/10"
        style={{ width: n.r * 2, height: n.r * 2, transform: "translate(-50%, -50%)", ...tiempo }}
      />
      <span
        className="nodo-brillo absolute rounded-full bg-acento"
        style={{ width: n.r, height: n.r, transform: "translate(-50%, -50%)", boxShadow: `0 0 ${n.r * 2.5}px rgba(56,189,248,0.8)`, ...tiempo }}
      />
    </div>
  );
}

/** Isologotipo con un nodo que late sobre la "O" de SENSOR. */
function Logo({ claro, alto }: { claro?: boolean; alto: string }) {
  return (
    <span className="relative inline-block">
      <img src="/branding/isologotipo.svg" alt="SENSOR" className={`${alto} w-auto ${claro ? "brightness-0 invert" : "brightness-0 opacity-90"}`} />
      <span aria-hidden className="nodo-aparece absolute" style={{ top: "45%", left: "73%", animationDelay: "0.5s" }}>
        <span className="logo-onda absolute -mt-2 -ml-2.5 block h-5 w-5 rounded-full border border-acento/60 bg-acento/30" />
        <span className="absolute -mt-[3px] -ml-[3px] block h-2 w-2 rounded-full bg-acento shadow-[0_0_10px_2px_rgba(56,189,248,0.9)]" />
      </span>
    </span>
  );
}

export function PantallaCuenta({ titulo, bajada, pie, children }: PropsWithChildren<{ titulo: string; bajada?: string; pie?: ReactNode }>) {
  return (
    <div className="fondo-noche relative flex min-h-screen overflow-hidden">
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden border-r border-noche-borde/60 p-12 lg:flex">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-30" viewBox="0 0 400 900" preserveAspectRatio="none">
          <path d="M0,380 C80,330 160,390 240,340 C320,290 400,350 400,350 L400,900 L0,900 Z" fill="#0f172a" />
          <path d="M0,520 C100,470 200,530 300,480 C350,455 400,490 400,490 L400,900 L0,900 Z" fill="#0b0f19" opacity="0.8" />
        </svg>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {NODOS.map((n, i) => (
            <Nodo key={i} n={n} />
          ))}
        </div>

        <div className="relative flex items-center gap-4">
          <img src="/branding/inta-blanco.png" alt="INTA" className="h-14 w-14" />
          <span aria-hidden className="h-6 w-px bg-[#334155]" />
          <Logo claro alto="h-11" />
        </div>

        <div className="relative my-auto max-w-sm py-10">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-acento/20 bg-acento/10 px-3 py-1 text-[11px] font-medium text-acento">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-acento" />
            Telemetría y red de sensores
          </span>
          <p className="text-[32px] leading-snug font-bold tracking-tight text-[#f1f5f9]">
            Cada punto, un nodo.
            <br />
            Cada nodo, una red.
            <br />
            Cada red, una decisión.
          </p>
        </div>

        <div className="relative flex items-center justify-between gap-4 font-mono text-[11px] font-semibold tracking-wider text-acento uppercase">
          <span className="flex items-center gap-2">
            <FlaskConical size={14} aria-hidden />
            Laboratorio AGTECH · INTA EEA Catamarca
          </span>
          <span className="flex items-center gap-1.5">
            <BadgeCheck size={13} aria-hidden />
            Proyecto SENSOR
          </span>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 items-center justify-center p-5 sm:p-12">
        <div className="w-full max-w-md rounded-3xl border border-[#f1f5f9] bg-white p-7 shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-10">
          <div className="mb-8 flex items-center justify-center gap-5 border-b border-separador pb-6 lg:hidden">
            <img src="/branding/logo-inta.svg" alt="INTA" className="h-12 w-auto brightness-0 opacity-90" />
            <Logo alto="h-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">{titulo}</h1>
          {bajada ? <p className="mt-2 text-[13px] leading-relaxed text-texto-2">{bajada}</p> : null}
          <div className="mt-7 flex flex-col gap-5">{children}</div>
          <div className="mt-9 border-t border-separador pt-5 text-center text-[11px] text-texto-3">
            {pie ?? <span className="font-medium text-texto-2">Laboratorio AGTECH · EEA Catamarca · INTA</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
