// Vincular un equipo con su id y el código que vino con él, como en la app: quedo como dueño. Si
// el código no es el correcto, la base cuenta los intentos que quedan.
import { Hash, KeyRound, Link2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { Barra, Contenido } from "@/componentes/Marco";
import { Aviso, Boton, Campo, Tarjeta, Titulo } from "@/componentes/ui";
import { vincular } from "@/datos/equipos";
import { idValido, modeloDeId, normalizarId } from "@/datos/estado";
import { AYUDA } from "@/datos/textos";

export function Vincular() {
  const navegar = useNavigate();
  const [id, setId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limpio = normalizarId(id);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setCargando(true);
    setError(null);
    const r = await vincular(id, codigo);
    setCargando(false);
    if (!r.ok) return setError(r.mensaje);
    navegar(`/equipo/${limpio}`, { replace: true });
  }

  return (
    <>
      <Barra
        migas={[{ texto: "Equipos", a: "/" }, { texto: "Vincular equipo" }]}
      />
      <Contenido ancho={640}>
        <Titulo titulo="Vincular equipo" />
        <Tarjeta>
          <p className="mb-4 text-[13px] text-texto-2">
            <ConAyuda que="vincular" texto={AYUDA.vincular}>
              El id y el código están en la etiqueta del equipo.
            </ConAyuda>
          </p>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <Aviso mensaje={error} />
            <Campo
              etiqueta="Id del equipo"
              icono={Hash}
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              placeholder="B01-A1B2C3"
              autoComplete="off"
              ayuda={
                limpio && idValido(limpio)
                  ? `Modelo: ${modeloDeId(limpio)}`
                  : undefined
              }
            />
            <Campo
              etiqueta="Código de vinculación"
              icono={KeyRound}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="8 letras y números"
              autoComplete="off"
            />
            <div>
              <Boton
                type="submit"
                icono={Link2}
                cargando={cargando}
                disabled={!idValido(limpio) || !codigo.trim()}
              >
                Vincular
              </Boton>
            </div>
          </form>
        </Tarjeta>
      </Contenido>
    </>
  );
}
