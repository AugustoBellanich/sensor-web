import { RefreshCw } from "lucide-react";
import type { DeviceWithStatus } from "../../types/sensor";

interface DeviceSidebarProps {
  devices: DeviceWithStatus[];
  selectedDevice: DeviceWithStatus | null;
  loading: boolean;
  errorMsg: string;
  onSelectDevice: (device: DeviceWithStatus) => void;
  onRefresh: () => void;
}

export default function DeviceSidebar({
  devices,
  selectedDevice,
  loading,
  errorMsg,
  onSelectDevice,
  onRefresh,
}: DeviceSidebarProps) {
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <span className="flex items-center text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Online
          </span>
        );
      case "warning":
        return (
          <span className="flex items-center text-xs text-amber-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
            Advertencia
          </span>
        );
      default:
        return (
          <span className="flex items-center text-xs text-rose-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
            Offline
          </span>
        );
    }
  };

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Dispositivos Permitidos ({devices.length})
        </h2>
        <button
          onClick={onRefresh}
          className="text-slate-500 hover:text-blue-600 p-1 rounded transition-colors"
          title="Actualizar lista"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

        {devices.map((device) => {
          const isSelected = selectedDevice?.id === device.id;
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
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-800 text-sm">
                  {device.alias || device.id}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">
                  {device.type}
                </span>
              </div>

              {device.name_farm && (
                <p className="text-xs text-slate-500 mb-2 truncate">
                  {device.name_farm}
                  {device.activity ? ` · ${device.activity}` : ""}
                </p>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                {getStatusBadge(device.status)}
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
    </aside>
  );
}