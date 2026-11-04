// Aviso de la app para Android en prueba cerrada de Google Play (D-99): una franja debajo de la barra
// noche con los tres pasos para sumarse como tester (grupo de Google, activar la prueba, instalar).
// Se cierra y no vuelve en ese navegador (localStorage, que puede fallar: entonces vuelve a aparecer).
import { Smartphone, X } from "lucide-react";
import { useState } from "react";

const ENLACES_APP = {
  grupo: "https://groups.google.com/g/sensorapp-testers",
  prueba: "https://play.google.com/apps/testing/com.inta.sensorapp",
  play: "https://play.google.com/store/apps/details?id=com.inta.sensorapp",
} as const;

const CLAVE = "aviso-app-prueba-cerrado";

function leerCerrado(): boolean {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}

export function AvisoApp() {
  const [cerrado, setCerrado] = useState(leerCerrado);
  if (cerrado) return null;
  function cerrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {
      // sin almacenamiento: se cierra solo hasta recargar
    }
    setCerrado(true);
  }
  const enlace = "font-medium text-acento-oscuro underline-offset-2 hover:underline";
  return (
    <div role="status" className="flex items-start gap-2.5 border-b border-linea bg-[#f0f9ff] px-5 py-2 text-[13px] text-texto lg:px-7">
      <Smartphone size={16} className="mt-px shrink-0 text-acento-oscuro" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-medium text-tinta">SensorApp para Android, en prueba.</span> Para instalarla, con la cuenta de
        Google del teléfono: 1){" "}
        <a className={enlace} href={ENLACES_APP.grupo} target="_blank" rel="noopener noreferrer">
          unite al grupo de testers
        </a>
        , 2){" "}
        <a className={enlace} href={ENLACES_APP.prueba} target="_blank" rel="noopener noreferrer">
          activá la prueba
        </a>{" "}
        y 3){" "}
        <a className={enlace} href={ENLACES_APP.play} target="_blank" rel="noopener noreferrer">
          instalá desde Google Play
        </a>
        . En la app se entra con esta misma cuenta de SENSOR.
      </p>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar el aviso de la app"
        title="Cerrar"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-texto-3 hover:bg-black/5 hover:text-tinta"
      >
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}
