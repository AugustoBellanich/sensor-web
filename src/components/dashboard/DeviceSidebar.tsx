import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sprout,
  Sun,
  Droplets,
  Wifi,
  Radio,
  MapPin,
  Building2,
} from "lucide-react";
import type { DeviceWithStatus } from "../../types/sensor";

interface DeviceSidebarProps {
  devices: DeviceWithStatus[];
  selectedDevice: DeviceWithStatus | null;
  selectedFarm: string | null;
  loading: boolean;
  errorMsg: string;
  onSelectDevice: (device: DeviceWithStatus) => void;
  onRefresh: () => void;
  onSelectFarm?: (farmName: string) => void;
}

export default function DeviceSidebar({
  devices,
  selectedDevice,
  selectedFarm,
  loading,
  errorMsg,
  onSelectDevice,
  onRefresh,
  onSelectFarm,
}: DeviceSidebarProps) {
  const groupedDevices = useMemo(() => {
    const groups: Record<string, DeviceWithStatus[]> = {};
    devices.forEach((device) => {
      const farm = device.name_farm || "Sin establecimiento asignado";
      if (!groups[farm]) {
        groups[farm] = [];
      }
      groups[farm].push(device);
    });
    return groups;
  }, [devices]);

  const farmNames = useMemo(() => Object.keys(groupedDevices), [groupedDevices]);

  // Estado para controlar qué pestañas abre el usuario manualmente
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Cada vez que cambia el establecimiento activo (selectedFarm), 
  // aseguramos que SOLO ese esté abierto y el resto colapsados automáticamente.
  useEffect(() => {
    if (!selectedFarm) return;
    const newCollapsedState: Record<string, boolean> = {};
    farmNames.forEach((farm) => {
      newCollapsedState[farm] = farm !== selectedFarm; // true (cerrado) si no es el activo, false (abierto) si es el activo
    });
    setCollapsedGroups(newCollapsedState);
  }, [selectedFarm, farmNames]);

  const toggleGroup = (farmName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [farmName]: !prev[farmName],
    }));
  };

  const getDeviceCategoryMeta = (type: string) => {
    const t = type.toUpperCase();
    if (t.startsWith("B")) {
      return {
        label: "Suelo",
        color: "bg-blue-500/10 text-blue-300 border-blue-500/20",
        icon: <Sprout size={12} className="text-blue-300" />,
      };
    }
    if (t.startsWith("C")) {
      return {
        label: "Clima",
        color: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        icon: <Sun size={12} className="text-amber-300" />,
      };
    }
    if (t.startsWith("A")) {
      return {
        label: "Agua",
        color: "bg-sky-500/10 text-sky-300 border-sky-500/20",
        icon: <Droplets size={12} className="text-sky-300" />,
      };
    }
    if (t.startsWith("N")) {
      return {
        label: "Antena",
        color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        icon: <Wifi size={12} className="text-emerald-300" />,
      };
    }
    return {
      label: "Sensor",
      color: "bg-slate-500/10 text-slate-300 border-slate-500/20",
      icon: <Radio size={12} className="text-slate-300" />,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
            style={{ boxShadow: "0 0 6px 1px rgba(52,211,153,0.7)" }}
            title="Online"
          />
        );
      case "warning":
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Advertencia" />;
      default:
        return <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Offline" />;
    }
  };

  const getBatteryColor = (battery: number | null | undefined) => {
    if (battery === null || battery === undefined) return "text-slate-500";
    if (battery <= 20) return "text-rose-400";
    if (battery <= 50) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <aside
      className="w-80 m-3 mb-3 flex flex-col rounded-2xl border border-slate-800 shadow-2xl shadow-black/50 overflow-hidden self-stretch"
      style={{ backgroundColor: "#0b0f19" }}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0b0f19] shrink-0">
        <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Radio size={13} className="text-sky-400" />
          Dispositivos ({devices.length})
        </h2>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-400 border border-slate-700 transition-colors"
          title="Actualizar lista"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* LISTA */}
      <div className="p-3 space-y-3">
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 text-rose-300 text-xs rounded-xl border border-rose-500/20">
            {errorMsg}
          </div>
        )}

        {!loading && devices.length === 0 && !errorMsg && (
          <p className="text-center text-slate-500 text-xs py-8">
            No hay dispositivos asignados a tu cuenta.
          </p>
        )}

        {Object.entries(groupedDevices).map(([farmName, farmDevices]) => {
          const isCollapsed = collapsedGroups[farmName] ?? (farmName !== selectedFarm);
          const isFarmFocused = selectedFarm === farmName && selectedDevice === null;

          return (
            <div key={farmName} className="space-y-1.5">
              {/* Barra de Establecimiento */}
              <div
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${
                  isFarmFocused
                    ? "bg-sky-600/20 text-sky-200 border-sky-400/40 shadow-md"
                    : "bg-slate-900/90 text-slate-200 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                }`}
                style={
                  isFarmFocused
                    ? { boxShadow: "0 0 0 1px rgba(56,189,248,0.2), 0 0 16px -4px rgba(56,189,248,0.4)" }
                    : undefined
                }
              >
                <button
                  onClick={() => toggleGroup(farmName)}
                  className="flex-1 flex items-center space-x-2 text-left truncate pr-2 transition-colors group"
                >
                  <Building2 size={14} className={isFarmFocused ? "text-sky-400 shrink-0" : "text-slate-400 shrink-0 group-hover:text-slate-300"} />
                  <span className="truncate flex-1">
                    {farmName} <span className="text-[10px] opacity-70">({farmDevices.length})</span>
                  </span>
                  {isCollapsed ? (
                    <ChevronRight size={14} className="shrink-0 ml-1 text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="shrink-0 ml-1 text-slate-400" />
                  )}
                </button>

                {/* Botón GPS del establecimiento */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectFarm) onSelectFarm(farmName);
                  }}
                  className={`p-1.5 rounded-lg transition-all ml-1 ${
                    isFarmFocused
                      ? "text-sky-200 bg-sky-500/30 border border-sky-400/40"
                      : "text-slate-400 hover:text-sky-300 hover:bg-slate-800 border border-transparent"
                  }`}
                  title={`Ver mapa general de ${farmName}`}
                >
                  <MapPin size={14} />
                </button>
              </div>

              {/* Sensores hijos */}
              {!isCollapsed && (
                <div className="space-y-2 pl-2 border-l-2 border-slate-800 ml-3 py-1">
                  {farmDevices.map((device) => {
                    const isSelected = selectedDevice?.id === device.id;
                    const meta = getDeviceCategoryMeta(device.type);

                    return (
                      <div
                        key={device.id}
                        onClick={() => onSelectDevice(device)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-sky-500/10 border-sky-400/40 shadow-sm"
                            : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                        style={
                          isSelected
                            ? { boxShadow: "0 0 20px -6px rgba(56,189,248,0.4)" }
                            : undefined
                        }
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-semibold text-slate-100 text-sm truncate pr-2">
                            {device.alias || device.id}
                          </span>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold shrink-0 ${meta.color}`}
                          >
                            {meta.icon}
                            {meta.label}
                          </span>
                        </div>

                        {device.activity && (
                          <p className="text-xs text-slate-400 mb-2 truncate">
                            {device.activity}
                          </p>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                          <div className="flex items-center space-x-1.5">
                            {getStatusBadge(device.status)}
                            <span className="text-[11px] text-slate-400 capitalize">
                              {device.status}
                            </span>
                          </div>

                          <span
                            className={`font-mono text-[11px] ${getBatteryColor(device.battery)}`}
                          >
                            {device.battery !== null && device.battery !== undefined
                              ? `${device.battery}%`
                              : "--"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}