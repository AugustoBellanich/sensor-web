import {
  Clock3,
  CalendarDays,
  Download,
} from "lucide-react";

import type { ReadingC01, DeviceWithStatus } from "../../../types/sensor";

import C01EnvironmentalChart from "./C01EnvironmentalChart";

interface C01PanelProps {
  device: DeviceWithStatus;
  readings: ReadingC01[];
  latestReading: ReadingC01 | null;
  periodLabel: string;
}

export default function C01Panel({
  device,
  readings,
  latestReading,
  periodLabel,
}: C01PanelProps) {
  const formatLongDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Función para formatear la fecha a YYYY-MM-DD HH:MM (máxima resolución minutos)
  const formatShortDate = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day} ${hours}:${minutes}`;
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
   <Row><Cell><Data ss:Type="String">Ubicación / Actividad</Data></Cell><Cell><Data ss:Type="String">${device.activity || "N/D"}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Estado</Data></Cell><Cell><Data ss:Type="String">${device.status}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Batería</Data></Cell><Cell><Data ss:Type="String">${device.battery !== null ? device.battery + "%" : "N/D"}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Período Consultado</Data></Cell><Cell><Data ss:Type="String">${periodLabel}</Data></Cell></Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Datos">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Fecha y Hora</Data></Cell>
    <Cell><Data ss:Type="String">Temperatura del Aire (°C)</Data></Cell>
    <Cell><Data ss:Type="String">Humedad Relativa (%)</Data></Cell>
   </Row>`;

    readings.forEach((r) => {
      const fecha = formatShortDate(r.timestamp);
      // Guardamos como Number si existe, sino dejamos la celda vacía limpiamente
      const tempCell = r.air_temp !== null && r.air_temp !== undefined ? `<Cell><Data ss:Type="Number">${r.air_temp}</Data></Cell>` : `<Cell><Data ss:Type="String"></Data></Cell>`;
      const humCell = r.humidity !== null && r.humidity !== undefined ? `<Cell><Data ss:Type="Number">${r.humidity}</Data></Cell>` : `<Cell><Data ss:Type="String"></Data></Cell>`;

      excelXML += `
   <Row>
    <Cell><Data ss:Type="String">${fecha}</Data></Cell>
    ${tempCell}
    ${humCell}
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
    link.setAttribute("download", `sensor_climatico_${device.id}.xls`);
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-sm font-bold text-red-600">
                Temperatura del aire
              </p>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {latestReading.air_temp !== null
                  ? latestReading.air_temp.toFixed(1)
                  : "N/D"}
                <span className="text-xs font-normal text-slate-500 ml-1">°C</span>
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-sm font-bold text-blue-600">
                Humedad relativa
              </p>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {latestReading.humidity !== null
                  ? latestReading.humidity.toFixed(1)
                  : "N/D"}
                <span className="text-xs font-normal text-slate-500 ml-1">%</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Histórico de mediciones
            </h3>
            <p className="text-xs text-slate-500">
              Representación gráfica de la evolución ambiental.
            </p>
          </div>
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

      <C01EnvironmentalChart data={readings} periodLabel={periodLabel} />
    </div>
  );
}