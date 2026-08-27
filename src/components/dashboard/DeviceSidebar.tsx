import { useState, useMemo } from "react";
import { 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Sprout, 
  Sun, 
  Droplets, 
  Wifi, 
  Radio,
  MapPin
} from "lucide-react";
import type { DeviceWithStatus } from "../../types/sensor";

interface DeviceSidebarProps {
  devices: DeviceWithStatus[];
  selectedDevice: DeviceWithStatus | null;
  selectedFarm: string | null; // <-- Recibimos la finca activa
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (farmName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [farmName]: !prev[farmName]
    }));
  };

  const groupedDevices = useMemo(() => {
    const groups: Record<string, DeviceWithStatus[]> = {};
    devices.forEach(device => {
      const farm = device.name_farm || "Sin establecimiento asignado";
      if (!groups[farm]) {
        groups[farm] = [];
      }
      groups[farm].push(device);
    });
    return groups;
  }, [devices]);

  const getDeviceCategoryMeta = (type: string) => {
    const t = type.toUpperCase();
    if (t.startsWith("B")) {
      return { 
        label: "Suelo", 
        color: "bg-blue-100 text-blue-950 border-blue-900 font-bold", 
        icon: <Sprout size={13} className="text-blue-900 inline-block mr-1" /> 
      };
    }
    if (t.startsWith("C")) {
      return { 
        label: "Clima", 
        color: "bg-amber-100 text-amber-950 border-amber-800 font-bold", 
        icon: <Sun size={13} className="text-amber-900 inline-block mr-1" /> 
      };
    }
    if (t.startsWith("A")) {
      return { 
        label: "Agua", 
        color: "bg-sky-100 text-sky-950 border-sky-800 font-bold", 
        icon: <Droplets size={13} className="text-sky-900 inline-block mr-1" /> 
      };
    }
    if (t.startsWith("N")) {
      return { 
        label: "Antena", 
        color: "bg-emerald-100 text-emerald-950 border-emerald-800 font-bold", 
        icon: <Wifi size={13} className="text-emerald-900 inline-block mr-1" /> 
      };
    }
    return { 
      label: "Sensor", 
      color: "bg-slate-100 text-slate-900 border-slate-700 font-bold", 
      icon: <Radio size={13} className="text-slate-800 inline-block mr-1" /> 
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />;
      case "warning":
        return <span className="w-2 h-2 rounded-full bg-amber-500" title="Advertencia" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-rose-500" title="Offline" />;
    }
  };

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Dispositivos ({devices.length})
        </h2>
        <button
          onClick={onRefresh}
          className="text-slate-500 hover:text-blue-600 p-1 rounded transition-colors"
          title="Actualizar lista"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {errorMsg}
          </div>
        )}

        {!loading && devices.length === 0 && !errorMsg && (
          <p className="text-center text-slate-400 text-xs py-8">
            No hay dispositivos asignados a tu cuenta.
          </p>
        )}

        {Object.entries(groupedDevices).map(([farmName, farmDevices]) => {
          const isCollapsed = collapsedGroups[farmName];
          // Detecta si este establecimiento es el que tiene el foco activo general (sin sensor individual seleccionado)
          const isFarmFocused = selectedFarm === farmName && selectedDevice === null;

          return (
            <div key={farmName} className="space-y-1.5">
              <div className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                isFarmFocused 
                  ? "bg-blue-100/80 text-blue-900 border border-blue-300 shadow-xs" 
                  : "bg-slate-100/60 text-slate-600 hover:bg-slate-100"
              }`}>
                <button
                  onClick={() => toggleGroup(farmName)}
                  className="flex-1 flex items-center justify-between text-left truncate pr-2 transition-colors"
                >
                  <span className="truncate">{farmName} ({farmDevices.length})</span>
                  {isCollapsed ? <ChevronRight size={14} className="shrink-0 ml-1" /> : <ChevronDown size={14} className="shrink-0 ml-1" />}
                </button>

                {/* Botón GPS del establecimiento */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectFarm) onSelectFarm(farmName);
                  }}
                  className={`p-1 rounded-md transition-all ${
                    isFarmFocused ? "text-blue-700 bg-white shadow-xs" : "text-slate-400 hover:text-blue-600 hover:bg-white"
                  }`}
                  title={`Ver mapa general de ${farmName}`}
                >
                  <MapPin size={14} />
                </button>
              </div>

              {!isCollapsed && (
                <div className="space-y-2 pl-1">
                  {farmDevices.map((device) => {
                    const isSelected = selectedDevice?.id === device.id;
                    const meta = getDeviceCategoryMeta(device.type);

                    return (
                      <div
                        key={device.id}
                        onClick={() => onSelectDevice(device)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50/70 border-blue-300 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-semibold text-slate-800 text-sm truncate pr-2">
                            {device.alias || device.id}
                          </span>

                          <span className={`text-[10px] px-2 py-0.5 rounded-md border-[1.5px] flex items-center shrink-0 shadow-2xs ${meta.color}`}>
                            {meta.icon}
                            {meta.label}
                          </span>
                        </div>

                        {device.activity && (
                          <p className="text-xs text-slate-500 mb-2 truncate">
                            {device.activity}
                          </p>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                          <div className="flex items-center space-x-1.5">
                            {getStatusBadge(device.status)}
                            <span className="text-[11px] text-slate-500 capitalize">{device.status}</span>
                          </div>

                          <span className="text-slate-400 font-mono">
                            {device.battery !== null && device.battery !== undefined
                              ? `${device.battery}% 🔋`
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