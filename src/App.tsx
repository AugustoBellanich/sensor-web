// Rutas de la web. Sin sesión solo se ven ingresar, crear cuenta y recuperar; con sesión, el
// marco con las secciones. La base vuelve a controlar cada permiso (RLS).
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { Marco } from "@/componentes/Marco";
import { Cargando } from "@/componentes/ui";
import { CrearCuenta, Ingresar, Recuperar } from "@/paginas/Cuenta";
import { Red } from "@/paginas/Red";
import { Sitio } from "@/paginas/Sitio";
import { ProveedorDeSesion, useSesion } from "@/sesion/SesionContexto";

function ConSesion({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useSesion();
  if (cargando)
    return (
      <div className="fondo-noche flex min-h-screen items-center justify-center">
        <Cargando noche />
      </div>
    );
  if (!sesion) return <Navigate to="/ingresar" replace />;
  return <Marco>{children}</Marco>;
}

function SinSesion({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useSesion();
  if (!cargando && sesion) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <ProveedorDeSesion>
      <BrowserRouter>
        <Routes>
          <Route path="/ingresar" element={<SinSesion><Ingresar /></SinSesion>} />
          <Route path="/crear-cuenta" element={<SinSesion><CrearCuenta /></SinSesion>} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="/" element={<ConSesion><Red /></ConSesion>} />
          <Route path="/sitio/:id" element={<ConSesion><Sitio /></ConSesion>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProveedorDeSesion>
  );
}
