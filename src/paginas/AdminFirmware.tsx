// Administración → Firmware (D-92): subir el .bin que exporta Arduino IDE para que la app lo mande
// a los equipos por Bluetooth, y pasar a estable lo probado en banco. De cada modelo y canal quedan
// los archivos de las 2 últimas versiones; las anteriores quedan como historial.
import { FileUp, Rocket, Upload } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { Aviso, Boton, Campo, Cargando, Segmento, Tarjeta } from "@/componentes/ui";
import {
  listarVersiones,
  publicarEstable,
  revisarBinario,
  sha256Hex,
  subirVersion,
  type Binario,
  type Canal,
  type VersionFirmware,
} from "@/datos/firmware";
import { fechaHoraArg } from "@/datos/grafico";
import { useConsulta } from "@/datos/useConsulta";

const kb = (n: number) => `${Math.round(n / 1024).toLocaleString("es-AR")} KB`;
/** "2026-11-02T15:04…" → "02/11/2026 12:04" (hora argentina). */
const fecha = (t: string) => {
  const [dia, hora] = fechaHoraArg(t).replace("T", " ").split(" ");
  return `${dia.split("-").reverse().join("/")} ${(hora ?? "").slice(0, 5)}`;
};

type Archivo = { nombre: string; bytes: Uint8Array; revision: Binario; sha: string };

export function AdminFirmware() {
  const c = useConsulta(listarVersiones);
  const versiones = c.datos?.versiones ?? [];
  const modelos = [...new Set(versiones.map((v) => v.model))];
  return (
    <div className="mt-4 flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-[1_1_380px] lg:max-w-[440px]">
        <Subir alSubir={c.actualizar} />
      </div>
      <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-4">
        <Aviso mensaje={c.error} />
        {c.cargando && !c.datos ? <Cargando texto="Leyendo las versiones…" /> : null}
        {c.datos && !versiones.length ? (
          <p className="text-[13px] text-texto-2">Todavía no hay versiones subidas.</p>
        ) : null}
        {modelos.map((m) => (
          <Modelo key={m} modelo={m} versiones={versiones.filter((v) => v.model === m)} alCambiar={c.actualizar} />
        ))}
      </div>
    </div>
  );
}

function Subir({ alSubir }: { alSubir: () => void }) {
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  const [canal, setCanal] = useState<Canal>("banco");
  const [notas, setNotas] = useState("");
  const [reemplazar, setReemplazar] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "error" | "bien"; mensaje: string } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function elegir(f: File | undefined) {
    setAviso(null);
    if (!f) return setArchivo(null);
    const bytes = new Uint8Array(await f.arrayBuffer());
    setArchivo({ nombre: f.name, bytes, revision: revisarBinario(bytes), sha: await sha256Hex(bytes) });
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (!archivo?.revision.valido) return;
    setTrabajando(true);
    const r = await subirVersion(archivo.bytes, archivo.revision, canal, notas, reemplazar && canal === "banco");
    setTrabajando(false);
    if (!r.ok) return setAviso({ tipo: "error", mensaje: r.mensaje });
    setAviso({
      tipo: "bien",
      mensaje: `${archivo.revision.version} subida (${canal}).${r.borradas ? ` Se borraron ${r.borradas} archivos viejos.` : ""}`,
    });
    setArchivo(null);
    setNotas("");
    setReemplazar(false);
    if (entrada.current) entrada.current.value = "";
    alSubir();
  }

  return (
    <Tarjeta titulo="Subir versión">
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <p className="text-[13px] text-texto-2">
          El .bin de Programa → Exportar binario compilado, en Arduino IDE. Se guardan las 2 últimas de cada modelo y canal.
        </p>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-linea px-3 py-3 text-[13px] text-texto-2 hover:border-acento-oscuro">
          <FileUp size={16} strokeWidth={1.9} aria-hidden />
          <span className="min-w-0 flex-1 truncate">{archivo ? archivo.nombre : "Elegir archivo .bin"}</span>
          <input
            ref={entrada}
            type="file"
            accept=".bin,application/octet-stream"
            className="sr-only"
            onChange={(e) => void elegir(e.target.files?.[0])}
          />
        </label>
        {archivo ? (
          archivo.revision.valido ? (
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-[13px]">
              <dt className="text-texto-3">Versión</dt>
              <dd className="font-mono text-tinta">{archivo.revision.version}</dd>
              <dt className="text-texto-3">Tamaño</dt>
              <dd className="text-tinta">{kb(archivo.bytes.length)}</dd>
              <dt className="text-texto-3">SHA-256</dt>
              <dd className="truncate font-mono text-texto-2" title={archivo.sha}>
                {archivo.sha.slice(0, 16)}…
              </dd>
            </dl>
          ) : (
            <Aviso mensaje={archivo.revision.problema} />
          )
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11.5px] font-medium text-texto-3">Canal</span>
          <Segmento
            etiqueta="Canal"
            opciones={[
              { valor: "banco" as const, texto: "Banco (solo admin)" },
              { valor: "estable" as const, texto: "Estable (todos)" },
            ]}
            valor={canal}
            alCambiar={setCanal}
          />
        </div>
        <Campo etiqueta="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} />
        {canal === "banco" ? (
          <label className="flex items-center gap-2 text-[13px] text-texto-2">
            <input type="checkbox" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} />
            Reemplazar si esa versión ya está subida
          </label>
        ) : null}
        {aviso ? <Aviso tipo={aviso.tipo} mensaje={aviso.mensaje} /> : null}
        <div>
          <Boton type="submit" icono={Upload} cargando={trabajando} disabled={!archivo?.revision.valido}>
            Subir versión
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

function Modelo({ modelo, versiones, alCambiar }: { modelo: string; versiones: VersionFirmware[]; alCambiar: () => void }) {
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function publicar(v: VersionFirmware) {
    setTrabajando(v.id);
    setError(null);
    const r = await publicarEstable(v.id);
    setTrabajando(null);
    if (!r.ok) setError(r.mensaje);
    alCambiar();
  }
  return (
    <Tarjeta titulo={modelo} sinRelleno>
      <Aviso mensaje={error} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="text-[11.5px] text-texto-3">
            <tr className="border-t border-separador">
              <th className="px-[18px] py-2 font-medium">Versión</th>
              <th className="py-2 font-medium">Canal</th>
              <th className="py-2 font-medium">Subida</th>
              <th className="py-2 font-medium">Tamaño</th>
              <th className="py-2 pr-[18px] font-medium" />
            </tr>
          </thead>
          <tbody>
            {versiones.map((v) => {
              const borrado = !!v.file_deleted_at;
              return (
                <tr key={v.id} className={`border-t border-separador ${borrado ? "text-texto-3" : "text-tinta"}`}>
                  <td className="px-[18px] py-2.5">
                    <span className="font-mono">{v.version}</span>
                    {v.notes ? <span className="block text-xs text-texto-3">{v.notes}</span> : null}
                  </td>
                  <td className="py-2.5">
                    {borrado ? "Historial" : v.channel === "estable" ? <span className="font-medium text-ok">Estable</span> : "Banco"}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">{fecha(v.created_at)}</td>
                  <td className="py-2.5">{kb(v.size_bytes)}</td>
                  <td className="py-2.5 pr-[18px] text-right">
                    {!borrado && v.channel === "banco" ? (
                      <Boton variante="secundario" icono={Rocket} cargando={trabajando === v.id} onClick={() => void publicar(v)}>
                        Pasar a estable
                      </Boton>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
