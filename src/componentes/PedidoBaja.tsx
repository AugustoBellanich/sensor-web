// En la cuenta, como en la app: pedir la baja o, si ya se pidió, verla y cancelarla (D-46). La baja
// la ejecuta un administrador; mientras tanto la cuenta sigue funcionando.
import { UserX, X } from "lucide-react";
import { useState } from "react";

import { Aviso, Boton, Campo, Tarjeta } from "@/componentes/ui";
import { cancelarBaja, miPedidoDeBaja, pedirBaja } from "@/datos/bajas";
import { fechaHoraArg } from "@/datos/grafico";
import { useConsulta } from "@/datos/useConsulta";

const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");

export function PedidoBaja() {
  const c = useConsulta(miPedidoDeBaja);
  const [abierto, setAbierto] = useState(false);
  const [seguro, setSeguro] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = c.datos?.pedido ?? null;
  if (c.cargando && !c.datos) return null;

  if (pedido) {
    return (
      <Tarjeta titulo="Pediste la baja de tu cuenta">
        <p className="mb-3 text-[13px] text-texto-2">
          El {fecha(pedido.requested_at)}. Un administrador la va a procesar;
          hasta entonces la cuenta sigue funcionando.
        </p>
        <Aviso mensaje={error} />
        <Boton
          variante="secundario"
          icono={X}
          cargando={trabajando}
          onClick={async () => {
            setTrabajando(true);
            const r = await cancelarBaja();
            setTrabajando(false);
            if (!r.ok) return setError(r.mensaje);
            c.actualizar();
          }}
        >
          Cancelar el pedido
        </Boton>
      </Tarjeta>
    );
  }

  if (!abierto) {
    return (
      <div>
        <Boton variante="texto" icono={UserX} onClick={() => setAbierto(true)}>
          Baja de la cuenta
        </Boton>
      </div>
    );
  }

  return (
    <Tarjeta titulo="Baja de la cuenta">
      <p className="mb-3 text-[13px] text-texto-2">
        Se borra tu acceso; tus datos quedan en la red, sin tu nombre. Si sos el
        único dueño de un campo o un equipo, primero pasa a otra persona. Lo
        podés cancelar mientras no se procese.
      </p>
      <Campo
        etiqueta="Motivo (opcional)"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={500}
      />
      <div className="mt-3">
        <Aviso mensaje={error} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {seguro ? (
          <Boton
            icono={UserX}
            cargando={trabajando}
            className="!border-error !bg-error"
            onClick={async () => {
              setTrabajando(true);
              const r = await pedirBaja(motivo);
              setTrabajando(false);
              if (!r.ok) return setError(r.mensaje);
              setAbierto(false);
              setSeguro(false);
              c.actualizar();
            }}
          >
            Sí, pedir la baja
          </Boton>
        ) : (
          <Boton
            variante="secundario"
            icono={UserX}
            onClick={() => setSeguro(true)}
          >
            Pedir la baja
          </Boton>
        )}
        <Boton
          variante="texto"
          onClick={() => {
            setAbierto(false);
            setSeguro(false);
          }}
        >
          Volver
        </Boton>
      </div>
    </Tarjeta>
  );
}
