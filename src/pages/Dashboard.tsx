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

import { LogOut, Radio, RefreshCw, Menu, X } from "lucide-react";

// Importación de nuestros componentes modulares
import DeviceSidebar from "../components/dashboard/DeviceSidebar";
import PeriodSelector from "../components/dashboard/PeriodSelector";
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
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Estado para mostrar/ocultar el sidebar (responsive y control manual en PC)
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

  // Funciones de Fecha
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

  // Carga de Dispositivos
  const loadDevices = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const data = await deviceService.getDevices();
      setDevices(data);
      if (data.length > 0) {
        setSelectedDevice((current) =>
          current ? data.find((d) => d.id === current.id) || data[0] : data[0],
        );
      } else {
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

  // Carga de Datos del Sensor
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
        {/* Izquierda: Botón Menú / Ocultar Sidebar + Logos */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title={sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
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

        {/* Centro: Título principal */}
        <div className="hidden md:flex flex-col items-center">
          <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase text-slate-200">
            Panel de Monitoreo y Análisis
          </h2>
          <p className="text-[11px] text-slate-400 tracking-wide">
            Red de Sensores IoT Agroambientales - INTA EEA Catamarca
          </p>
        </div>

        {/* Derecha: Usuario y Salir */}
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
        {/* Backdrop para móviles cuando el sidebar está abierto */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Panel Lateral con soporte para colapsar en PC y ocultar/flotar en móvil */}
        <div
          className={`absolute md:relative z-30 inset-y-0 left-0 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
          }`}
        >
          <DeviceSidebar
            devices={devices}
            selectedDevice={selectedDevice}
            loading={loading}
            errorMsg={errorMsg}
            onSelectDevice={(device) => {
              setSelectedDevice(device);
              // En pantallas móviles, al elegir un sensor se oculta el menú automáticamente
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            onRefresh={loadDevices}
          />
        </div>

        <main className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto space-y-6">
          <PeriodSelector
            period={period}
            setPeriod={setPeriod}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
          />

          {loadingData ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <RefreshCw
                className="animate-spin text-blue-600 mb-3"
                size={32}
              />
              <p className="text-sm text-slate-600">
                Cargando registros históricos...
              </p>
            </div>
          ) : selectedDevice ? (
            <>
              {/* Resumen del dispositivo activo */}
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

              {/* Paneles Dinámicos */}
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
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="bg-slate-200 p-4 rounded-full text-slate-500 mb-3">
                <Radio size={32} />
              </div>
              <h3 className="text-base font-semibold text-slate-700">
                Ningún sensor seleccionado
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Selecciona un nodo de la lista lateral para ver sus registros
                y tendencias.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}