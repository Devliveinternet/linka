import { Device, Driver, Trip, Alert, Vehicle, Geofence } from '../types';

export const mapProviders = [
  {
    id: 'google' as const,
    name: 'Google Maps',
    description: 'Mapas de alta qualidade com dados de tráfego em tempo real e cobertura global',
    requiresApiKey: true,
    features: ['Tráfego em tempo real', 'Street View', 'Geocoding preciso', 'Roteamento otimizado'],
    pricing: 'Pay-per-use'
  },
  {
    id: 'mapbox' as const,
    name: 'Mapbox',
    description: 'Mapas customizáveis com performance otimizada e estilos personalizados',
    requiresApiKey: true,
    features: ['Estilos customizados', 'Performance otimizada', 'Mapas offline', 'Análise de tráfego'],
    pricing: 'Freemium + Pay-per-use'
  },
  {
    id: 'openstreetmap' as const,
    name: 'OpenStreetMap',
    description: 'Mapas open source gratuitos com dados colaborativos globais',
    requiresApiKey: false,
    features: ['Gratuito', 'Open source', 'Dados colaborativos', 'Sem limites de uso'],
    pricing: 'Gratuito'
  }
];

export const defaultMapConfig = {
  provider: 'openstreetmap' as const,
  settings: {
    defaultZoom: 10,
    defaultCenter: { lat: -16.6799, lon: -49.255 },
    enableTraffic: false,
    enableSatellite: false,
    enableTerrain: false
  }
};

export const mockDevices: Device[] = [
  {
    id: 'd_001',
    tenantId: 't_001',
    imei: '860123456789012',
    iccid: '89551234567890123456',
    model: 'GT06N',
    protocol: 'GT06',
    driverId: 'drv_001',
    vehicleId: 'v_001',
    status: 'online',
    lastUpdate: new Date(Date.now() - 30000).toISOString(),
    position: {
      id: 'pos_001',
      deviceId: 'd_001',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      lat: -16.6799,
      lon: -49.255,
      speed: 45,
      heading: 132,
      ignition: true,
      odometer: 45872.4,
      fuel: 56,
      satellites: 12,
      hdop: 0.7
    }
  },
  {
    id: 'd_002',
    tenantId: 't_001',
    imei: '860123456789013',
    iccid: '89551234567890123457',
    model: 'JT808',
    protocol: 'JT808',
    driverId: 'drv_002',
    vehicleId: 'v_002',
    status: 'online',
    lastUpdate: new Date(Date.now() - 45000).toISOString(),
    position: {
      id: 'pos_002',
      deviceId: 'd_002',
      timestamp: new Date(Date.now() - 45000).toISOString(),
      lat: -16.6850,
      lon: -49.2600,
      speed: 0,
      heading: 90,
      ignition: false,
      odometer: 32145.8,
      fuel: 78,
      satellites: 10,
      hdop: 0.9
    }
  },
  {
    id: 'd_003',
    tenantId: 't_001',
    imei: '860123456789014',
    iccid: '89551234567890123458',
    model: 'Teltonika FMB920',
    protocol: 'Codec8',
    driverId: 'drv_003',
    vehicleId: 'v_003',
    status: 'offline',
    lastUpdate: new Date(Date.now() - 3600000).toISOString(),
    position: {
      id: 'pos_003',
      deviceId: 'd_003',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      lat: -16.6900,
      lon: -49.2700,
      speed: 0,
      heading: 270,
      ignition: false,
      odometer: 28934.2,
      fuel: 23,
      satellites: 8,
      hdop: 1.2
    }
  }
];

export const mockDrivers: Driver[] = [
  {
    id: 'drv_001',
    tenantId: 't_001',
    name: 'João Silva',
    license: 'ABC123456',
    badge: 'B001',
    rfid: 'RF001',
    phone: '+5511999888777',
    email: 'joao.silva@email.com',
    score: 87,
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'drv_002',
    tenantId: 't_001',
    name: 'Maria Santos',
    license: 'DEF789012',
    badge: 'B002',
    rfid: 'RF002',
    phone: '+5511888777666',
    email: 'maria.santos@email.com',
    score: 92,
    status: 'active',
    createdAt: '2024-02-20T14:30:00Z'
  },
  {
    id: 'drv_003',
    tenantId: 't_001',
    name: 'Carlos Oliveira',
    license: 'GHI345678',
    badge: 'B003',
    phone: '+5511777666555',
    email: 'carlos.oliveira@email.com',
    score: 76,
    status: 'active',
    createdAt: '2024-03-10T09:15:00Z'
  }
];

export const mockVehicles: Vehicle[] = [
  {
    id: 'v_001',
    tenantId: 't_001',
    plate: 'ABC1234',
    model: 'Scania R450',
    year: 2022,
    brand: 'Scania',
    fuelType: 'diesel',
    deviceId: 'd_001',
    driverId: 'drv_001',
    status: 'active',
    odometer: 45872,
    nextMaintenance: 50000,
    vehicleType: 'truck',
    photo: 'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    id: 'v_002',
    tenantId: 't_001',
    plate: 'DEF5678',
    model: 'Volvo FH540',
    year: 2023,
    brand: 'Volvo',
    fuelType: 'diesel',
    deviceId: 'd_002',
    driverId: 'drv_002',
    status: 'active',
    odometer: 32145,
    nextMaintenance: 35000,
    vehicleType: 'truck',
    photo: 'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    id: 'v_003',
    tenantId: 't_001',
    plate: 'GHI9012',
    model: 'Mercedes Actros',
    year: 2021,
    brand: 'Mercedes',
    fuelType: 'diesel',
    deviceId: 'd_003',
    driverId: 'drv_003',
    status: 'maintenance',
    odometer: 28934,
    nextMaintenance: 30000,
    vehicleType: 'truck'
  }
];

export const mockTrips: Trip[] = [
  {
    id: 'trip_001',
    deviceId: 'd_001',
    driverId: 'drv_001',
    startTime: '2025-01-15T08:00:00Z',
    endTime: '2025-01-15T14:30:00Z',
    startLocation: { lat: -16.6799, lon: -49.255, address: 'Goiânia, GO' },
    endLocation: { lat: -16.7000, lon: -49.2800, address: 'Aparecida de Goiânia, GO' },
    distance: 45.2,
    duration: 390,
    maxSpeed: 85,
    avgSpeed: 42,
    score: 88,
    fuelConsumption: 18.5,
    status: 'completed'
  },
  {
    id: 'trip_002',
    deviceId: 'd_002',
    driverId: 'drv_002',
    startTime: '2025-01-15T06:30:00Z',
    endTime: '2025-01-15T16:45:00Z',
    startLocation: { lat: -16.6850, lon: -49.2600, address: 'Setor Central, Goiânia' },
    endLocation: { lat: -16.7200, lon: -49.3000, address: 'Setor Oeste, Goiânia' },
    distance: 78.9,
    duration: 615,
    maxSpeed: 92,
    avgSpeed: 38,
    score: 76,
    fuelConsumption: 32.1,
    status: 'completed'
  },
  {
    id: 'trip_003',
    deviceId: 'd_001',
    driverId: 'drv_001',
    startTime: new Date().toISOString(),
    startLocation: { lat: -16.6799, lon: -49.255, address: 'Goiânia, GO' },
    distance: 12.3,
    duration: 0,
    maxSpeed: 65,
    avgSpeed: 32,
    score: 85,
    status: 'active'
  }
];

export const mockAlerts: Alert[] = [
  {
    id: 'alrt_001',
    tenantId: 't_001',
    type: 'speeding',
    severity: 'high',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    deviceId: 'd_002',
    driverId: 'drv_002',
    message: 'Velocidade de 92 km/h em zona de 80 km/h',
    location: { lat: -16.6850, lon: -49.2600 },
    acknowledged: false,
    context: { speed: 92, limit: 80, roadClass: 'urban' }
  },
  {
    id: 'alrt_002',
    tenantId: 't_001',
    type: 'geofence',
    severity: 'medium',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    deviceId: 'd_001',
    driverId: 'drv_001',
    message: 'Veículo saiu da área autorizada',
    location: { lat: -16.6799, lon: -49.255 },
    acknowledged: true,
    acknowledgedBy: 'user_001',
    acknowledgedAt: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'alrt_003',
    tenantId: 't_001',
    type: 'maintenance',
    severity: 'low',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    deviceId: 'd_003',
    message: 'Manutenção preventiva em 1.066 km',
    acknowledged: false,
    context: { currentOdo: 28934, nextMaintenance: 30000 }
  }
];

export const mockGeofences: Geofence[] = [
  {
    id: 'geo_001',
    tenantId: 't_001',
    name: 'Centro de Distribuição Principal',
    type: 'polygon',
    coordinates: [
      [-49.2500, -16.6750],
      [-49.2550, -16.6750],
      [-49.2550, -16.6800],
      [-49.2500, -16.6800],
      [-49.2500, -16.6750]
    ],
    rules: [
      {
        id: 'rule_001',
        type: 'speed_limit',
        value: 30,
        actions: ['alert', 'notify']
      }
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'geo_002',
    tenantId: 't_001',
    name: 'Zona de Entrega Norte',
    type: 'circle',
    coordinates: [[-49.2400, -16.6700]],
    radius: 2000,
    rules: [
      {
        id: 'rule_002',
        type: 'enter',
        actions: ['webhook', 'log']
      }
    ],
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z'
  }
];