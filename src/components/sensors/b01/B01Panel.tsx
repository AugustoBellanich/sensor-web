import { useState } from "react";
import {
  Clock3,
  CalendarDays,
  Download,
} from "lucide-react";

import type {
  ReadingB01,
  DeviceElectrode,
  DeviceWithStatus,
} from "../../../types/sensor";

import ElectrodeConfiguration from "./ElectrodeConfiguration";
import B01SoilMoistureChart from "./B01SoilMoistureChart";
import B01SoilTemperatureChart from "./B01SoilTemperatureChart";

interface B01PanelProps {
  device: DeviceWithStatus;
  readings: ReadingB01[];
  latestReading: ReadingB01 | null;
  electrodes: DeviceElectrode[];
  periodLabel: string;
}

export type B01Variable = "hv" | "hg" | "mv";

export default function B01Panel({
  device,
  readings,
  latestReading,
  electrodes,
  periodLabel,
}: B01PanelProps) {
  const [varType, setVarType] = useState<B01Variable>("hv");

  const formatLongDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatShortDate = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

 const handleDownloadExcel = () => {
    let excelXML = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Metadata">
  <Table>
   <Row><Cell><Data ss:Type="String">Parámetro</Data></Cell><Cell><Data ss:Type="String">Valor</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">ID del Nodo</Data></Cell><Cell><Data ss:Type="String">${device.id}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Alias</Data></Cell><Cell><Data ss:Type="String">${device.alias || "N/D"}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Tipo de Sensor</Data></Cell><Cell><Data ss:Type="String">${device.type}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Establecimiento</Data></Cell><Cell><Data ss:Type="String">${device.name_farm || "Sin asignar"}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Actividad / Lote</Data></Cell><Cell><Data ss:Type="String">${device.activity || "N/D"}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Estado</Data></Cell><Cell><Data ss:Type="String">${device.status}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Batería</Data></Cell><Cell><Data ss:Type="String">${device.battery !== null ? device.battery + "%" : "N/D"}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Período Consultado</Data></Cell><Cell><Data ss:Type="String">${periodLabel}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">CONFIGURACIÓN DE ELECTRODOS</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Índice</Data></Cell><Cell><Data ss:Type="String">Profundidad (cm)</Data></Cell><Cell><Data ss:Type="String">Textura</Data></Cell></Row>`;

    electrodes.forEach((el) => {
      excelXML += `
   <Row>
    <Cell><Data ss:Type="String">Electrodo ${el.electrode_index}</Data></Cell>
    <Cell><Data ss:Type="String">${el.depth ?? "N/D"}</Data></Cell>
    <Cell><Data ss:Type="String">${el.texture ?? "N/D"}</Data></Cell>
   </Row>`;
    });

    excelXML += `
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Datos">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Fecha y Hora</Data></Cell>
    <Cell><Data ss:Type="String">Temperatura Suelo (°C)</Data></Cell>
    <Cell><Data ss:Type="String">E1 Volumétrica (%)</Data></Cell>
    <Cell><Data ss:Type="String">E1 Gravimétrica (%)</Data></Cell>
    <Cell><Data ss:Type="String">E1 Milivoltios (mV)</Data></Cell>
    <Cell><Data ss:Type="String">E2 Volumétrica (%)</Data></Cell>
    <Cell><Data ss:Type="String">E2 Gravimétrica (%)</Data></Cell>
    <Cell><Data ss:Type="String">E2 Milivoltios (mV)</Data></Cell>
    <Cell><Data ss:Type="String">E3 Volumétrica (%)</Data></Cell>
    <Cell><Data ss:Type="String">E3 Gravimétrica (%)</Data></Cell>
    <Cell><Data ss:Type="String">E3 Milivoltios (mV)</Data></Cell>
   </Row>`;

    const numCell = (val: number | null | undefined) =>
      val !== null && val !== undefined
        ? `<Cell><Data ss:Type="Number">${val}</Data></Cell>`
        : `<Cell><Data ss:Type="String"></Data></Cell>`;

    readings.forEach((r) => {
      excelXML += `
   <Row>
    <Cell><Data ss:Type="String">${formatShortDate(r.timestamp)}</Data></Cell>
    ${numCell(r.soil_temp)}
    ${numCell(r.e1_hv)}
    ${numCell(r.e1_hg)}
    ${numCell(r.e1_mv)}
    ${numCell(r.e2_hv)}
    ${numCell(r.e2_hg)}
    ${numCell(r.e2_mv)}
    ${numCell(r.e3_hv)}
    ${numCell(r.e3_hg)}
    ${numCell(r.e3_mv)}
   </Row>`;
    });

    excelXML += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([excelXML], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sensor_suelo_${device.id}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full text-left">
      {latestReading && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Última medición disponible
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {formatLongDate(latestReading.timestamp)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3].map((index) => {
              const key = `e${index}_${varType}` as keyof ReadingB01;
              const value = latestReading[key];
              const electrode = electrodes.find((el) => el.electrode_index === index);

              return (
                <div key={index} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-sm font-bold text-blue-600">Electrodo {index}</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {typeof value === "number" ? value.toFixed(varType === "mv" ? 0 : 1) : "N/D"}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      {varType === "mv" ? "mV" : "%"}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {electrode?.depth !== null && electrode?.depth !== undefined
                      ? `${electrode.depth} cm`
                      : "Profundidad N/D"}
                    {electrode?.texture ? ` · ${electrode.texture}` : ""}
                  </p>
                </div>
              );
            })}

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-sm font-bold text-red-600">Temperatura</p>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {latestReading.soil_temp !== null ? latestReading.soil_temp.toFixed(1) : "N/D"}
                <span className="text-xs font-normal text-slate-500 ml-1">°C</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Suelo</p>
            </div>
          </div>
        </div>
      )}

      <ElectrodeConfiguration electrodes={electrodes} />

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Histórico de mediciones</h3>
            <p className="text-xs text-slate-400">{periodLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setVarType("hv")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                varType === "hv" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Volumétrica (% HV)
            </button>
            <button
              type="button"
              onClick={() => setVarType("hg")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                varType === "hg" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Gravimétrica (% HG)
            </button>
            <button
              type="button"
              onClick={() => setVarType("mv")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                varType === "mv" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Milivoltios (mV)
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            title="Descargar archivo Excel con solapas independientes"
          >
            <Download size={14} />
            Exportar a Excel (.xls)
          </button>
        </div>
      </div>

      <B01SoilMoistureChart data={readings} electrodes={electrodes} b01VarType={varType} periodLabel={periodLabel} />
      <B01SoilTemperatureChart data={readings} periodLabel={periodLabel} />
    </div>
  );
}