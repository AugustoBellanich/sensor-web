// Sesión y perfil del usuario para toda la web (copiado de sensor-app, D-83). Las rutas
// protegidas miran si hay sesión; el perfil trae el rol (user / staff / admin) para mostrar u
// ocultar la administración. La base vuelve a controlar cada permiso: esto es solo interfaz.
import type { Session } from "@supabase/supabase-js";
import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from "react";

import { miPerfil, type Perfil } from "@/datos/cuenta";
import { supabase } from "@/datos/supabase";

type Sesion = {
  sesion: Session | null;
  cargando: boolean; // true mientras se lee la sesión guardada al abrir la app
  perfil: Perfil | null;
  esAdmin: boolean; // admin o staff
  esAdminTotal: boolean; // solo admin
  recargarPerfil: () => Promise<void>;
};

const SesionContexto = createContext<Sesion | null>(null);

export function useSesion(): Sesion {
  const valor = use(SesionContexto);
  if (!valor) throw new Error("useSesion se usa dentro de <ProveedorDeSesion>");
  return valor;
}

export function ProveedorDeSesion({ children }: PropsWithChildren) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSesion(nueva);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const usuario = sesion?.user.id ?? null;
  const recargarPerfil = useCallback(async () => {
    const nuevo = usuario ? await miPerfil() : null;
    setPerfil(nuevo);
  }, [usuario]);

  // Al cambiar de usuario se vuelve a leer el perfil (rol). El perfil de otro usuario no se
  // muestra nunca: se descarta si al volver la respuesta ya cambió la sesión.
  useEffect(() => {
    let vigente = true;
    (usuario ? miPerfil() : Promise.resolve(null)).then((p) => {
      if (vigente) setPerfil(p);
    });
    return () => {
      vigente = false;
    };
  }, [usuario]);

  const rol = perfil?.rol;
  return (
    <SesionContexto
      value={{
        sesion,
        cargando,
        perfil,
        esAdmin: rol === "admin" || rol === "staff",
        esAdminTotal: rol === "admin",
        recargarPerfil,
      }}
    >
      {children}
    </SesionContexto>
  );
}
