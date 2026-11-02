// Borrar o archivar un sitio, lote o campo (D-45, D-46), como en la app (BotonQuitar, ConfirmarQuitar
// y useQuitar de sensor-app). Lo vacío se borra con una confirmación; lo que tiene datos se archiva:
// primero muestra qué tiene, el botón espera ESPERA_ARCHIVAR_S segundos y pide un segundo "sí".
// Qué se hace lo decide la base, que también controla quién puede.
import { Archive, PowerOff, Trash2, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Aviso, Boton, Cargando } from "@/componentes/ui";
import {
  contenido,
  ESPERA_ARCHIVAR_S,
  quitar,
  resumenCampo,
  resumenEquipo,
  resumenLote,
  resumenSitio,
  type Accion,
  type ContenidoCampo,
  type ContenidoEquipo,
  type ContenidoLote,
  type ContenidoSitio,
  type TipoQuitar,
} from "@/datos/archivo";

type Textos = { el: string; verbo: string; Icono: LucideIcon; explicacion: string };

const ARCHIVAR = "Sale de listas y mapa; los datos quedan. Se puede restaurar";
const TEXTOS: Record<TipoQuitar, Textos> = {
  sitio: { el: "el sitio", verbo: "archivar", Icono: Archive, explicacion: `${ARCHIVAR} desde el campo.` },
  lote: { el: "el lote", verbo: "archivar", Icono: Archive, explicacion: `${ARCHIVAR} desde el campo.` },
  campo: {
    el: "el campo",
    verbo: "archivar",
    Icono: Archive,
    explicacion: `Se archiva con sus lotes y sitios. ${ARCHIVAR} desde la lista de campos.`,
  },
  equipo: {
    el: "el equipo",
    verbo: "retirar",
    Icono: PowerOff,
    explicacion: "Deja de cargar datos y se libera del sitio; los datos quedan. Se puede reactivar.",
  },
};

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function resumenDe(tipo: TipoQuitar, c: unknown): string[] {
  switch (tipo) {
    case "sitio":
      return resumenSitio(c as ContenidoSitio);
    case "lote":
      return resumenLote(c as ContenidoLote);
    case "campo":
      return resumenCampo(c as ContenidoCampo);
    case "equipo":
      return resumenEquipo(c as ContenidoEquipo);
  }
}

/** Botón "Borrar o archivar …" con su confirmación. Mostrarlo solo a quien puede: la base igual lo exige. */
export function BotonQuitar({
  tipo,
  id,
  nombre,
  alTerminar,
}: {
  tipo: TipoQuitar;
  id: string;
  nombre: string;
  alTerminar: (accion: Accion) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const verbo = TEXTOS[tipo].verbo;
  return (
    <>
      <div>
        <Boton variante="texto" icono={Trash2} onClick={() => setAbierto(true)} className="text-error!">
          Borrar o {verbo} {tipo}
        </Boton>
      </div>
      {abierto ? (
        <Confirmar
          tipo={tipo}
          id={id}
          nombre={nombre}
          alCancelar={() => setAbierto(false)}
          alTerminar={(a) => {
            setAbierto(false);
            alTerminar(a);
          }}
        />
      ) : null}
    </>
  );
}

// Se monta solo mientras está abierta: cada vez arranca de cero (consulta, cuenta regresiva y primer paso).
function Confirmar({
  tipo,
  id,
  nombre,
  alCancelar,
  alTerminar,
}: {
  tipo: TipoQuitar;
  id: string;
  nombre: string;
  alCancelar: () => void;
  alTerminar: (accion: Accion) => void;
}) {
  const [conDatos, setConDatos] = useState<boolean | null>(null);
  const [resumen, setResumen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [espera, setEspera] = useState(ESPERA_ARCHIVAR_S);
  const [segundoPaso, setSegundoPaso] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let vigente = true;
    contenido(tipo, id).then((r) => {
      if (!vigente) return;
      // Sin saber qué tiene no se ofrece confirmar: queda el error y "Cancelar".
      if (!r.contenido) return setError(r.error ?? "No se pudo consultar qué tiene.");
      setConDatos(r.contenido.has_data);
      setResumen(resumenDe(tipo, r.contenido));
    });
    return () => {
      vigente = false;
    };
  }, [tipo, id]);

  useEffect(() => {
    if (conDatos !== true || espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [conDatos, espera]);

  const cerrar = useCallback(() => {
    if (!trabajando) alCancelar();
  }, [trabajando, alCancelar]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [cerrar]);

  async function confirmar() {
    setTrabajando(true);
    setError(null);
    const r = await quitar(tipo, id);
    setTrabajando(false);
    if (!r.ok) return setError(r.mensaje);
    alTerminar(r.accion ?? "borrado");
  }

  const { el, verbo, Icono, explicacion } = TEXTOS[tipo];
  const Verbo = mayuscula(verbo);
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(15,23,42,0.55)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && cerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${conDatos ? Verbo : "Borrar"} ${el}`}
        className="flex w-full max-w-[440px] flex-col gap-3.5 rounded-xl border border-linea bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.22)]"
      >
        {conDatos === null && error ? (
          <>
            <Aviso mensaje={error} />
            <div>
              <Boton variante="secundario" onClick={alCancelar}>
                Cerrar
              </Boton>
            </div>
          </>
        ) : conDatos === null ? (
          <Cargando texto={`Revisando qué tiene ${el}…`} />
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              {conDatos ? (
                <Icono size={20} className="shrink-0 text-aviso" aria-hidden />
              ) : (
                <Trash2 size={20} className="shrink-0 text-error" aria-hidden />
              )}
              <h2 className="min-w-0 text-[15px] font-semibold text-tinta [overflow-wrap:anywhere]">
                {conDatos ? Verbo : "Borrar"} «{nombre}»
              </h2>
            </div>
            {conDatos ? (
              <>
                <p className="text-[13px] text-texto-2">{explicacion}</p>
                {resumen.length ? (
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-texto">
                    {resumen.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="text-[13px] text-texto-2">No tiene datos: se borra definitivamente.</p>
            )}
            <Aviso mensaje={error} />
            {conDatos && segundoPaso ? (
              <p className="text-[13px] font-semibold text-tinta">
                ¿Seguro que querés {verbo} {el}?
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Boton variante="secundario" onClick={alCancelar} disabled={trabajando}>
                Cancelar
              </Boton>
              {!conDatos ? (
                <Boton
                  icono={Trash2}
                  cargando={trabajando}
                  onClick={() => void confirmar()}
                  className="border-error! bg-error! hover:bg-[#991b1b]!"
                >
                  Borrar
                </Boton>
              ) : !segundoPaso ? (
                <Boton icono={Icono} disabled={espera > 0} onClick={() => setSegundoPaso(true)}>
                  {espera > 0 ? `${Verbo} (${espera})` : Verbo}
                </Boton>
              ) : (
                <Boton icono={Icono} cargando={trabajando} onClick={() => void confirmar()}>
                  Sí, {verbo}
                </Boton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
