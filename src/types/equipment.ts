export interface Equipment {
  id: string;
  imei: string;
  model: string;
  provider: string;
  status: 'active' | 'configuring' | 'inactive';
  vehicleId?: string;
  clientId: string;
  apnConfig?: {
    apn: string;
    username?: string;
    password?: string;
  };
  serverConfig?: {
    ip: string;
    port: number;
    protocol: string;
  };
  createdAt: string;
  activatedAt?: string;
  lastConfigUpdate?: string;
}

export interface EquipmentModel {
  id: string;
  name: string;
  manufacturer: string;
  protocol: string;
  features: string[];
  defaultConfig: {
    apn: string;
    serverIp: string;
    serverPort: number;
  };
}

export interface M2MProvider {
  id: string;
  name: string;
  apn: string;
  coverage: string[];
  pricing: string;
}

export interface VehicleRegistration {
  plate: string;
  renavam?: string;
  type: 'car' | 'motorcycle' | 'truck' | 'machine';
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
}

export interface EquipmentLog {
  id: string;
  equipmentId: string;
  type: 'registration' | 'activation' | 'configuration' | 'linking' | 'error';
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  userId: string;
}