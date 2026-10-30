// Rutas de la web. Sin sesión solo se ven ingresar, crear cuenta y recuperar; con sesión, el
// marco con las secciones. La base vuelve a controlar cada permiso (RLS).
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { Marco } from "@/componentes/Marco";
import { Cargando } from "@/componentes/ui";
import { Admin } from "@/paginas/Admin";
import { Calibracion } from "@/paginas/Calibracion";
import { PuntoCalibracion, SueloElectrodo } from "@/paginas/CargaCalibracion";
import { Campo } from "@/paginas/Campo";
import { Campos } from "@/paginas/Campos";
import { CultivoLote } from "@/paginas/CultivoLote";
import { DibujarLote } from "@/paginas/DibujarLote";
import { CopaLote } from "@/paginas/CopaLote";
import { CargarAgua } from "@/paginas/CargarAgua";
import { CrearCuenta, Ingresar, Recuperar } from "@/paginas/Cuenta";
import { EditarCampo, NuevoCampo } from "@/paginas/EditarCampo";
import { Equipo } from "@/paginas/Equipo";
import { GestionSitio, NuevoSitio } from "@/paginas/GestionSitio";
import { Equipos } from "@/paginas/Equipos";
import { Lote } from "@/paginas/Lote";
import { Mapa } from "@/paginas/Mapa";
import { RiegoLote } from "@/paginas/RiegoLote";
import { MiCuenta } from "@/paginas/MiCuenta";
import { Sitio } from "@/paginas/Sitio";
import { Vincular } from "@/paginas/Vincular";
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
          <Route path="/" element={<ConSesion><Equipos /></ConSesion>} />
          <Route path="/equipo/:id" element={<ConSesion><Equipo /></ConSesion>} />
          <Route path="/mapa" element={<ConSesion><Mapa /></ConSesion>} />
          <Route path="/campos" element={<ConSesion><Campos /></ConSesion>} />
          <Route path="/campos/nuevo" element={<ConSesion><NuevoCampo /></ConSesion>} />
          <Route path="/campo/:id/editar" element={<ConSesion><EditarCampo /></ConSesion>} />
          <Route path="/campo/:id" element={<ConSesion><Campo /></ConSesion>} />
          <Route path="/campo/:campo/lote/:id" element={<ConSesion><Lote /></ConSesion>} />
          <Route path="/campo/:campo/agua" element={<ConSesion><CargarAgua /></ConSesion>} />
          <Route path="/campo/:campo/dibujar" element={<ConSesion><DibujarLote /></ConSesion>} />
          <Route path="/campo/:campo/lote/:id/cultivo" element={<ConSesion><CultivoLote /></ConSesion>} />
          <Route path="/campo/:campo/lote/:id/copa" element={<ConSesion><CopaLote /></ConSesion>} />
          <Route path="/campo/:campo/lote/:id/riego" element={<ConSesion><RiegoLote /></ConSesion>} />
          <Route path="/campo/:campo/sitio/nuevo" element={<ConSesion><NuevoSitio /></ConSesion>} />
          <Route path="/sitio/:id/gestion" element={<ConSesion><GestionSitio /></ConSesion>} />
          <Route path="/sitio/:id" element={<ConSesion><Sitio /></ConSesion>} />
          <Route path="/sitio/:id/calibracion/punto" element={<ConSesion><PuntoCalibracion /></ConSesion>} />
          <Route path="/sitio/:id/calibracion/suelo" element={<ConSesion><SueloElectrodo /></ConSesion>} />
          <Route path="/sitio/:id/calibracion" element={<ConSesion><Calibracion /></ConSesion>} />
          <Route path="/admin/:seccion?" element={<ConSesion><Admin /></ConSesion>} />
          <Route path="/vincular" element={<ConSesion><Vincular /></ConSesion>} />
          <Route path="/cuenta" element={<ConSesion><MiCuenta /></ConSesion>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProveedorDeSesion>
  );
}
