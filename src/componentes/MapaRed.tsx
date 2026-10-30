// Mapa general: imagen satelital (Esri, sin clave ni costo) con cada sitio como una marca con el
// ícono de su familia y el dato de ahora; alrededor de cada receptor, su radio de recepción.
// Tocar una marca elige el sitio. Encuadra todos los sitios al abrir.
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap, ZoomControl } from "react-leaflet";

import { marcaSitio, RADIO_RECEPTOR_M } from "@/componentes/marcas";
import { familiaDeModelo } from "@/datos/familias";
import type { SitioVisible } from "@/datos/sitios";

const CATAMARCA: [number, number] = [-28.47, -65.78];

function Encuadrar({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap();
  const clave = puntos.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (!puntos.length) return;
    if (puntos.length === 1) mapa.setView(puntos[0], 16);
    else mapa.fitBounds(L.latLngBounds(puntos), { padding: [60, 60], maxZoom: 17 });
    // Solo cuando cambian los sitios, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, mapa]);
  return null;
}

export function MapaRed({
  sitios,
  elegido,
  alElegir,
  datos,
}: {
  sitios: SitioVisible[];
  elegido: string | null;
  alElegir: (id: string | null) => void;
  /** Dato de ahora por sitio ("52 %", "23,6 °C"). */
  datos?: Map<string, string>;
}) {
  const puntos = useMemo(() => sitios.map((s) => [s.lat, s.lng] as [number, number]), [sitios]);
  return (
    <MapContainer center={CATAMARCA} zoom={8} scrollWheelZoom className="h-full min-h-[420px] w-full bg-noche" attributionControl zoomControl={false} aria-label="Mapa de los sitios">
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Imagen: Esri, Maxar, Earthstar Geographics" maxZoom={19} />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
      <ZoomControl position="topright" />
      <Encuadrar puntos={puntos} />
      {sitios
        .filter((s) => s.device_type === "N01")
        .map((s) => (
          <Circle
            key={`r-${s.site_id}`}
            center={[s.lat, s.lng]}
            radius={RADIO_RECEPTOR_M}
            pathOptions={{ color: "#c4b5fd", weight: 1.2, dashArray: "5 6", fillColor: "#a78bfa", fillOpacity: 0.07 }}
            interactive={false}
          />
        ))}
      {sitios.map((s) => {
        const activo = s.site_id === elegido;
        const familia = s.device_type ? familiaDeModelo(s.device_type) : null;
        return (
          <Marker
            key={s.site_id}
            position={[s.lat, s.lng]}
            icon={marcaSitio(familia, datos?.get(s.site_id) ?? null, activo)}
            zIndexOffset={activo ? 1000 : 0}
            eventHandlers={{ click: () => alElegir(activo ? null : s.site_id) }}
          >
            <Tooltip direction="top" offset={[0, -16]}>
              {s.site_name}
              {s.device_type === "N01" ? ` · recibe a unos ${RADIO_RECEPTOR_M} m` : ""}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
