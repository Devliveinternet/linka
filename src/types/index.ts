export interface Tenant {
  id: string;
  name: string;
  plan: 'basic' | 'premium' | 'enterprise';
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  lastLogin?: string;
}

export interface Device {
  id: string;
  tenantId: string;
  imei: string;
  iccid: string;
  model: string;
  protocol: string;
  driverId?: string;
  vehicleId?: string;
  status: 'online' | 'offline' | 'inactive';
  lastUpdate: string;
  position?: Position;
}

export interface Position {
  id: string;
  deviceId: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ignition: boolean;
  odometer: number;
  fuel?: number;
  altitude?: number;
  satellites?: number;
  hdop?: number;
}

export interface Driver {
  id: string;
  tenantId: string;
  name: string;
  license: string;
  badge?: string;
  rfid?: string;
  phone?: string;
  email?: string;
  score: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

export interface Trip {
  id: string;
  deviceId: string;
  driverId?: string;
  startTime: string;
  endTime?: string;
  startLocation: { lat: number; lon: number; address?: string };
  endLocation?: { lat: number; lon: number; address?: string };
  distance: number;
  duration: number;
  maxSpeed: number;
  avgSpeed: number;
  score: number;
  fuelConsumption?: number;
  status: 'active' | 'completed';
}

export interface Geofence {
  id: string;
  tenantId: string;
  name: string;
  type: 'polygon' | 'circle';
  coordinates: number[][];
  radius?: number;
  rules: GeofenceRule[];
  isActive: boolean;
  createdAt: string;
}

export interface GeofenceRule {
  id: string;
  type: 'enter' | 'exit' | 'speed_limit';
  value?: number;
  actions: string[];
}

export interface Alert {
  id: string;
  tenantId: string;
  type: 'speeding' | 'geofence' | 'idle' | 'fuel' | 'maintenance' | 'fatigue' | 'harsh_driving';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  deviceId: string;
  driverId?: string;
  message: string;
  location?: { lat: number; lon: number };
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  context?: Record<string, any>;
}

export interface MapProvider {
  id: 'google' | 'mapbox' | 'openstreetmap';
  name: string;
  description: string;
  requiresApiKey: boolean;
  features: string[];
  pricing: string;
}

export interface MapConfiguration {
  provider: MapProvider['id'];
  apiKey?: string;
  settings: {
    defaultZoom: number;
    defaultCenter: { lat: number; lon: number };
    enableTraffic: boolean;
    enableSatellite: boolean;
    enableTerrain: boolean;
    tileStyle?: string;
  };
}

export interface Vehicle {
  id: string;
  tenantId: string;
  plate: string;
  model: string;
  year: number;
  brand: string;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  deviceId?: string;
  driverId?: string;
  status: 'active' | 'maintenance' | 'inactive';
  odometer: number;
  nextMaintenance: number;
  photo?: string; // URL or base64 of vehicle photo
  vehicleType?: 'car' | 'truck' | 'motorcycle' | 'machine';
}