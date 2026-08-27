import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Layers } from "lucide-react";

import type { DeviceWithStatus } from "../../types/sensor";

interface DevicesMapProps {
  devices: DeviceWithStatus[];
  selectedDevice: DeviceWithStatus | null;
  onSelectDevice: (device: DeviceWithStatus) => void;
}

const hasValidLocation = (
  device: DeviceWithStatus
): device is DeviceWithStatus & { lat: number; lng: number } =>
  typeof device.lat === "number" &&
  typeof device.lng === "number" &&
  Number.isFinite(device.lat) &&
  Number.isFinite(device.lng) &&
  !(device.lat === 0 && device.lng === 0);

const buildIcon = (type: string, isSelected: boolean) => {
  const t = (type || "S").toUpperCase();
  const firstLetter = t.charAt(0);
  const size = isSelected ? 40 : 32;

  let bgColor = "#2563eb"; 
  let ringColor = "#93c5fd";

  if (firstLetter === "C") {
    bgColor = "#d97706"; 
    ringColor = "#fcd34d";
  } else if (firstLetter === "N") {
    bgColor = "#0d9488"; 
    ringColor = "#5eead4";
  }

  const activeScale = isSelected ? "transform: scale(1.15); z-index: 1000;" : "";

  return L.divIcon({
    className: "custom-device-marker",
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; ${activeScale} transition: transform 0.2s;">
        <div style="
          position:absolute; inset:0; border-radius:9999px;
          background:${ringColor}; opacity:0.5;
          ${isSelected ? "animation: sensor-pulse 2s ease-out infinite;" : ""}
        "></div>
        <div style="
          position:absolute; inset:2px; border-radius:9999px;
          background:${bgColor}; border:2px solid #ffffff;
          box-shadow: 0 3px 8px rgba(15,23,42,0.4);
          display: flex; align-items: center; justify-content: center;
          color: #ffffff; font-weight: 700; font-size: ${size * 0.42}px;
          font-family: inherit;
        ">
          ${firstLetter}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function FitToDevices({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
  }, [map, points]);

  return null;
}

export default function DevicesMap({
  devices,
  selectedDevice,
  onSelectDevice,
}: DevicesMapProps) {
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets");

  const located = useMemo(() => devices.filter(hasValidLocation), [devices]);

  const points = useMemo<[number, number][]>(
    () => located.map((d) => [d.lat, d.lng]),
    [located]
  );

  const centroid = useMemo<[number, number]>(() => {
    if (points.length === 0) {
      return [-28.4696, -65.7852];
    }

    const [sumLat, sumLng] = points.reduce(
      ([accLat, accLng], [lat, lng]) => [accLat + lat, accLng + lng],
      [0, 0]
    );

    return [sumLat / points.length, sumLng / points.length];
  }, [points]);

  const unlocatedCount = devices.length - located.length;

  if (located.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center">
        <p className="text-sm text-slate-500">
          Ninguno de tus nodos tiene ubicación asignada todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative w-full flex-1 flex flex-col min-h-[500px] z-10">
      <style>{`
        @keyframes sensor-pulse {
          0% { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .custom-device-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container { font-family: inherit; width: 100%; height: 100%; z-index: 10; }
      `}</style>

      {/* Botón flotante para alternar entre Mapa Callejero y Satelital con z-index alto */}
      <div className="absolute top-3 right-3 z-[450] bg-white/95 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-md flex items-center gap-1">
        <button
          onClick={() => setMapType("streets")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            mapType === "streets" 
              ? "bg-blue-600 text-white shadow-xs" 
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Mapa
        </button>
        <button
          onClick={() => setMapType("satellite")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            mapType === "satellite" 
              ? "bg-blue-600 text-white shadow-xs" 
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Layers size={14} />
          Satelital
        </button>
      </div>

      <MapContainer
        center={centroid}
        zoom={15}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", flex: 1 }}
        attributionControl={false}
      >
        {mapType === "streets" ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
        )}

        <FitToDevices points={points} />

        {located.map((device) => (
          <Marker
            key={device.id}
            position={[device.lat, device.lng]}
            icon={buildIcon(device.type, device.id === selectedDevice?.id)}
            eventHandlers={{
              click: () => onSelectDevice(device),
            }}
          >
            <LeafletTooltip direction="top" offset={[0, -14]}>
              <span className="font-semibold">
                {device.alias || device.id} ({device.type})
              </span>
            </LeafletTooltip>
          </Marker>
        ))}
      </MapContainer>

      {unlocatedCount > 0 && (
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm text-xs text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 z-[450]">
          <MapPin size={14} className="text-amber-600" />
          {unlocatedCount} sin ubicación
        </div>
      )}
    </div>
  );
}