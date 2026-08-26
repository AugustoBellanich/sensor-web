import { Layers } from "lucide-react";
import type { DeviceElectrode } from "../../../types/sensor";

interface ElectrodeConfigurationProps {
  electrodes: DeviceElectrode[];
}

export default function ElectrodeConfiguration({
  electrodes,
}: ElectrodeConfigurationProps) {
  if (electrodes.length === 0) return null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={18} className="text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Configuración de electrodos y suelo
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {electrodes.map((electrode) => (
          <div
            key={electrode.id}
            className="bg-slate-50 p-3 rounded-xl border border-slate-100"
          >
            <p className="text-sm font-bold text-blue-600">
              Electrodo {electrode.electrode_index}
            </p>
            <p className="text-sm text-slate-700 mt-1">
              Profundidad:{" "}
              <span className="font-semibold">
                {electrode.depth !== null && electrode.depth !== undefined
                  ? `${electrode.depth} cm`
                  : "N/D"}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Textura:{" "}
              <span className="font-medium">
                {electrode.texture || "No especificada"}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
