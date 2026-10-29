// Copiado de sensor-app/src/datos/textos.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Explicaciones que se abren con ⓘ. Cada una existe una sola vez y se usa en todas las pantallas
// (criterios 11 y 13 de sensor-central/docs/estilo.md): hasta dos oraciones, qué es y qué significa.

export const AYUDA = {
  dpv: "Déficit de presión de vapor: cuánto empuja el aire a la planta a transpirar. Bajo: hojas húmedas y riesgo de enfermedades; alto: la planta cierra estomas.",
  rocio: "Temperatura a la que el aire se satura y el agua se condensa. A menos de 2 °C de distancia, las hojas se mojan (rocío o escarcha).",
  carcasa: "Temperatura dentro de la caja, medida por el reloj (±3 °C); no es un dato del aire. Arriba de 45 °C se daña la batería.",
  resumenClima: "Medido a la altura del sensor: a nivel del suelo la helada puede ser más fuerte. Los cortes de más de 3 h no suman horas.",
  horasFrio: "Nogal y manzano piden entre 600 y 1000 horas; la mayoría de los frutales, entre 600 y 1400 según la variedad.",
  wifiGateway: "Solo redes de 2,4 GHz. No sirven las que piden ingresar en una página (hoteles, bares).",
  baseGateway: "Carga la dirección de la base y un token nuevo; el anterior deja de valer. El token no se guarda en el teléfono.",
  subidaGateway: "Más seguido: los datos llegan antes a la app, con más uso de datos del WiFi.",
  ubicacionCampo: "Centra el mapa al abrirlo. Si la dejás vacía, se centra en el primer lote.",
  altaEquipo: "Se da de alta cuando el equipo sale del taller, ya probado.",
  sitio: "El punto exacto donde va un equipo, dentro de un lote.",
  miembros: "Los miembros ven los lotes y sitios del campo y los datos de sus equipos.",
  muestraBase: "La app toma el mV promedio de ±30 min alrededor de esa hora.",
  muestraManual: "El punto queda asociado al equipo instalado en el sitio en esa fecha.",
  muestraVivo: "Es el promedio de las últimas lecturas, cuando dejaron de variar.",
  porcentajeVol: "Se calcula con la densidad aparente cargada en el suelo de este electrodo.",
  muestrasSuelo: "Muestras cerca de la sonda, en suelo sin remover y a la misma profundidad. Cada cambio queda en el historial.",
  densidad: "Pasa la humedad gravimétrica a volumétrica y estima la saturación.",
  eventos: "Explican las subidas de humedad del gráfico.",
  copa: "Altura y ancho de la copa: sirven para estimar cuánta agua consume el cultivo.",
  riegoSinSistema: "Sin el sistema, los riegos se guardan en horas y se pasan a mm cuando lo cargues.",
  cambioSistema: "El sistema actual queda en el historial hasta la fecha nueva.",
  vincular: "Al vincularlo quedás como dueño y podés compartirlo.",
  archivados: "Al restaurar un sitio, el equipo hay que ubicarlo de nuevo.",
  inicioCompartidos: "Si alguien te comparte un equipo, aparece acá.",
  camposVacio: "Un campo tiene lotes, y cada lote, sitios donde van los equipos. Si alguien te suma a su campo, aparece acá.",
} as const;
