// Marcar un punto en el mapa satelital (ubicación de un campo o de un sitio): un clic pone el pin y
// se puede arrastrar; "Usar mi ubicación" toma la del navegador si la persona lo permite. Se ven el
// perímetro y los lotes del campo, si los hay, y otros puntos (sitios) como referencia.
import L from "leaflet";
import { Crosshair } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { Boton } from "@/componentes/ui";

const CATAMARCA: [number, number] = [-28.47, -65.78];
const pin = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#0369a1;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export type Punto = { lat: number; lng: number };

function AlHacerClic({ alElegir }: { alElegir: (p: Punto) => void }) {
  useMapEvents({
    click: (e) => alElegir({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

/** Encuadra al abrir (todo lo que hay) y cuando se pide centrar (GPS). */
function Encuadrar({
  todo,
  centrar,
}: {
  todo: [number, number][];
  centrar: Punto | null;
}) {
  const mapa = useMap();
  useEffect(() => {
    if (todo.length > 1)
      mapa.fitBounds(L.latLngBounds(todo), { padding: [30, 30], maxZoom: 18 });
    else if (todo.length === 1) mapa.setView(todo[0], 16);
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (centrar)
      mapa.setView([centrar.lat, centrar.lng], Math.max(mapa.getZoom(), 16));
  }, [centrar, mapa]);
  return null;
}

export function UbicadorMapa({
  valor,
  alCambiar,
  referencias = [],
  otros = [],
  alto = 360,
}: {
  valor: Punto | null;
  alCambiar: (p: Punto) => void;
  referencias?: [number, number][][];
  /** Otros puntos para orientarse (por ejemplo, los sitios que ya hay). */
  otros?: { lat: number; lng: number; nombre: string }[];
  alto?: number;
}) {
  const [centrar, setCentrar] = useState<Punto | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const todo: [number, number][] = [
    ...(valor ? [[valor.lat, valor.lng] as [number, number]] : []),
    ...referencias.flat(),
    ...otros.map((o) => [o.lat, o.lng] as [number, number]),
  ];
  return (
    <div className="flex flex-col gap-2">
      <div
        className="overflow-hidden rounded-xl border border-linea"
        style={{ height: alto }}
      >
        <MapContainer
          center={todo[0] ?? CATAMARCA}
          zoom={todo.length ? 16 : 9}
          scrollWheelZoom
          className="h-full w-full cursor-crosshair bg-noche"
          aria-label="Mapa para marcar la ubicación"
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Imagen: Esri, Maxar, Earthstar Geographics"
            maxZoom={19}
          />
          <AlHacerClic alElegir={alCambiar} />
          <Encuadrar todo={todo} centrar={centrar} />
          {referencias.map((r, i) => (
            <Polygon
              key={i}
              positions={r}
              pathOptions={{ color: "#7dd3fc", weight: 1.5, fillOpacity: 0.08 }}
              interactive={false}
            />
          ))}
          {otros.map((o) => (
            <CircleMarker
              key={`${o.lat},${o.lng}`}
              center={[o.lat, o.lng]}
              radius={5}
              pathOptions={{
                color: "#ffffff",
                weight: 1.5,
                fillColor: "#94a3b8",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top">{o.nombre}</Tooltip>
            </CircleMarker>
          ))}
          {valor ? (
            <Marker
              position={[valor.lat, valor.lng]}
              icon={pin}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  alCambiar({ lat: p.lat, lng: p.lng });
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Boton
          type="button"
          variante="secundario"
          icono={Crosshair}
          cargando={buscando}
          onClick={() => {
            if (!navigator.geolocation)
              return setError("Este navegador no da la ubicación.");
            setBuscando(true);
            setError(null);
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setBuscando(false);
                const q = { lat: p.coords.latitude, lng: p.coords.longitude };
                alCambiar(q);
                setCentrar(q);
              },
              () => {
                setBuscando(false);
                setError(
                  "No se pudo tomar la ubicación: revisá el permiso del navegador o marcala en el mapa.",
                );
              },
              { enableHighAccuracy: true, timeout: 15000 },
            );
          }}
        >
          Usar mi ubicación
        </Boton>
        <span className="text-xs text-texto-3">
          {valor
            ? `${valor.lat.toFixed(6)}, ${valor.lng.toFixed(6)} · podés arrastrar el pin`
            : "Hacé clic en el mapa para marcarla."}
        </span>
      </div>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
