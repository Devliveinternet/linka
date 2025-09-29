export interface Client {
  id: string;
  name: string;
  document: string; // CPF/CNPJ
  documentType: 'cpf' | 'cnpj';
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contacts: {
    phone: string;
    email: string;
    responsibleName: string;
    responsiblePhone?: string;
  };
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastPayment?: string;
  nextBilling?: string;
}

export interface AdminVehicle {
  id: string;
  clientId: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  color: string;
  chassisNumber: string;
  vehicleType: 'car' | 'truck' | 'motorcycle' | 'machine';
  initialOdometer: number;
  currentOdometer: number;
  deviceId?: string;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  photo?: string; // URL or base64 of vehicle photo
}

export interface AdminDevice {
  id: string;
  clientId: string;
  vehicleId?: string;
  imei: string;
  serialNumber: string;
  model: string;
  protocol: string;
  iccid: string; // SIM card
  firmwareVersion: string;
  activationStatus: 'pending' | 'active' | 'inactive' | 'suspended';
  lastConnection?: string;
  signalStrength?: number;
  batteryLevel?: number;
  createdAt: string;
}

export interface AdminDriver {
  id: string;
  clientId: string;
  name: string;
  document: string; // CPF
  license: string; // CNH
  licenseCategory: string;
  licenseExpiry: string;
  phone: string;
  email: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  assignedVehicles: string[];
  status: 'active' | 'inactive' | 'suspended';
  hasAppAccess: boolean;
  appCredentials?: {
    username: string;
    lastLogin?: string;
  };
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  clientIds: string[]; // Which clients this user can manage
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
}

export interface AdminReport {
  activeClients: number;
  activeVehicles: number;
  provisionedDevices: number;
  pendingPayments: number;
  totalRevenue: number;
  newClientsThisMonth: number;
}