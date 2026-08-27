import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { deviceService } from "../services/deviceService";
import { readingsService } from "../services/readingsService";
import { electrodeService } from "../services/electrodeService";

import type {
  DeviceWithStatus,
  ReadingB01,
  ReadingC01,
  DeviceElectrode,
} from "../types/sensor";

import { LogOut, RefreshCw, Menu, X, Building2 } from "lucide-react";

// Importación de nuestros componentes modulares
import DeviceSidebar from "../components/dashboard/DeviceSidebar";
import PeriodSelector from "../components/dashboard/PeriodSelector";
import DevicesMap from "../components/dashboard/DevicesMap";
import B01Panel from "../components/sensors/b01/B01Panel";
import C01Panel from "../components/sensors/c01/C01Panel";

export type PeriodType =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "3months"
  | "custom";

export default function Dashboard() {
  const { user, signOut } = useAuth();

  // Estados Globales
  const [devices, setDevices] = useState<DeviceWithStatus[]>([]);
  
  // Establecimiento activo por defecto
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  
  // Sensor seleccionado individualmente
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithStatus | null>(
    null,
  );
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Estados de Datos del Sensor
  const [readingsB01, setReadingsB01] = useState<ReadingB01[]>([]);
  const [readingsC01, setReadingsC01] = useState<ReadingC01[]>([]);
  const [electrodes, setElectrodes] = useState<DeviceElectrode[]>([]);
  const [latestB01, setLatestB01] = useState<ReadingB01 | null>(null);
  const [latestC01, setLatestC01] = useState<ReadingC01 | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Estados de Filtro Temporal
  const [period, setPeriod] = useState<PeriodType>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const startOfLocalDayISO = (date: Date): string => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  const endOfLocalDayISO = (date: Date): string => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };

  const getDateRange = useMemo(() => {
    const now = new Date();
    let fromDate: Date = new Date(now);
    let toDate: Date = new Date(now);

    switch (period) {
      case "today":
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        fromDate.setDate(fromDate.getDate() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(fromDate);
        toDate.setHours(23, 59, 59, 999);
        break;
      case "7days":
        fromDate.setDate(fromDate.getDate() - 6);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      case "30days":
        fromDate.setDate(fromDate.getDate() - 29);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      case "3months":
        fromDate.setMonth(fromDate.getMonth() - 3);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (customFrom) {
          const [year, month, day] = customFrom.split("-").map(Number);
          fromDate = new Date(year, month - 1, day);
        } else {
          fromDate.setHours(0, 0, 0, 0);
        }
        if (customTo) {
          const [year, month, day] = customTo.split("-").map(Number);
          toDate = new Date(year, month - 1, day);
        } else {
          toDate = new Date(now);
        }
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
    }

    return {
      from: startOfLocalDayISO(fromDate),
      to: endOfLocalDayISO(toDate),
    };
  }, [period, customFrom, customTo]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case "today":
        return "Hoy";
      case "yesterday":
        return "Ayer";
      case "7days":
        return "Últimos 7 días";
      case "30days":
        return "Últimos 30 días";
      case "3months":
        return "Últimos 3 meses";
      case "custom":
        return "Período personalizado";
    }
  }, [period]);

  const devicesByFarm = useMemo(() => {
    const groups: Record<string, DeviceWithStatus[]> = {};
    devices.forEach(device => {
      const farm = device.name_farm || "Sin establecimiento asignado";
      if (!groups[farm]) groups[farm] = [];
      groups[farm].push(device);
    });
    return groups;
  }, [devices]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const data = await deviceService.getDevices();
      setDevices(data);
      
      if (data.length > 0) {
        const groups: Record<string, DeviceWithStatus[]> = {};
        data.forEach(d => {
          const farm = d.name_farm || "Sin establecimiento asignado";
          if (!groups[farm]) groups[farm] = [];
          groups[farm].push(d);
        });

        const farmNames = Object.keys(groups);
        if (farmNames.length > 0) {
          setSelectedFarm(farmNames[0]);
        }
        setSelectedDevice(null);
      } else {
        setSelectedFarm(null);
        setSelectedDevice(null);
      }
    } catch (err: any) {
      setErrorMsg(
        "Error al cargar los nodos sensores: " +
          (err?.message || "Error desconocido"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;

    const fetchDeviceData = async () => {
      setLoadingData(true);
      try {
        if (selectedDevice.type === "B01") {
          const [readings, electrodeData, latest] = await Promise.all([
            readingsService.getB01Readings(
              selectedDevice.id,
              getDateRange.from,
              getDateRange.to,
            ),
            electrodeService.getElectrodesForDevice(selectedDevice.id),
            readingsService.getLatestB01Reading(selectedDevice.id),
          ]);
          setReadingsB01(readings);
          setElectrodes(electrodeData);
          setLatestB01(latest);
          setReadingsC01([]);
          setLatestC01(null);
        } else if (selectedDevice.type === "C01") {
          const [readings, latest] = await Promise.all([
            readingsService.getC01Readings(
              selectedDevice.id,
              getDateRange.from,
              getDateRange.to,
            ),
            readingsService.getLatestC01Reading(selectedDevice.id),
          ]);
          setReadingsC01(readings);
          setLatestC01(latest);
          setReadingsB01([]);
          setElectrodes([]);
          setLatestB01(null);
        }
      } catch (err) {
        console.error("Error cargando datos del sensor:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDeviceData();
  }, [selectedDevice, getDateRange.from, getDateRange.to]);

  const currentFarmDevices = useMemo(() => {
    if (!selectedFarm) return devices;
    return devicesByFarm[selectedFarm] || devices;
  }, [selectedFarm, devicesByFarm, devices]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <style>{`
        @keyframes pulse-ring-header {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        .header-node-pulse {
          animation: pulse-ring-header 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
      `}</style>

      {/* HEADER: Color oscuro puro idéntico al panel lateral (#0b0f19 sin gradientes claros) */}
      <header
        className="text-white px-4 sm:px-6 py-3.5 flex justify-between items-center shadow-2xl relative overflow-hidden border-b border-slate-800 z-20 shrink-0"
        style={{ backgroundColor: "#0b0f19" }}
      >
        {/* Izquierda: Menú y logos institucionales */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-sky-400 transition-all border border-slate-800 shadow-inner"
            title={sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex items-center space-x-3">
            <img
              src="/branding/logo-inta.svg"
              alt="INTA"
              className="h-8 sm:h-10 object-contain filter brightness-0 invert"
            />
            <div className="border-l border-slate-800 pl-3 sm:pl-4 relative">
              {/* Contenedor relativo del isologotipo para colocar el punto exacto en la "O" */}
              <div className="relative inline-block">
                <img
                  src="/branding/isologotipo.svg"
                  alt="Sensor Web"
                  className="h-8 sm:h-9 w-auto object-contain filter brightness-0 invert"
                />
                {/* Nodo neón posicionado exactamente en el centro del círculo de la letra "O" */}
                <span 
                  className="absolute pointer-events-none"
                  style={{ top: "46%", left: "74%" }}
                >
                  <span className="absolute block w-4.5 h-4.5 -ml-[0px] -mt-[0px] rounded-full bg-sky-400/30 border border-sky-400/60 header-node-pulse" />
                  <span 
                    className="absolute block w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-sky-400" 
                    style={{ boxShadow: "0 0 10px 2px rgba(56,189,248,0.9)" }}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Centro: Título descriptivo */}
        <div className="hidden lg:flex flex-col items-center">
          <h2 className="text-sm font-bold tracking-wider uppercase text-slate-100">
            Panel de Monitoreo y Análisis
          </h2>
          <p className="text-[11px] text-sky-400/80 font-mono tracking-wide">
            RED DE SENSORES IOT · INTA EEA CATAMARCA
          </p>
        </div>

        {/* Derecha: Usuario y salida */}
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-300 hidden xl:inline font-medium">
            {user?.email}
          </span>
          <button
            onClick={signOut}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-200 hover:text-rose-300 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-slate-800 hover:border-rose-900/50 shadow-sm"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`absolute md:relative z-40 inset-y-0 left-0 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
          }`}
        >
          <DeviceSidebar
            devices={devices}
            selectedDevice={selectedDevice}
            selectedFarm={selectedFarm}
            loading={loading}
            errorMsg={errorMsg}
            onSelectDevice={(device) => {
              setSelectedDevice(device);
              if (device.name_farm) {
                setSelectedFarm(device.name_farm);
              }
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            onRefresh={loadDevices}
            onSelectFarm={(farmName) => {
              setSelectedFarm(farmName);
              setSelectedDevice(null);
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
          />
        </div>

        {/* Contenedor principal */}
        <main className="flex-1 bg-slate-100 p-4 sm:p-6 flex flex-col space-y-4">
          {!selectedDevice && !loading && devices.length > 0 && (
            <div className="flex flex-col space-y-3">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-800">
                      {selectedFarm || "Establecimiento General"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Visualizando red de nodos sensores geolocalizados del establecimiento.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                  {currentFarmDevices.length}{" "}
                  {currentFarmDevices.length === 1 ? "nodo activo" : "nodos activos"}
                </span>
              </div>

              <div className="flex flex-col">
                <DevicesMap
                  devices={currentFarmDevices}
                  selectedDevice={selectedDevice}
                  onSelectDevice={(device) => {
                    setSelectedDevice(device);
                    if (device.name_farm) setSelectedFarm(device.name_farm);
                  }}
                />
              </div>
            </div>
          )}

          {loadingData ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1 min-h-[400px]">
              <RefreshCw
                className="animate-spin text-blue-600 mb-3"
                size={32}
              />
              <p className="text-sm text-slate-600">
                Cargando registros históricos...
              </p>
            </div>
          ) : selectedDevice ? (
            <div className="flex flex-col space-y-4">
              <div className="shrink-0">
                <PeriodSelector
                  period={period}
                  setPeriod={setPeriod}
                  customFrom={customFrom}
                  setCustomFrom={setCustomFrom}
                  customTo={customTo}
                  setCustomTo={setCustomTo}
                />
              </div>

              <div className="flex justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Establecimiento:
                  </span>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    {selectedDevice.name_farm || "Sin asignar"}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  ← Volver a vista general del establecimiento
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-800">
                      {selectedDevice.alias || selectedDevice.id}
                    </h2>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-semibold">
                      {selectedDevice.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    ID: <span className="font-mono">{selectedDevice.id}</span>
                    {" · "}
                    {selectedDevice.name_farm || "Sin finca asignada"}
                    {selectedDevice.activity
                      ? ` · ${selectedDevice.activity}`
                      : ""}
                  </p>
                </div>
              </div>

              {selectedDevice.type === "B01" && (
                <B01Panel
                  device={selectedDevice}
                  readings={readingsB01}
                  latestReading={latestB01}
                  electrodes={electrodes}
                  periodLabel={periodLabel}
                />
              )}

              {selectedDevice.type === "C01" && (
                <C01Panel
                  device={selectedDevice}
                  readings={readingsC01}
                  latestReading={latestC01}
                  periodLabel={periodLabel}
                />
              )}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}