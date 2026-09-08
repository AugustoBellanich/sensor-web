export interface Device {
  id: string;
  alias: string | null;
  type: "B01" | "C01" | string;

  name_farm: string | null;
  activity: string | null;

  config: {
    role?: string;
    lowPower?: boolean;
    loraInterval?: number;
    saveInterval?: number;
    [key: string]: unknown;
  } | null;

  lat: number | null;
  lng: number | null;
  created_at: string | null;
}

export interface DeviceElectrode {
  id: string;
  device_id: string;
  electrode_index: number;
  depth: number | null;
  texture: string | null;
  density: number | null;
  points_json: any;
  equations_json: any;
}

export interface ReadingB01 {
  id: number;

  // Gateway / nodo que transportó/subió el dato
  device_id: string;

  // Sensor físico que generó el dato
  sensor_id: string;

  sensor_type: string;
  timestamp: string;

  soil_temp: number | null;

  e1_mv: number | null;
  e1_hv: number | null;
  e1_hg: number | null;

  e2_mv: number | null;
  e2_hv: number | null;
  e2_hg: number | null;

  e3_mv: number | null;
  e3_hv: number | null;
  e3_hg: number | null;

  battery_pct: number | null;
  created_at: string | null;
}

export interface ReadingC01 {
  id: number;

  // Gateway / nodo que transportó/subió el dato
  device_id: string;

  // Sensor físico que generó el dato
  sensor_id: string;

  sensor_type: string;
  timestamp: string;

  air_temp: number | null;
  humidity: number | null;

  battery_pct: number | null;
  created_at: string | null;
}

export interface DeviceWithStatus extends Device {
  lastReadingTime?: string | null;
  battery?: number | null;
  status: "online" | "warning" | "offline";
}

// Estado más reciente reportado por el gateway vía heartbeat
// (tabla gateway_status, 1 fila por device_id, se pisa con upsert)
export interface GatewayStatus {
  device_id: string;
  last_heartbeat: string;

  fw_version: string | null;
  wifi_status: "ONLINE" | "LOCAL" | "OFFLINE" | null;

  battery_pct: number | null;
  battery_mv: number | null;

  uptime_s: number | null;
  free_heap: number | null;

  lora_ready: boolean | null;
  pending_batches: number | null;

  last_lora_rx: string | null;
  rssi: number | null;

  updated_at: string | null;
}

export interface IngestLog {
  id: string;
  device_id: string;
  received_at: string;

  request_status: string | null;

  processing_ms: number | null;

  readings_received: number | null;
  readings_inserted: number | null;
  readings_duplicate: number | null;

  sensors_count: number | null;

  sensor_ids: unknown | null;

  error_message: string | null;

  readings_min_timestamp: string | null;
  readings_max_timestamp: string | null;

  upload_delay_seconds: number | null;

  payload_bytes: number | null;

  http_status: number | null;
}