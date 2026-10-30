// Crear un campo o editar sus datos, como en la app (Nuevo campo, Editar campo y Ubicación): nombre,
// descripción, provincia y departamento, la ubicación marcada en el mapa y, para admin y staff, la
// marca "del proyecto" (D-37). Los lotes y el perímetro se dibujan en la app.
import { FileText, MapPin, Save, Tractor } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { Barra, Contenido } from "@/componentes/Marco";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Tarjeta,
  Titulo,
} from "@/componentes/ui";
import { UbicadorMapa, type Punto } from "@/componentes/UbicadorMapa";
import {
  anillo,
  crearCampo,
  detalleCampo,
  editarCampo,
  marcarDelProyecto,
  type DetalleCampo,
} from "@/datos/campos";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";
import { useSesion } from "@/sesion/SesionContexto";

export function NuevoCampo() {
  return (
    <>
      <Barra
        migas={[{ texto: "Campos", a: "/campos" }, { texto: "Nuevo campo" }]}
      />
      <Contenido ancho={1080}>
        <Titulo
          titulo="Nuevo campo"
          datos="Después se dibujan el perímetro, los lotes y los sitios."
        />
        <Formulario campo={null} />
      </Contenido>
    </>
  );
}

export function EditarCampo() {
  const { id = "" } = useParams();
  const c = useConsulta(useCallback(() => detalleCampo(id), [id]));
  const k = c.datos?.campo ?? null;
  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          { texto: k?.name ?? "Campo", a: `/campo/${id}` },
          { texto: "Editar" },
        ]}
      />
      <Contenido ancho={1080}>
        <Aviso mensaje={c.error} />
        {c.cargando && !k ? <Cargando /> : null}
        {k && !k.can_edit ? (
          <Aviso
            tipo="aviso"
            mensaje="Solo el dueño y los editores del campo lo cambian."
          />
        ) : null}
        {k && k.can_edit ? (
          <>
            <Titulo titulo={`Editar · ${k.name}`} />
            <Formulario campo={k} />
          </>
        ) : null}
      </Contenido>
    </>
  );
}

function Formulario({ campo }: { campo: DetalleCampo | null }) {
  const navegar = useNavigate();
  const { esAdmin } = useSesion();
  const [nombre, setNombre] = useState(campo?.name ?? "");
  const [descripcion, setDescripcion] = useState(campo?.description ?? "");
  const [provincia, setProvincia] = useState(campo?.province ?? "");
  const [departamento, setDepartamento] = useState(campo?.department ?? "");
  const [punto, setPunto] = useState<Punto | null>(
    campo?.lat != null && campo.lng != null
      ? { lat: campo.lat, lng: campo.lng }
      : null,
  );
  const [delProyecto, setDelProyecto] = useState(campo?.is_project ?? false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const referencias = campo
    ? [
        ...(campo.boundary ? [anillo(campo.boundary)] : []),
        ...campo.plots.filter((l) => l.boundary).map((l) => anillo(l.boundary)),
      ]
    : [];

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!nombre.trim()) return setError("Escribí un nombre.");
    setError(null);
    setGuardando(true);
    if (!campo) {
      const r = await crearCampo(nombre, descripcion, punto);
      setGuardando(false);
      if (!r.ok) return setError(r.mensaje);
      return navegar(`/campo/${r.id}`, { replace: true });
    }
    const r = await editarCampo(campo.id, {
      name: nombre.trim(),
      description: descripcion.trim() || null,
      province: provincia.trim() || null,
      department: departamento.trim() || null,
      ...(punto ? { lat: punto.lat, lng: punto.lng } : {}),
    });
    if (r.ok && esAdmin && delProyecto !== campo.is_project) {
      const m = await marcarDelProyecto("establishment", campo.id, delProyecto);
      if (!m.ok) {
        setGuardando(false);
        return setError(m.mensaje);
      }
    }
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    navegar(`/campo/${campo.id}`);
  }

  return (
    <form onSubmit={guardar} className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
        <Tarjeta titulo="Datos">
          <div className="flex flex-col gap-4">
            <Campo
              etiqueta="Nombre"
              icono={Tractor}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Finca El Alto"
            />
            <Campo
              etiqueta="Descripción (opcional)"
              icono={FileText}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Productor, localidad, cultivo principal…"
            />
            {campo ? (
              <>
                <Campo
                  etiqueta="Provincia"
                  icono={MapPin}
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                />
                <Campo
                  etiqueta="Departamento"
                  icono={MapPin}
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                />
              </>
            ) : null}
            {campo && esAdmin ? (
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-tinta">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#0369a1]"
                  checked={delProyecto}
                  onChange={(e) => setDelProyecto(e.target.checked)}
                />
                Campo del proyecto (lo ven todos los del equipo del proyecto)
              </label>
            ) : null}
          </div>
        </Tarjeta>
        <Aviso mensaje={error} />
        <div className="flex gap-2">
          <Boton type="submit" icono={Save} cargando={guardando}>
            {campo ? "Guardar" : "Crear campo"}
          </Boton>
          <Boton
            type="button"
            variante="secundario"
            onClick={() => navegar(-1)}
          >
            Cancelar
          </Boton>
        </div>
      </div>
      <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-4">
        <Tarjeta
          titulo={
            <ConAyuda que="ubicación" texto={AYUDA.ubicacionCampo}>
              Ubicación (opcional)
            </ConAyuda>
          }
        >
          <UbicadorMapa
            valor={punto}
            alCambiar={setPunto}
            referencias={referencias}
          />
        </Tarjeta>
      </div>
    </form>
  );
}
