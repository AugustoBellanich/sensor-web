// Mapa satelital de un campo o un lote: perímetro, lotes (polígonos con su nombre) y sitios con el
// ícono de su familia y el dato de ahora; el radio de recepción de cada receptor. Encuadra todo.
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useNavigate } from "react-router";

import { marcaSitio, RADIO_RECEPTOR_M } from "@/componentes/marcas";
import type { Familia } from "@/datos/familias";

const CATAMARCA: [number, number] = [-28.47, -65.78];

export type PoligonoMapa = { id: string; puntos: [number, number][]; nombre?: string; a?: string; perimetro?: boolean };
export type PuntoMapa = { id: string; lat: number; lng: number; familia: Familia | null; nombre: string; a?: string; dato?: string | null };

function Encuadrar({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap();
  const clave = puntos.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (!puntos.length) return;
    if (puntos.length === 1) mapa.setView(puntos[0], 17);
    else mapa.fitBounds(L.latLngBounds(puntos), { padding: [36, 36], maxZoom: 18 });
    // Solo cuando cambia lo que hay que mostrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, mapa]);
  return null;
}

export function MapaCampo({ poligonos, puntos, alto = 460, etiqueta }: { poligonos: PoligonoMapa[]; puntos: PuntoMapa[]; alto?: number; etiqueta: string }) {
  const navegar = useNavigate();
  const todo = useMemo(() => [...poligonos.flatMap((p) => p.puntos), ...puntos.map((p) => [p.lat, p.lng] as [number, number])], [poligonos, puntos]);
  return (
    <div className="overflow-hidden rounded-xl border border-linea" style={{ height: alto }}>
      <MapContainer center={CATAMARCA} zoom={13} scrollWheelZoom className="h-full w-full bg-noche" aria-label={etiqueta}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Imagen: Esri, Maxar, Earthstar Geographics"
          maxZoom={19}
        />
        <Encuadrar puntos={todo} />
        {poligonos.map((p) => (
          <Polygon
            key={p.id}
            positions={p.puntos}
            pathOptions={
              p.perimetro
                ? { color: "#ffffff", weight: 1.5, dashArray: "6 6", fillOpacity: 0 }
                : { color: "#7dd3fc", weight: 1.5, fillColor: "#38bdf8", fillOpacity: 0.1 }
            }
            eventHandlers={p.a ? { click: () => navegar(p.a!) } : undefined}
          >
            {p.nombre ? (
              <Tooltip permanent direction="center" className="etiqueta-lote">
                {p.nombre}
              </Tooltip>
            ) : null}
          </Polygon>
        ))}
        {puntos
          .filter((p) => p.familia === "gateway")
          .map((p) => (
            <Circle
              key={`r-${p.id}`}
              center={[p.lat, p.lng]}
              radius={RADIO_RECEPTOR_M}
              pathOptions={{ color: "#c4b5fd", weight: 1.2, dashArray: "5 6", fillColor: "#a78bfa", fillOpacity: 0.07 }}
              interactive={false}
            />
          ))}
        {puntos.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={marcaSitio(p.familia, p.dato ?? null)} eventHandlers={p.a ? { click: () => navegar(p.a!) } : undefined}>
            <Tooltip direction="top" offset={[0, -16]}>
              {p.nombre}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
