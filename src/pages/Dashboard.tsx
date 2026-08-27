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
    devices.forEach((device) => {
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
        data.forEach((d) => {
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
      <header
        className="text-white px-4 sm:px-6 py-3 flex justify-between items-center shadow-lg relative overflow-hidden border-b border-slate-800 z-20"
        style={{
          backgroundColor: "#0b0f19",
          backgroundImage: `
            radial-gradient(circle at 20% 150%, rgba(37, 99, 235, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% -50%, rgba(20, 83, 112, 0.43) 0%, transparent 50%)
          `,
        }}
      >
        <div className="flex items-center space-x-3 sm:space-x-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title={
              sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"
            }
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex items-center space-x-3 sm:space-x-6">
            <img
              src="/branding/logo-inta.svg"
              alt="INTA"
              className="h-10 sm:h-12 object-contain filter brightness-0 invert"
            />
            <div className="border-l border-slate-800 pl-4 sm:pl-6 hidden sm:block">
              <img
                src="/branding/isologotipo-blanco.svg"
                alt="Isotipo Sensor Web"
                className="h-10 w-auto object-contain filter brightness-0 invert"
              />
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center">
          <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase text-slate-200">
            Panel de Monitoreo y Análisis
          </h2>
          <p className="text-[11px] text-slate-400 tracking-wide">
            Red de Sensores IoT Agroambientales - INTA EEA Catamarca
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-300 hidden lg:inline">
            {user?.email}
          </span>
          <button
            onClick={signOut}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-700"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
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
              setSelectedDevice(null); // Al hacer clic en el GPS del establecimiento, pasamos a su vista general de mapa
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
          />
        </div>

        {/* Contenedor principal que se extiende y ocupa todo el alto disponible */}
        <main className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto flex flex-col space-y-6">
          <PeriodSelector
            period={period}
            setPeriod={setPeriod}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
          />

          {!selectedDevice && !loading && devices.length > 0 && (
            <div className="flex-1 flex flex-col space-y-4 min-h-[500px]">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      {selectedFarm || "Establecimiento General"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Visualizando red de nodos sensores geolocalizados del
                      establecimiento.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                  {currentFarmDevices.length}{" "}
                  {currentFarmDevices.length === 1
                    ? "nodo activo"
                    : "nodos activos"}
                </span>
              </div>

              <div className="flex-1 flex flex-col">
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
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1">
              <RefreshCw
                className="animate-spin text-blue-600 mb-3"
                size={32}
              />
              <p className="text-sm text-slate-600">
                Cargando registros históricos...
              </p>
            </div>
          ) : selectedDevice ? (
            <div className="flex flex-col space-y-6">
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
                  readings={readingsB01}
                  latestReading={latestB01}
                  electrodes={electrodes}
                  periodLabel={periodLabel}
                />
              )}

              {selectedDevice.type === "C01" && (
                <C01Panel
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
