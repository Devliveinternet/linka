import { Client, AdminVehicle, AdminDevice, AdminDriver, Role, Permission, AdminUser, AdminReport } from '../types/admin';

export const mockClients: Client[] = [
  {
    id: 'client_001',
    name: 'Transportadora ABC Ltda',
    document: '12.345.678/0001-90',
    documentType: 'cnpj',
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Sala 101',
      neighborhood: 'Centro',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-000'
    },
    contacts: {
      phone: '+55 62 3333-4444',
      email: 'contato@transportadoraabc.com.br',
      responsibleName: 'Carlos Silva',
      responsiblePhone: '+55 62 99999-8888'
    },
    plan: 'premium',
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    lastPayment: '2025-01-01T00:00:00Z',
    nextBilling: '2025-02-01T00:00:00Z'
  },
  {
    id: 'client_002',
    name: 'Logística XYZ S.A.',
    document: '98.765.432/0001-10',
    documentType: 'cnpj',
    address: {
      street: 'Avenida Principal',
      number: '456',
      neighborhood: 'Setor Industrial',
      city: 'Aparecida de Goiânia',
      state: 'GO',
      zipCode: '74900-000'
    },
    contacts: {
      phone: '+55 62 2222-3333',
      email: 'admin@logisticaxyz.com.br',
      responsibleName: 'Maria Santos',
      responsiblePhone: '+55 62 88888-7777'
    },
    plan: 'enterprise',
    status: 'active',
    createdAt: '2024-02-20T14:30:00Z',
    lastPayment: '2025-01-01T00:00:00Z',
    nextBilling: '2025-02-01T00:00:00Z'
  },
  {
    id: 'client_003',
    name: 'João da Silva - MEI',
    document: '123.456.789-00',
    documentType: 'cpf',
    address: {
      street: 'Rua dos Trabalhadores',
      number: '789',
      neighborhood: 'Vila Nova',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74100-000'
    },
    contacts: {
      phone: '+55 62 1111-2222',
      email: 'joao.silva@email.com',
      responsibleName: 'João da Silva'
    },
    plan: 'basic',
    status: 'suspended',
    createdAt: '2024-03-10T09:15:00Z',
    lastPayment: '2024-12-01T00:00:00Z',
    nextBilling: '2025-01-01T00:00:00Z'
  }
];

export const mockAdminVehicles: AdminVehicle[] = [
  {
    id: 'av_001',
    clientId: 'client_001',
    plate: 'ABC1234',
    model: 'Scania R450',
    brand: 'Scania',
    year: 2022,
    color: 'Branco',
    chassisNumber: '9BSC4X2008R123456',
    vehicleType: 'truck',
    initialOdometer: 0,
    currentOdometer: 45872,
    deviceId: 'd_001',
    status: 'active',
    createdAt: '2024-01-20T10:00:00Z',
    photo: 'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    id: 'av_002',
    clientId: 'client_001',
    plate: 'DEF5678',
    model: 'Volvo FH540',
    brand: 'Volvo',
    year: 2023,
    color: 'Azul',
    chassisNumber: '9BVF4X2009R654321',
    vehicleType: 'truck',
    initialOdometer: 0,
    currentOdometer: 32145,
    deviceId: 'd_002',
    status: 'active',
    createdAt: '2024-02-15T14:30:00Z',
    photo: 'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    id: 'av_003',
    clientId: 'client_002',
    plate: 'GHI9012',
    model: 'Mercedes Actros',
    brand: 'Mercedes',
    year: 2021,
    color: 'Vermelho',
    chassisNumber: '9BME4X2007R789012',
    vehicleType: 'truck',
    initialOdometer: 15000,
    currentOdometer: 28934,
    deviceId: 'd_003',
    status: 'maintenance',
    createdAt: '2024-03-01T08:45:00Z'
  }
];

export const mockAdminDevices: AdminDevice[] = [
  {
    id: 'ad_001',
    clientId: 'client_001',
    vehicleId: 'av_001',
    imei: '860123456789012',
    serialNumber: 'GT06N-001',
    model: 'GT06N',
    protocol: 'GT06',
    iccid: '89551234567890123456',
    firmwareVersion: '2.1.4',
    activationStatus: 'active',
    lastConnection: new Date(Date.now() - 30000).toISOString(),
    signalStrength: 85,
    batteryLevel: 92,
    createdAt: '2024-01-18T10:00:00Z'
  },
  {
    id: 'ad_002',
    clientId: 'client_001',
    vehicleId: 'av_002',
    imei: '860123456789013',
    serialNumber: 'JT808-002',
    model: 'JT808',
    protocol: 'JT808',
    iccid: '89551234567890123457',
    firmwareVersion: '3.2.1',
    activationStatus: 'active',
    lastConnection: new Date(Date.now() - 45000).toISOString(),
    signalStrength: 78,
    batteryLevel: 88,
    createdAt: '2024-02-12T14:30:00Z'
  },
  {
    id: 'ad_003',
    clientId: 'client_002',
    vehicleId: 'av_003',
    imei: '860123456789014',
    serialNumber: 'FMB920-003',
    model: 'Teltonika FMB920',
    protocol: 'Codec8',
    iccid: '89551234567890123458',
    firmwareVersion: '1.8.7',
    activationStatus: 'inactive',
    lastConnection: new Date(Date.now() - 3600000).toISOString(),
    signalStrength: 45,
    batteryLevel: 23,
    createdAt: '2024-02-28T09:15:00Z'
  }
];

export const mockAdminDrivers: AdminDriver[] = [
  {
    id: 'adr_001',
    clientId: 'client_001',
    name: 'João Silva',
    document: '123.456.789-00',
    license: 'ABC123456',
    licenseCategory: 'D',
    licenseExpiry: '2026-12-31',
    phone: '+55 62 99999-8888',
    email: 'joao.silva@email.com',
    address: {
      street: 'Rua das Palmeiras',
      number: '456',
      neighborhood: 'Jardim América',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-100'
    },
    assignedVehicles: ['av_001'],
    status: 'active',
    hasAppAccess: true,
    appCredentials: {
      username: 'joao.silva',
      lastLogin: new Date(Date.now() - 3600000).toISOString()
    },
    createdAt: '2024-01-25T10:00:00Z'
  },
  {
    id: 'adr_002',
    clientId: 'client_001',
    name: 'Maria Santos',
    document: '987.654.321-00',
    license: 'DEF789012',
    licenseCategory: 'E',
    licenseExpiry: '2027-06-15',
    phone: '+55 62 88888-7777',
    email: 'maria.santos@email.com',
    address: {
      street: 'Avenida Central',
      number: '789',
      neighborhood: 'Setor Sul',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-200'
    },
    assignedVehicles: ['av_002'],
    status: 'active',
    hasAppAccess: true,
    appCredentials: {
      username: 'maria.santos',
      lastLogin: new Date(Date.now() - 7200000).toISOString()
    },
    createdAt: '2024-02-10T14:30:00Z'
  }
];

export const mockPermissions: Permission[] = [
  // Dashboard permissions
  { id: 'perm_001', name: 'dashboard.view', description: 'Visualizar dashboard', module: 'dashboard', action: 'read' },
  
  // Client management
  { id: 'perm_002', name: 'clients.create', description: 'Criar clientes', module: 'clients', action: 'create' },
  { id: 'perm_003', name: 'clients.read', description: 'Visualizar clientes', module: 'clients', action: 'read' },
  { id: 'perm_004', name: 'clients.update', description: 'Editar clientes', module: 'clients', action: 'update' },
  { id: 'perm_005', name: 'clients.delete', description: 'Excluir clientes', module: 'clients', action: 'delete' },
  { id: 'perm_006', name: 'clients.manage', description: 'Gerenciar clientes', module: 'clients', action: 'manage' },
  
  // Vehicle management
  { id: 'perm_007', name: 'vehicles.create', description: 'Criar veículos', module: 'vehicles', action: 'create' },
  { id: 'perm_008', name: 'vehicles.read', description: 'Visualizar veículos', module: 'vehicles', action: 'read' },
  { id: 'perm_009', name: 'vehicles.update', description: 'Editar veículos', module: 'vehicles', action: 'update' },
  { id: 'perm_010', name: 'vehicles.delete', description: 'Excluir veículos', module: 'vehicles', action: 'delete' },
  
  // Device management
  { id: 'perm_011', name: 'devices.create', description: 'Provisionar dispositivos', module: 'devices', action: 'create' },
  { id: 'perm_012', name: 'devices.read', description: 'Visualizar dispositivos', module: 'devices', action: 'read' },
  { id: 'perm_013', name: 'devices.update', description: 'Editar dispositivos', module: 'devices', action: 'update' },
  { id: 'perm_014', name: 'devices.delete', description: 'Excluir dispositivos', module: 'devices', action: 'delete' },
  
  // Driver management
  { id: 'perm_015', name: 'drivers.create', description: 'Criar motoristas', module: 'drivers', action: 'create' },
  { id: 'perm_016', name: 'drivers.read', description: 'Visualizar motoristas', module: 'drivers', action: 'read' },
  { id: 'perm_017', name: 'drivers.update', description: 'Editar motoristas', module: 'drivers', action: 'update' },
  { id: 'perm_018', name: 'drivers.delete', description: 'Excluir motoristas', module: 'drivers', action: 'delete' },
  
  // Reports
  { id: 'perm_019', name: 'reports.view', description: 'Visualizar relatórios', module: 'reports', action: 'read' },
  { id: 'perm_020', name: 'reports.export', description: 'Exportar relatórios', module: 'reports', action: 'manage' },
  
  // System administration
  { id: 'perm_021', name: 'system.users', description: 'Gerenciar usuários', module: 'system', action: 'manage' },
  { id: 'perm_022', name: 'system.roles', description: 'Gerenciar perfis', module: 'system', action: 'manage' },
  { id: 'perm_023', name: 'system.settings', description: 'Configurações do sistema', module: 'system', action: 'manage' }
];

export const mockRoles: Role[] = [
  {
    id: 'role_001',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    permissions: mockPermissions.map(p => p.id),
    isSystemRole: true
  },
  {
    id: 'role_002',
    name: 'Operador',
    description: 'Operações básicas de monitoramento',
    permissions: [
      'perm_001', 'perm_003', 'perm_008', 'perm_012', 'perm_016', 'perm_019'
    ],
    isSystemRole: true
  },
  {
    id: 'role_003',
    name: 'Gestor de Frota',
    description: 'Gestão completa da frota do cliente',
    permissions: [
      'perm_001', 'perm_003', 'perm_007', 'perm_008', 'perm_009',
      'perm_015', 'perm_016', 'perm_017', 'perm_019', 'perm_020'
    ],
    isSystemRole: false
  },
  {
    id: 'role_004',
    name: 'Motorista',
    description: 'Acesso ao aplicativo motorista',
    permissions: ['perm_001'],
    isSystemRole: true
  }
];

export const mockAdminUsers: AdminUser[] = [
  {
    id: 'user_001',
    name: 'Admin Sistema',
    email: 'admin@linka.com.br',
    roleId: 'role_001',
    clientIds: [],
    status: 'active',
    lastLogin: new Date(Date.now() - 1800000).toISOString(),
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user_002',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@transportadoraabc.com.br',
    roleId: 'role_003',
    clientIds: ['client_001'],
    status: 'active',
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
    createdAt: '2024-01-20T10:00:00Z'
  }
];

export const mockAdminReport: AdminReport = {
  activeClients: 3,
  activeVehicles: 8,
  provisionedDevices: 12,
  pendingPayments: 1,
  totalRevenue: 45780.50,
  newClientsThisMonth: 2
};