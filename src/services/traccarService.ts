import { Device, Position, Alert, Trip, Geofence } from '../types';

class TraccarService {
  private baseUrl = '/traccar';
  private headers: HeadersInit = { 'Content-Type': 'application/json' };

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) Object.entries(params).forEach(([k,v]) => v!=null && url.searchParams.set(k, String(v)));
    const r = await fetch(url.toString(), { headers: this.headers });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  }

  getDevices(): Promise<Device[]> { return this.makeRequest('/devices'); }
  getPositions(): Promise<Position[]> { return this.makeRequest('/positions'); }
  getAlerts(): Promise<Alert[]> { return this.makeRequest('/events'); }
  getTrips(p:{deviceId:number;from:string;to:string}): Promise<Trip[]> { return this.makeRequest('/trips', p); }
  getGeofences(): Promise<Geofence[]> { return this.makeRequest('/geofences'); }
  async getRealtimeData(){ const [devices,positions,alerts] = await Promise.all([this.getDevices(),this.getPositions(),this.getAlerts()]); return {devices,positions,alerts}; }
}
export const traccarService = new TraccarService();
