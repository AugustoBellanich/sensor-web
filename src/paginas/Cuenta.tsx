// Ingresar, crear cuenta (con el código que llega por mail) y recuperar la contraseña. Mismos
// textos y pasos que la app (sensor-app/src/app/(auth)). Al quedar la sesión, el ruteo lleva a Red.
import { ArrowRight, KeyRound, Lock, Mail, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { Aviso, Boton, Campo } from "@/componentes/ui";
import { PantallaCuenta } from "@/componentes/PantallaCuenta";
import {
  cambiarContrasenaConCodigo,
  confirmarCuenta,
  crearCuenta,
  ingresar,
  pedirCodigoDeRecuperacion,
  reenviarCodigoDeAlta,
} from "@/datos/cuenta";
import { configurada } from "@/datos/supabase";

function SinConfiguracion() {
  return configurada ? null : <Aviso mensaje="Falta configurar la base (VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY)." />;
}

export function Ingresar() {
  const navegar = useNavigate();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const r = await ingresar(correo, contrasena);
    setCargando(false);
    if (r.ok) return;
    if ("sinConfirmar" in r && r.sinConfirmar) setConfirmar(true);
    else setError(r.mensaje);
  }

  if (confirmar) return <Confirmar correo={correo} alVolver={() => setConfirmar(false)} />;
  return (
    <PantallaCuenta titulo="Ingresar" bajada="Al panel de datos de PROYECTO SENSOR.">
      <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
        <SinConfiguracion />
        <Aviso mensaje={error} />
        <Campo
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          icono={Mail}
          placeholder="usuario@inta.gob.ar"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          icono={Lock}
          accion={<Link to="/recuperar">¿Olvidaste tu contraseña?</Link>}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />
        <div className="mt-1 flex flex-col gap-3">
          <Boton type="submit" cargando={cargando} iconoFin={ArrowRight} className="h-12">
            Ingresar al panel
          </Boton>
          <Boton variante="secundario" className="h-12" onClick={() => navegar("/crear-cuenta")}>
            Crear una cuenta
          </Boton>
        </div>
      </form>
    </PantallaCuenta>
  );
}

export function CrearCuenta() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const r = await crearCuenta(nombre, correo, contrasena);
    setCargando(false);
    if (!r.ok) return setError(r.mensaje);
    if (r.confirmar) setConfirmar(true);
  }

  if (confirmar) return <Confirmar correo={correo} alVolver={() => setConfirmar(false)} />;
  return (
    <PantallaCuenta titulo="Crear cuenta" bajada="Para ver tus equipos y sumarlos a la red.">
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <SinConfiguracion />
        <Aviso mensaje={error} />
        <Campo etiqueta="Nombre y apellido" autoComplete="name" icono={UserRound} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Campo etiqueta="Correo electrónico" type="email" autoComplete="email" icono={Mail} value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          icono={Lock}
          ayuda="Al menos 8 caracteres"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        <Boton type="submit" cargando={cargando} className="mt-1">
          Crear cuenta
        </Boton>
      </form>
      <p className="text-sm text-texto-2">
        ¿Ya tenés cuenta? <Link to="/ingresar">Ingresar</Link>
      </p>
    </PantallaCuenta>
  );
}

function Confirmar({ correo, alVolver }: { correo: string; alVolver: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const r = await confirmarCuenta(correo, codigo);
    setCargando(false);
    if (!r.ok) setError(r.mensaje);
  }

  return (
    <PantallaCuenta titulo="Confirmá tu correo" bajada={`Código enviado a ${correo}`}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Aviso mensaje={error} />
        <Aviso tipo="bien" mensaje={aviso} />
        <Campo etiqueta="Código" inputMode="numeric" autoComplete="one-time-code" icono={KeyRound} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <Boton type="submit" cargando={cargando}>
          Confirmar
        </Boton>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button
          type="button"
          className="text-acento-oscuro hover:underline"
          onClick={async () => {
            const r = await reenviarCodigoDeAlta(correo);
            if (r.ok) setAviso("Código nuevo enviado. Revisá también el correo no deseado.");
            else setError(r.mensaje);
          }}
        >
          Reenviar código
        </button>
        <button type="button" className="text-acento-oscuro hover:underline" onClick={alVolver}>
          Volver a ingresar
        </button>
      </div>
    </PantallaCuenta>
  );
}

export function Recuperar() {
  const navegar = useNavigate();
  const [correo, setCorreo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function pedir(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const r = await pedirCodigoDeRecuperacion(correo);
    setCargando(false);
    if (r.ok) setEnviado(true);
    else setError(r.mensaje);
  }

  async function cambiar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const r = await cambiarContrasenaConCodigo(correo, codigo, nueva);
    setCargando(false);
    if (r.ok) navegar("/");
    else setError(r.mensaje);
  }

  return (
    <PantallaCuenta titulo="Recuperar contraseña" bajada={enviado ? `Código enviado a ${correo}` : "Te llega un código para elegir una contraseña nueva."}>
      {!enviado ? (
        <form onSubmit={pedir} className="flex flex-col gap-4" noValidate>
          <Aviso mensaje={error} />
          <Campo etiqueta="Correo electrónico" type="email" autoComplete="email" icono={Mail} value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <Boton type="submit" cargando={cargando}>
            Enviar código
          </Boton>
        </form>
      ) : (
        <form onSubmit={cambiar} className="flex flex-col gap-4" noValidate>
          <Aviso mensaje={error} />
          <Campo etiqueta="Código" inputMode="numeric" autoComplete="one-time-code" icono={KeyRound} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <Campo
            etiqueta="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            icono={Lock}
            ayuda="Al menos 8 caracteres"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <Boton type="submit" cargando={cargando}>
            Guardar y entrar
          </Boton>
          <button type="button" className="self-start text-sm text-acento-oscuro hover:underline" onClick={() => void pedirCodigoDeRecuperacion(correo)}>
            Reenviar código
          </button>
        </form>
      )}
      <p className="text-sm">
        <Link to="/ingresar">Volver a ingresar</Link>
      </p>
    </PantallaCuenta>
  );
}
