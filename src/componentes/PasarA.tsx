// Pasar un campo o un equipo a otra persona (admin y staff), como en la app. El dueño anterior queda
// como editor. Hace falta, por ejemplo, para dar de baja la cuenta de quien era el único dueño.
import { Mail, UserRoundCog } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Aviso, Boton, Campo, Tarjeta } from "@/componentes/ui";
import { pasarA } from "@/datos/administracion";

export function PasarA({
  tipo,
  id,
  nombre,
  alTerminar,
}: {
  tipo: "campo" | "equipo";
  id: string;
  nombre: string;
  alTerminar: () => void;
}) {
  const [correo, setCorreo] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<{
    tipo: "error" | "bien";
    mensaje: string;
  } | null>(null);
  const valido = /^\S+@\S+\.\S+$/.test(correo.trim());

  async function pasar() {
    setTrabajando(true);
    const r = await pasarA(tipo, id, correo);
    setTrabajando(false);
    setConfirmar(false);
    if (!r.ok) return setAviso({ tipo: "error", mensaje: r.mensaje });
    setAviso({
      tipo: "bien",
      mensaje: `Listo: ${correo.trim()} es el nuevo dueño.`,
    });
    setCorreo("");
    alTerminar();
  }

  return (
    <Tarjeta
      titulo={
        <span className="inline-flex items-center gap-1.5">
          <UserRoundCog
            size={15}
            strokeWidth={1.9}
            className="text-texto-3"
            aria-hidden
          />
          Pasar a otra persona
        </span>
      }
    >
      <p className="mb-3 text-[13px] text-texto-2">
        {tipo === "campo" ? "El campo, con sus lotes y sitios," : "El equipo"}{" "}
        queda a nombre de otra persona, que tiene que tener cuenta. El dueño
        actual pasa a editor.
      </p>
      <form
        onSubmit={(ev: FormEvent) => {
          ev.preventDefault();
          if (valido) setConfirmar(true);
        }}
        className="flex flex-col gap-3"
      >
        <Campo
          etiqueta="Correo del nuevo dueño"
          icono={Mail}
          type="email"
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value);
            setConfirmar(false);
            setAviso(null);
          }}
          placeholder="persona@ejemplo.com"
        />
        {aviso ? <Aviso tipo={aviso.tipo} mensaje={aviso.mensaje} /> : null}
        {confirmar ? (
          <div className="flex flex-col gap-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3">
            <p className="text-[13px] text-[#92400e]">
              «{nombre}» pasa a {correo.trim()}. El dueño actual queda como
              editor.
            </p>
            <div className="flex gap-2">
              <Boton
                type="button"
                icono={UserRoundCog}
                cargando={trabajando}
                onClick={pasar}
              >
                Sí, pasar
              </Boton>
              <Boton
                type="button"
                variante="secundario"
                onClick={() => setConfirmar(false)}
              >
                Cancelar
              </Boton>
            </div>
          </div>
        ) : (
          <div>
            <Boton
              type="submit"
              variante="secundario"
              icono={UserRoundCog}
              disabled={!valido}
            >
              Pasar
            </Boton>
          </div>
        )}
      </form>
    </Tarjeta>
  );
}
