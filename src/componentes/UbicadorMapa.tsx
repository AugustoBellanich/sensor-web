// Marcar un punto en el mapa satelital (ubicación de un campo): un clic pone el pin y se puede
// arrastrar; "Usar mi ubicación" toma la del navegador si la persona lo permite. Se ven el
// perímetro y los lotes del campo, si los hay, como referencia.
import L from "leaflet";
import { Crosshair } from "lucide-react";
import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
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

function Centrar({ punto, zoom }: { punto: Punto | null; zoom: number }) {
  const mapa = useMap();
  useEffect(() => {
    if (punto)
      mapa.setView([punto.lat, punto.lng], Math.max(mapa.getZoom(), zoom));
    // Solo cuando se pide centrar (GPS o carga inicial).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punto?.lat, punto?.lng]);
  return null;
}

export function UbicadorMapa({
  valor,
  alCambiar,
  referencias = [],
  alto = 360,
}: {
  valor: Punto | null;
  alCambiar: (p: Punto) => void;
  referencias?: [number, number][][];
  alto?: number;
}) {
  const [centrar, setCentrar] = useState<Punto | null>(valor);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <div
        className="overflow-hidden rounded-xl border border-linea"
        style={{ height: alto }}
      >
        <MapContainer
          center={valor ? [valor.lat, valor.lng] : CATAMARCA}
          zoom={valor ? 15 : 9}
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
          <Centrar punto={centrar} zoom={15} />
          {referencias.map((r, i) => (
            <Polygon
              key={i}
              positions={r}
              pathOptions={{ color: "#7dd3fc", weight: 1.5, fillOpacity: 0.08 }}
              interactive={false}
            />
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
            ? `${valor.lat.toFixed(5)}, ${valor.lng.toFixed(5)} · podés arrastrar el pin`
            : "Hacé clic en el mapa para marcarla."}
        </span>
      </div>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
