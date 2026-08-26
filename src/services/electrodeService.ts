import { supabase } from "../lib/supabase";
import type { DeviceElectrode } from "../types/sensor";

export const electrodeService = {
  async getElectrodesForDevice(
    deviceId: string
  ): Promise<DeviceElectrode[]> {
    const { data, error } = await supabase
      .from("device_electrodes")
      .select("*")
      .eq("device_id", deviceId)
      .order("electrode_index", { ascending: true });

    if (error) {
      console.error(
        "Error al obtener electrodos:",
        error.message
      );

      return [];
    }

    return data || [];
  },
};