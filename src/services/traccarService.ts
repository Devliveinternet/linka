import { Device, Position, Alert, Trip, Geofence } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

class TraccarService {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = `${SUPABASE_URL}/functions/v1/traccar-proxy`;
    this.headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  async getDevices(): Promise<Device[]> {
    return this.makeRequest<Device[]>('/devices');
  }

  async getPositions(): Promise<Position[]> {
    return this.makeRequest<Position[]>('/positions');
  }

  async getAlerts(): Promise<Alert[]> {
    return this.makeRequest<Alert[]>('/events');
  }

  async getTrips(): Promise<Trip[]> {
    return this.makeRequest<Trip[]>('/trips');
  }

  async getGeofences(): Promise<Geofence[]> {
    return this.makeRequest<Geofence[]>('/geofences');
  }

  // Método para buscar dados em tempo real (polling)
  async getRealtimeData(): Promise<{
    devices: Device[];
    positions: Position[];
    alerts: Alert[];
  }> {
    try {
      const [devices, positions, alerts] = await Promise.all([
        this.getDevices(),
        this.getPositions(),
        this.getAlerts()
      ]);

      return { devices, positions, alerts };
    } catch (error) {
      console.error('Error fetching realtime data:', error);
      throw error;
    }
  }
}

export const traccarService = new TraccarService();