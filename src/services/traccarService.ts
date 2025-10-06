import { Device, Position, Alert, Trip, Geofence } from '../types';

// Resumo pronto pra tela de veículos (vindo do /traccar/devices/enriched)
export type DeviceSummary = {
  id: number;
  name: string;
  uniqueId: string;
  status: 'online' | 'offline' | 'unknown' | string;
  model?: string;
  category?: string;
  lastUpdate?: string;   // ISO
  minutesAgo?: number;
  lastFixTime?: string;  // ISO
  speedKmh?: number;
  address?: string;
};

class TraccarService {
  private baseUrl = '/traccar';
  private headers: HeadersInit = { 'Content-Type': 'application/json' };

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)));
    }
    const r = await fetch(url.toString(), { headers: this.headers });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  }

  // ====== ENRICHED (use este na tela de Veículos) ======
  getDevicesEnriched(): Promise<DeviceSummary[]> {
    return this.makeRequest<DeviceSummary[]>('/devices/enriched');
  }

  // ====== endpoints "puros" do Traccar (mantidos) ======
  getDevices(): Promise<Device[]>                { return this.makeRequest<Device[]>('/devices'); }
  getPositions(): Promise<Position[]>            { return this.makeRequest<Position[]>('/positions'); }
  getAlerts(): Promise<Alert[]>                  { return this.makeRequest<Alert[]>('/events'); }
  getTrips(p:{deviceId:number;from:string;to:string}): Promise<Trip[]> {
    return this.makeRequest<Trip[]>('/trips', p);
  }
  getGeofences(): Promise<Geofence[]>            { return this.makeRequest<Geofence[]>('/geofences'); }

  async getRealtimeData(){
    const [devices, positions, alerts] = await Promise.all([
      this.getDevices(),
      this.getPositions(),
      this.getAlerts()
    ]);
    return { devices, positions, alerts };
  }
}

export const traccarService = new TraccarService();
