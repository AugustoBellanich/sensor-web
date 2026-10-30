// Dibujar sobre el mapa satelital (D-34), como en la app: un lote nuevo, redibujar un lote o el
// perímetro del campo (?perimetro=1). Un clic agrega una esquina; arrastrar una esquina la mueve;
// clic en una esquina la elige para borrarla. A la derecha, la superficie, los avisos y lo que se
// guarda: el lote lleva nombre y desde cuándo vale la forma (la anterior queda en el historial, o
// se reemplaza si es una corrección del dibujo); el perímetro no lleva historial.
import L from "leaflet";
import { Check, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { Barra, Contenido } from "@/componentes/Marco";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Segmento,
  Tarjeta,
  Titulo,
} from "@/componentes/ui";
import {
  anillo,
  crearLote,
  detalleCampo,
  perimetroCampo,
  redibujarLote,
  renombrarLote,
  textoHa,
  type DetalleCampo,
} from "@/datos/campos";
import {
  aGeoJson,
  areaHa,
  dentro,
  desdeGeoJson,
  seCruza,
  type Punto,
} from "@/datos/geo";
import { fechaHoraArg } from "@/datos/grafico";
import { fechaArgHoy } from "@/datos/riego";
import { useConsulta } from "@/datos/useConsulta";

const CATAMARCA: [number, number] = [-28.47, -65.78];
const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const esquina = (elegida: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${elegida ? "#f97316" : "#ffffff"};border:2px solid ${elegida ? "#ffffff" : "#0369a1"};box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
const aLatLng = (p: Punto): [number, number] => [p.latitude, p.longitude];

export function DibujarLote() {
  const { campo: campoId = "" } = useParams();
  const [q] = useSearchParams();
  const esPerimetro = q.get("perimetro") === "1";
  const loteId = esPerimetro ? null : q.get("lote");
  const c = useConsulta(useCallback(() => detalleCampo(campoId), [campoId]));
  const k = c.datos?.campo ?? null;
  const lote = loteId ? (k?.plots.find((l) => l.id === loteId) ?? null) : null;
  const titulo = esPerimetro
    ? "Perímetro del campo"
    : lote
      ? `Redibujar ${lote.name}`
      : "Nuevo lote";
  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          { texto: k?.name ?? "Campo", a: `/campo/${campoId}` },
          ...(lote
            ? [{ texto: lote.name, a: `/campo/${campoId}/lote/${lote.id}` }]
            : []),
          {
            texto: esPerimetro
              ? "Perímetro"
              : lote
                ? "Redibujar"
                : "Nuevo lote",
          },
        ]}
      />
      <Contenido>
        <Aviso mensaje={c.error} />
        {c.cargando && !k ? <Cargando /> : null}
        {k && !k.can_edit ? (
          <Aviso
            tipo="aviso"
            mensaje="Solo el dueño y los editores del campo dibujan lotes."
          />
        ) : null}
        {k && k.can_edit && (!loteId || lote) ? (
          <>
            <Titulo
              titulo={titulo}
              datos="Clic en el mapa: agrega una esquina. Arrastrar una esquina: la mueve. Clic en una esquina: la elige para borrarla."
            />
            <Editor campo={k} loteId={loteId} esPerimetro={esPerimetro} />
          </>
        ) : null}
      </Contenido>
    </>
  );
}

function AlHacerClic({ alClic }: { alClic: (p: Punto) => void }) {
  useMapEvents({
    click: (e) => alClic({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  return null;
}

function Encuadrar({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap();
  useEffect(() => {
    if (puntos.length > 1)
      mapa.fitBounds(L.latLngBounds(puntos), {
        padding: [40, 40],
        maxZoom: 18,
      });
    else if (puntos.length === 1) mapa.setView(puntos[0], 17);
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Editor({
  campo,
  loteId,
  esPerimetro,
}: {
  campo: DetalleCampo;
  loteId: string | null;
  esPerimetro: boolean;
}) {
  const navegar = useNavigate();
  const lote = loteId
    ? (campo.plots.find((l) => l.id === loteId) ?? null)
    : null;
  const [puntos, setPuntos] = useState<Punto[]>(() =>
    desdeGeoJson(esPerimetro ? campo.boundary : lote?.boundary),
  );
  const [elegido, setElegido] = useState<number | null>(null);
  const [nombre, setNombre] = useState(lote?.name ?? "");
  const [tipo, setTipo] = useState<"cambio" | "correccion">("cambio");
  const [desde, setDesde] = useState(fechaArgHoy());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const area = areaHa(puntos);
  const cruzado = seCruza(puntos);
  const otros = esPerimetro
    ? campo.plots
    : campo.plots.filter((l) => l.id !== loteId);
  const fueraDelCampo =
    !esPerimetro &&
    !!campo.boundary &&
    puntos.length >= 3 &&
    puntos.some((p) => !dentro(p, desdeGeoJson(campo.boundary)));
  const encuadre = useMemo(() => {
    const todo = [
      ...puntos.map(aLatLng),
      ...(campo.boundary ? anillo(campo.boundary) : []),
      ...campo.plots.flatMap((l) => (l.boundary ? anillo(l.boundary) : [])),
    ];
    if (!todo.length && campo.lat != null && campo.lng != null)
      todo.push([campo.lat, campo.lng]);
    return todo;
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar() {
    setError(null);
    if (puntos.length < 3) return setError("Marcá al menos tres esquinas.");
    if (cruzado)
      return setError("Dos lados se cruzan: mové o borrá una esquina.");
    setGuardando(true);
    const forma = aGeoJson(puntos);
    if (esPerimetro) {
      const r = await perimetroCampo(campo.id, forma);
      setGuardando(false);
      if (!r.ok) return setError(r.mensaje);
      return navegar(`/campo/${campo.id}`);
    }
    if (lote) {
      if (nombre.trim() && nombre.trim() !== lote.name) {
        const n = await renombrarLote(lote.id, nombre);
        if (!n.ok) {
          setGuardando(false);
          return setError(n.mensaje);
        }
      }
      const f = tipo === "correccion" ? lote.shape_since : desde;
      if (!f) {
        setGuardando(false);
        return setError("Elegí una fecha válida.");
      }
      const r = await redibujarLote(lote.id, forma, f);
      setGuardando(false);
      if (!r.ok) return setError(r.mensaje);
      return navegar(`/campo/${campo.id}/lote/${lote.id}`);
    }
    const r = await crearLote(campo.id, nombre, forma, desde);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    navegar(`/campo/${campo.id}/lote/${r.id}`);
  }

  async function borrarPerimetro() {
    setGuardando(true);
    const r = await perimetroCampo(campo.id, null);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    navegar(`/campo/${campo.id}`);
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-[3_1_560px]">
        <div
          className="overflow-hidden rounded-xl border border-linea"
          style={{ height: "min(70vh, 640px)" }}
        >
          <MapContainer
            center={encuadre[0] ?? CATAMARCA}
            zoom={encuadre.length ? 16 : 9}
            scrollWheelZoom
            doubleClickZoom={false}
            className="h-full w-full cursor-crosshair bg-noche"
            aria-label="Mapa para dibujar"
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Imagen: Esri, Maxar, Earthstar Geographics"
              maxZoom={19}
            />
            <Encuadrar puntos={encuadre} />
            <AlHacerClic
              alClic={(p) => {
                setElegido(null);
                setPuntos((x) => [...x, p]);
              }}
            />
            {!esPerimetro && campo.boundary ? (
              <Polygon
                positions={anillo(campo.boundary)}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1.5,
                  dashArray: "6 6",
                  fillOpacity: 0,
                }}
                interactive={false}
              />
            ) : null}
            {otros.map((l) =>
              l.boundary ? (
                <Polygon
                  key={l.id}
                  positions={anillo(l.boundary)}
                  pathOptions={{
                    color: "#94a3b8",
                    weight: 1,
                    fillColor: "#94a3b8",
                    fillOpacity: 0.12,
                  }}
                  interactive={false}
                />
              ) : null,
            )}
            {puntos.length >= 3 ? (
              <Polygon
                positions={puntos.map(aLatLng)}
                pathOptions={{
                  color: cruzado ? "#ef4444" : "#38bdf8",
                  weight: 2,
                  fillColor: cruzado ? "#ef4444" : "#38bdf8",
                  fillOpacity: 0.18,
                }}
                interactive={false}
              />
            ) : puntos.length === 2 ? (
              <Polyline
                positions={puntos.map(aLatLng)}
                pathOptions={{ color: "#38bdf8", weight: 2 }}
                interactive={false}
              />
            ) : null}
            {puntos.map((p, i) => (
              <Marker
                key={i}
                position={aLatLng(p)}
                icon={esquina(elegido === i)}
                draggable
                eventHandlers={{
                  click: () => setElegido(elegido === i ? null : i),
                  dragend: (e) => {
                    const ll = (e.target as L.Marker).getLatLng();
                    setPuntos((x) =>
                      x.map((y, j) =>
                        j === i ? { latitude: ll.lat, longitude: ll.lng } : y,
                      ),
                    );
                  },
                }}
              />
            ))}
          </MapContainer>
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-[84px]">
        <Tarjeta
          titulo={textoHa(area)}
          derecha={
            <span className="text-xs text-texto-3">
              {puntos.length === 1 ? "1 esquina" : `${puntos.length} esquinas`}
            </span>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Boton
              type="button"
              variante="secundario"
              icono={Trash2}
              disabled={elegido == null}
              onClick={() => {
                if (elegido == null) return;
                setPuntos((x) => x.filter((_, j) => j !== elegido));
                setElegido(null);
              }}
            >
              Borrar esquina
            </Boton>
            <Boton
              type="button"
              variante="secundario"
              icono={Undo2}
              disabled={!puntos.length}
              onClick={() => {
                setPuntos((x) => x.slice(0, -1));
                setElegido(null);
              }}
            >
              Deshacer
            </Boton>
            <Boton
              type="button"
              variante="texto"
              disabled={!puntos.length}
              onClick={() => {
                setPuntos([]);
                setElegido(null);
              }}
            >
              Empezar de nuevo
            </Boton>
          </div>
          {cruzado ? (
            <div className="mt-3">
              <Aviso mensaje="Dos lados se cruzan: la base no lo acepta. Mové o borrá una esquina." />
            </div>
          ) : null}
          {fueraDelCampo ? (
            <div className="mt-3">
              <Aviso
                tipo="aviso"
                mensaje="Parte del lote queda fuera del perímetro del campo. Se puede guardar, pero revisá el dibujo."
              />
            </div>
          ) : null}
        </Tarjeta>
        {!esPerimetro ? (
          <Tarjeta titulo="Datos del lote">
            <div className="flex flex-col gap-4">
              <Campo
                etiqueta="Nombre del lote"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej.: Lote 3, Cuadro norte"
              />
              {lote ? (
                <Segmento
                  etiqueta="Qué pasó"
                  opciones={
                    [
                      { valor: "cambio", texto: "El lote cambió" },
                      { valor: "correccion", texto: "Corrijo el dibujo" },
                    ] as const
                  }
                  valor={tipo}
                  alCambiar={setTipo}
                />
              ) : null}
              {lote && tipo === "correccion" ? (
                <p className="text-[13px] text-texto-2">
                  Se reemplaza la forma vigente
                  {lote.shape_since
                    ? ` (desde el ${fecha(lote.shape_since)})`
                    : ""}{" "}
                  sin guardar la anterior. Usalo para arreglar un dibujo mal
                  hecho.
                </p>
              ) : (
                <Campo
                  etiqueta={
                    lote ? "La forma nueva vale desde" : "Vigente desde"
                  }
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  ayuda={
                    lote
                      ? "La forma anterior queda guardada hasta ese día."
                      : "Ej.: inicio de campaña."
                  }
                />
              )}
            </div>
          </Tarjeta>
        ) : null}
        <Aviso mensaje={error} />
        <div className="flex flex-wrap gap-2">
          <Boton
            icono={Check}
            cargando={guardando}
            disabled={
              puntos.length < 3 ||
              cruzado ||
              (!esPerimetro && !lote && !nombre.trim())
            }
            onClick={guardar}
          >
            {esPerimetro
              ? "Guardar perímetro"
              : lote
                ? "Guardar lote"
                : "Crear lote"}
          </Boton>
          <Boton variante="secundario" onClick={() => navegar(-1)}>
            Cancelar
          </Boton>
          {esPerimetro && campo.boundary ? (
            <Boton variante="texto" icono={Trash2} onClick={borrarPerimetro}>
              Borrar el perímetro
            </Boton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
