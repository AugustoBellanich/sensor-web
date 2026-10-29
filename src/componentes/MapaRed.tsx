// Mapa de la red: imagen satelital (Esri, sin clave ni costo) con cada sitio como un nodo del
// color de la familia de su equipo; gris si el sitio no tiene equipo. Tocar un nodo muestra una
// tarjeta con el sitio y su estado. Encuadra todos los sitios al abrir.
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, ZoomControl } from "react-leaflet";

import { familiaDeModelo, FAMILIAS } from "@/datos/familias";
import type { SitioVisible } from "@/datos/sitios";

const CATAMARCA: [number, number] = [-28.47, -65.78];

function Encuadrar({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap();
  const clave = puntos.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (!puntos.length) return;
    if (puntos.length === 1) mapa.setView(puntos[0], 16);
    else mapa.fitBounds(L.latLngBounds(puntos), { padding: [48, 48], maxZoom: 17 });
    // Solo cuando cambian los sitios, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, mapa]);
  return null;
}

export function MapaRed({ sitios, elegido, alElegir }: { sitios: SitioVisible[]; elegido: string | null; alElegir: (id: string | null) => void }) {
  const puntos = useMemo(() => sitios.map((s) => [s.lat, s.lng] as [number, number]), [sitios]);
  return (
    <MapContainer
      center={CATAMARCA}
      zoom={8}
      scrollWheelZoom={false}
      className="h-full min-h-[420px] w-full bg-noche"
      attributionControl
      zoomControl={false}
      aria-label="Mapa de los sitios"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Imagen: Esri, Maxar, Earthstar Geographics"
        maxZoom={19}
      />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
      {/* Arriba a la derecha: arriba a la izquierda van los conteos por familia. */}
      <ZoomControl position="topright" />
      <Encuadrar puntos={puntos} />
      {sitios.map((s) => {
        const color = s.device_type ? FAMILIAS[familiaDeModelo(s.device_type)].noche : "#94a3b8";
        const activo = s.site_id === elegido;
        return (
          <CircleMarker
            key={s.site_id}
            center={[s.lat, s.lng]}
            radius={activo ? 10 : 7}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 1 }}
            eventHandlers={{ click: () => alElegir(activo ? null : s.site_id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {s.site_name}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
