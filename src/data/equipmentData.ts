import { EquipmentModel, M2MProvider, Equipment, EquipmentLog } from '../types/equipment';

export const equipmentModels: EquipmentModel[] = [
  {
    id: 'lv12',
    name: 'LV-12',
    manufacturer: 'Linka Tech',
    protocol: 'GT06',
    features: ['GPS', 'GSM', 'Acelerômetro', 'Entrada/Saída Digital'],
    defaultConfig: {
      apn: 'gprs.tim.br',
      serverIp: '200.123.45.67',
      serverPort: 5023
    }
  },
  {
    id: 'j16',
    name: 'J16',
    manufacturer: 'Jimi IoT',
    protocol: 'JT808',
    features: ['GPS', 'GSM', 'WiFi', 'Bluetooth', 'Câmera'],
    defaultConfig: {
      apn: 'gprs.tim.br',
      serverIp: '200.123.45.67',
      serverPort: 5024
    }
  },
  {
    id: 'fmb920',
    name: 'FMB920',
    manufacturer: 'Teltonika',
    protocol: 'Codec8',
    features: ['GPS', 'GSM', 'Acelerômetro', 'Giroscópio', 'Bluetooth'],
    defaultConfig: {
      apn: 'gprs.tim.br',
      serverIp: '200.123.45.67',
      serverPort: 5025
    }
  },
  {
    id: 'gt06n',
    name: 'GT06N',
    manufacturer: 'Concox',
    protocol: 'GT06',
    features: ['GPS', 'GSM', 'Entrada/Saída Digital', 'Corte de Combustível'],
    defaultConfig: {
      apn: 'gprs.tim.br',
      serverIp: '200.123.45.67',
      serverPort: 5023
    }
  }
];

export const m2mProviders: M2MProvider[] = [
  {
    id: 'tim_m2m',
    name: 'TIM M2M',
    apn: 'gprs.tim.br',
    coverage: ['Nacional'],
    pricing: 'R$ 8,90/mês'
  },
  {
    id: 'vivo_m2m',
    name: 'Vivo M2M',
    apn: 'gprs.vivo.br',
    coverage: ['Nacional'],
    pricing: 'R$ 9,50/mês'
  },
  {
    id: 'claro_m2m',
    name: 'Claro M2M',
    apn: 'gprs.claro.com.br',
    coverage: ['Nacional'],
    pricing: 'R$ 8,50/mês'
  },
  {
    id: 'oi_m2m',
    name: 'Oi M2M',
    apn: 'gprs.oi.com.br',
    coverage: ['Regional'],
    pricing: 'R$ 7,90/mês'
  }
];

export const mockEquipments: Equipment[] = [
  {
    id: 'eq_001',
    imei: '860123456789012',
    model: 'lv12',
    provider: 'tim_m2m',
    status: 'active',
    vehicleId: 'av_001',
    clientId: 'client_001',
    apnConfig: {
      apn: 'gprs.tim.br',
      username: '',
      password: ''
    },
    serverConfig: {
      ip: '200.123.45.67',
      port: 5023,
      protocol: 'GT06'
    },
    createdAt: '2024-01-20T10:00:00Z',
    activatedAt: '2024-01-20T10:30:00Z',
    lastConfigUpdate: '2024-01-20T10:30:00Z'
  },
  {
    id: 'eq_002',
    imei: '860123456789013',
    model: 'j16',
    provider: 'vivo_m2m',
    status: 'configuring',
    clientId: 'client_001',
    apnConfig: {
      apn: 'gprs.vivo.br',
      username: '',
      password: ''
    },
    serverConfig: {
      ip: '200.123.45.67',
      port: 5024,
      protocol: 'JT808'
    },
    createdAt: '2024-01-22T14:00:00Z'
  }
];

export const mockEquipmentLogs: EquipmentLog[] = [
  {
    id: 'log_001',
    equipmentId: 'eq_001',
    type: 'registration',
    message: 'Equipamento registrado no sistema',
    details: { imei: '860123456789012', model: 'LV-12' },
    timestamp: '2024-01-20T10:00:00Z',
    userId: 'user_001'
  },
  {
    id: 'log_002',
    equipmentId: 'eq_001',
    type: 'linking',
    message: 'Equipamento vinculado ao veículo ABC1234',
    details: { vehicleId: 'av_001', plate: 'ABC1234' },
    timestamp: '2024-01-20T10:15:00Z',
    userId: 'user_001'
  },
  {
    id: 'log_003',
    equipmentId: 'eq_001',
    type: 'activation',
    message: 'Equipamento ativado e configurado com sucesso',
    details: { 
      apn: 'gprs.tim.br', 
      serverIp: '200.123.45.67', 
      serverPort: 5023 
    },
    timestamp: '2024-01-20T10:30:00Z',
    userId: 'user_001'
  }
];