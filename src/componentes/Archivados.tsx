// Lo archivado, para restaurarlo (D-45, D-46), como en la app: los lotes y sitios de un campo
// (Archivados, en la pantalla del campo) y los campos (CamposArchivados, al pie de Campos).
// Solo lo ven el dueño y admin/staff; la base igual lo exige.
import { Archive, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ConAyuda } from "@/componentes/Ayuda";
import { Aviso, Boton } from "@/componentes/ui";
import { camposArchivados, restaurar, type Archivados as ListaArchivados } from "@/datos/archivo";
import { mostrarFecha } from "@/datos/fechas";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";

function Plegable({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const Chevron = abierto ? ChevronDown : ChevronRight;
  return (
    <section className="rounded-xl border border-linea bg-white">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center gap-2 px-[18px] py-3.5 text-left"
      >
        <Archive size={15} strokeWidth={1.9} className="text-texto-3" aria-hidden />
        <span className="flex-1 text-sm font-semibold text-tinta">{titulo}</span>
        <Chevron size={16} className="text-texto-3" aria-hidden />
      </button>
      {abierto ? <div className="flex flex-col gap-3 px-[18px] pb-4">{children}</div> : null}
    </section>
  );
}

function Fila({
  titulo,
  detalle,
  cargando,
  alRestaurar,
}: {
  titulo: string;
  detalle: string;
  cargando: boolean;
  alRestaurar?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-separador pt-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium text-tinta">{titulo}</span>
        <span className="text-xs text-texto-3">{detalle}</span>
      </span>
      {alRestaurar ? (
        <Boton variante="secundario" icono={RotateCcw} cargando={cargando} onClick={alRestaurar}>
          Restaurar
        </Boton>
      ) : null}
    </div>
  );
}

/** Lotes y sitios archivados de un campo. */
export function Archivados({ archivados, alRestaurar }: { archivados: ListaArchivados; alRestaurar: () => void }) {
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = archivados.plots.length + archivados.sites.length;
  if (total === 0) return null;

  const volver = async (tipo: "sitio" | "lote", id: string) => {
    setTrabajando(id);
    setError(null);
    const r = await restaurar(tipo, id);
    setTrabajando(null);
    if (r.ok) alRestaurar();
    else setError(r.mensaje);
  };

  return (
    <Plegable titulo={`Archivados (${total})`}>
      <p className="text-[13px] text-texto-2">
        <ConAyuda que="archivados" texto={AYUDA.archivados}>
          Fuera de listas y mapa; los datos quedan guardados
        </ConAyuda>
      </p>
      <Aviso mensaje={error} />
      {archivados.plots.map((l) => (
        <Fila
          key={l.id}
          titulo={`Lote «${l.name}»`}
          detalle={`Archivado el ${mostrarFecha(l.archived_at)} · vuelven sus sitios`}
          cargando={trabajando === l.id}
          alRestaurar={() => void volver("lote", l.id)}
        />
      ))}
      {archivados.sites.map((s) => (
        <Fila
          key={s.id}
          titulo={`Sitio «${s.name}»`}
          detalle={
            s.plot_archived ? "Su lote está archivado: restaurá el lote" : `Archivado el ${mostrarFecha(s.archived_at)}`
          }
          cargando={trabajando === s.id}
          alRestaurar={s.plot_archived ? undefined : () => void volver("sitio", s.id)}
        />
      ))}
    </Plegable>
  );
}

/** Campos archivados que la persona puede restaurar (dueña o admin/staff). */
export function CamposArchivados({ alRestaurar }: { alRestaurar: () => void }) {
  const c = useConsulta(camposArchivados);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const campos = c.datos?.campos ?? [];
  if (campos.length === 0) return null;

  const volver = async (id: string) => {
    setTrabajando(id);
    setError(null);
    const r = await restaurar("campo", id);
    setTrabajando(null);
    if (!r.ok) return setError(r.mensaje);
    c.actualizar();
    alRestaurar();
  };

  return (
    <Plegable titulo={`Campos archivados (${campos.length})`}>
      <p className="text-[13px] text-texto-2">Al restaurar un campo vuelven los lotes y sitios que se archivaron con él.</p>
      <Aviso mensaje={error} />
      {campos.map((x) => (
        <Fila
          key={x.id}
          titulo={x.name}
          detalle={[x.province, `Archivado el ${mostrarFecha(x.archived_at)}`].filter(Boolean).join(" · ")}
          cargando={trabajando === x.id}
          alRestaurar={() => void volver(x.id)}
        />
      ))}
    </Plegable>
  );
}
