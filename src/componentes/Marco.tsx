// Marco de las pantallas con sesión: menú lateral noche con INTA | SENSOR, las secciones y la
// cuenta; a la derecha, el contenido sobre gris frío. En pantallas angostas el menú pasa arriba.
// Las secciones de las etapas siguientes (W2–W4) se suman acá cuando existan.
import { LogOut, Network } from "lucide-react";
import type { PropsWithChildren } from "react";
import { NavLink } from "react-router";

import { cerrarSesion } from "@/datos/cuenta";
import { useSesion } from "@/sesion/SesionContexto";

const SECCIONES = [{ ruta: "/", texto: "Red", icono: Network }] as const;

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
      <nav aria-label="Secciones" className="fondo-noche flex shrink-0 flex-col gap-6 px-4 py-5 text-noche-texto lg:sticky lg:top-0 lg:h-screen lg:w-62 lg:py-6">
        <div className="flex items-center gap-3 px-2">
          <img src="/branding/inta-blanco.png" alt="INTA" className="h-9 w-9" />
          <span aria-hidden className="h-7 w-px bg-[#334155]" />
          <img src="/branding/isologotipo-blanco.svg" alt="SENSOR" className="h-8 w-auto" />
        </div>
        <ul className="flex flex-row gap-1 lg:flex-col">
          {SECCIONES.map(({ ruta, texto, icono: Icono }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                end
                className={({ isActive }) =>
                  `flex h-11 items-center gap-3 rounded-chico border px-3 text-sm no-underline transition-colors ${
                    isActive ? "border-noche-borde bg-noche-2 font-semibold text-white" : "border-transparent text-[#cbd5e1] hover:bg-noche-2/60"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icono size={18} className={isActive ? "text-acento" : ""} aria-hidden />
                    {texto}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-3 border-t border-noche-borde px-2 pt-4">
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-noche-borde text-[13px] font-semibold">
            {iniciales || "?"}
          </span>
          <span className="flex min-w-0 flex-1 flex-col text-[13px]">
            <span className="truncate font-medium text-white">{nombre}</span>
            <span className="text-noche-texto-2">{perfil ? ROL[perfil.rol] : ""}</span>
          </span>
          <button
            type="button"
            onClick={() => void cerrarSesion()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-10 w-10 items-center justify-center rounded-chico text-noche-texto-2 hover:bg-noche-2 hover:text-white"
          >
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
