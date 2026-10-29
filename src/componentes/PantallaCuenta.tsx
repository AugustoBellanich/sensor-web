// Pantallas sin sesión (ingresar, crear cuenta, recuperar): fondo noche con nodos y la frase de
// la red a la izquierda, tarjeta blanca con el formulario a la derecha. Es la referencia de la
// línea visual (docs/estilo.md); en el teléfono la tarjeta va sola.
import type { PropsWithChildren } from "react";

const NODOS = [
  { x: "12%", y: "18%", r: 3 },
  { x: "30%", y: "72%", r: 4 },
  { x: "38%", y: "30%", r: 2 },
  { x: "8%", y: "84%", r: 2.5 },
  { x: "44%", y: "56%", r: 2 },
];

export function PantallaCuenta({ titulo, bajada, children }: PropsWithChildren<{ titulo: string; bajada?: string }>) {
  return (
    <div className="fondo-noche relative flex min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {NODOS.map((n, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-acento"
            style={{ left: n.x, top: n.y, width: n.r * 2, height: n.r * 2, boxShadow: `0 0 0 ${n.r * 2}px rgba(56,189,248,0.12), 0 0 ${n.r * 6}px rgba(56,189,248,0.6)`, opacity: 0.8 }}
          />
        ))}
      </div>
      <div className="relative hidden flex-1 flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-3">
          <img src="/branding/inta-blanco.png" alt="INTA" className="h-12 w-12" />
          <span aria-hidden className="h-9 w-px bg-[#334155]" />
          <img src="/branding/isologotipo-blanco.svg" alt="SENSOR" className="h-11 w-auto" />
        </div>
        <p className="max-w-md text-[34px] leading-tight font-semibold tracking-tight text-white">
          Cada punto, un nodo.
          <br />
          Cada nodo, una red.
          <br />
          Cada red, una decisión.
        </p>
        <p className="text-sm text-noche-texto-2">Laboratorio AGTECH · INTA EEA Catamarca</p>
      </div>
      <main className="relative flex min-w-0 flex-1 items-center justify-center p-5 lg:max-w-[560px] lg:flex-none lg:pr-16">
        <div className="w-full max-w-[400px] rounded-[20px] bg-white p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img src="/branding/isologotipo.svg" alt="SENSOR" className="h-8 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">{titulo}</h1>
          {bajada ? <p className="mt-1 text-sm text-texto-2">{bajada}</p> : null}
          <div className="mt-6 flex flex-col gap-4">{children}</div>
        </div>
      </main>
    </div>
  );
}
