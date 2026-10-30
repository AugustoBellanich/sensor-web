// Marco de las pantallas con sesión: menú lateral noche, angosto, con las mismas secciones que la
// app (Equipos, Mapa, Campos) y la cuenta abajo; a la derecha, la barra con el camino (Campos ›
// Campo › Lote › Sitio) y el contenido. En pantallas angostas el menú pasa arriba.
import { ChevronRight, Cpu, LogOut, Map, MapPinned, type LucideIcon } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { Link, NavLink } from "react-router";

import { cerrarSesion } from "@/datos/cuenta";
import { useSesion } from "@/sesion/SesionContexto";

const SECCIONES: { ruta: string; texto: string; icono: LucideIcon; fin?: boolean }[] = [
  { ruta: "/", texto: "Equipos", icono: Cpu, fin: true },
  { ruta: "/mapa", texto: "Mapa", icono: MapPinned },
  { ruta: "/campos", texto: "Campos", icono: Map },
];

const ROL = { user: "Usuario", staff: "Equipo del proyecto", admin: "Administrador" } as const;

export function Marco({ children }: PropsWithChildren) {
  const { perfil, sesion } = useSesion();
  const nombre = perfil?.nombre ?? sesion?.user.email ?? "";
  const iniciales = nombre
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <nav aria-label="Secciones" className="flex shrink-0 flex-col gap-5 bg-noche px-3 py-4 text-noche-texto lg:sticky lg:top-0 lg:h-screen lg:w-[200px]">
        <Link to="/" className="flex items-center gap-2.5 px-1.5 no-underline" aria-label="Inicio">
          <img src="/branding/inta-blanco.png" alt="INTA" className="h-7 w-7" />
          <span aria-hidden className="h-5 w-px bg-[#334155]" />
          <img src="/branding/isologotipo-blanco.svg" alt="SENSOR" className="h-6 w-auto" />
        </Link>
        <ul className="flex flex-row flex-wrap gap-0.5 lg:flex-col">
          {SECCIONES.map(({ ruta, texto, icono: Icono, fin }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                end={fin}
                className={({ isActive }) =>
                  `flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] no-underline transition-colors ${
                    isActive ? "bg-acento/10 font-medium text-white" : "text-[#cbd5e1] hover:bg-white/5"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icono size={16} strokeWidth={1.9} className={isActive ? "text-acento" : "text-noche-texto-2"} aria-hidden />
                    {texto}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-2 border-t border-noche-borde px-1.5 pt-3">
          <NavLink to="/cuenta" className="flex min-w-0 flex-1 items-center gap-2 no-underline" title="Cuenta">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-noche-borde text-[11px] font-semibold text-noche-texto">
              {iniciales || "?"}
            </span>
            <span className="flex min-w-0 flex-col text-[12.5px]">
              <span className="truncate font-medium text-white">{nombre}</span>
              <span className="truncate text-noche-texto-2">{perfil ? ROL[perfil.rol] : "Cuenta"}</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={() => void cerrarSesion()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-noche-texto-2 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col bg-fondo">{children}</div>
    </div>
  );
}

/** Barra de arriba de cada pantalla: el camino hasta acá (cada tramo es un enlace) y acciones. */
export function Barra({ migas, children }: PropsWithChildren<{ migas: { texto: ReactNode; a?: string }[] }>) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2.5 border-b border-linea bg-white px-5 py-2 lg:px-7">
      <nav aria-label="Ubicación" className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px]">
        {migas.map((m, i) => (
          <span key={i} className="inline-flex min-w-0 items-center gap-1.5">
            {i > 0 ? <ChevronRight size={13} className="shrink-0 text-[#94a3b8]" aria-hidden /> : null}
            {m.a ? (
              <Link to={m.a} className="truncate text-texto-3 no-underline hover:text-tinta">
                {m.texto}
              </Link>
            ) : i === migas.length - 1 ? (
              <span aria-current="page" className="truncate font-medium text-tinta">
                {m.texto}
              </span>
            ) : (
              <span className="truncate text-texto-3">{m.texto}</span>
            )}
          </span>
        ))}
      </nav>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

/** Contenido de la pantalla, con ancho máximo y márgenes. */
export function Contenido({ children, ancho = 1320 }: PropsWithChildren<{ ancho?: number }>) {
  return (
    <main className="mx-auto flex w-full flex-col gap-4 px-5 pt-5 pb-10 lg:px-7" style={{ maxWidth: ancho }}>
      {children}
    </main>
  );
}
