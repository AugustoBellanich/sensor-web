// Cuenta, como la pestaña de la app: nombre, correo, rol y salir. Cambiar la contraseña se hace con
// "¿Olvidaste tu contraseña?" en el inicio de sesión. Desde acá se pide la baja (la ejecuta un admin).
import { LogOut, Mail, Shield, UserRound } from "lucide-react";

import { Barra, Contenido } from "@/componentes/Marco";
import { PedidoBaja } from "@/componentes/PedidoBaja";
import { Boton, FilaDato, Tarjeta, Titulo } from "@/componentes/ui";
import { cerrarSesion } from "@/datos/cuenta";
import { useSesion } from "@/sesion/SesionContexto";

const ROL = {
  user: "Usuario",
  staff: "Equipo del proyecto",
  admin: "Administrador",
} as const;

export function MiCuenta() {
  const { perfil, sesion } = useSesion();
  return (
    <>
      <Barra migas={[{ texto: "Cuenta" }]} />
      <Contenido ancho={720}>
        <Titulo titulo="Cuenta" />
        <Tarjeta>
          <FilaDato icono={UserRound} etiqueta="Nombre">
            {perfil?.nombre ?? "—"}
          </FilaDato>
          <FilaDato icono={Mail} etiqueta="Correo">
            {sesion?.user.email ?? "—"}
          </FilaDato>
          <FilaDato icono={Shield} etiqueta="Rol">
            {perfil ? ROL[perfil.rol] : "—"}
          </FilaDato>
        </Tarjeta>
        <div>
          <Boton
            variante="secundario"
            icono={LogOut}
            onClick={() => void cerrarSesion()}
          >
            Cerrar sesión
          </Boton>
        </div>
        <PedidoBaja />
      </Contenido>
    </>
  );
}
