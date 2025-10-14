import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Truck, Clock, Save, X } from 'lucide-react';
import { Device, Vehicle, Driver } from '../../types';
import { equipmentModels } from '../../data/equipmentData';
import { validateIMEI, formatIMEI, isDuplicateIMEI } from '../../utils/imeiValidator';

interface VehiclesListProps {
  devices: Device[];
  vehicles: Vehicle[];
  drivers: Driver[];
}

export const VehiclesList: React.FC<VehiclesListProps> = ({ devices, vehicles, drivers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [localDevices, setLocalDevices] = useState<Device[]>(devices);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(vehicles);
  const [isCreateDeviceModalOpen, setIsCreateDeviceModalOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    imei: '',
    iccid: '',
    model: '',
    protocol: '',
    vehicleId: '',
  });
  const [deviceErrors, setDeviceErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalDevices(devices);
  }, [devices]);

  useEffect(() => {
    setLocalVehicles(vehicles);
  }, [vehicles]);

  const getVehicleForDevice = (deviceId: string) => {
    return localVehicles.find(v => v.deviceId === deviceId);
  };

  const getDriverForDevice = (deviceId: string) => {
    const device = localDevices.find(d => d.id === deviceId);
    return device?.driverId ? drivers.find(d => d.id === device.driverId) : undefined;
  };

  const filteredDevices = useMemo(() => {
    return localDevices.filter(device => {
      const vehicle = getVehicleForDevice(device.id);
      const driver = getDriverForDevice(device.id);

      const matchesSearch = !searchTerm ||
        vehicle?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.model.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterStatus === 'all' || device.status === filterStatus;

      return matchesSearch && matchesFilter;
    });
  }, [localDevices, filterStatus, searchTerm, drivers, localVehicles]);

  const getStatusBadge = (status: string) => {
    const badges = {
      online: 'bg-green-100 text-green-800',
      offline: 'bg-gray-100 text-gray-800',
      inactive: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || badges.offline;
  };

  const formatLastUpdate = (timestamp: string) => {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
    return `${Math.floor(diffMins / 1440)}d atrás`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="text-sm sm:text-base text-gray-600">Gestão da frota e dispositivos</p>
        </div>
        <button
          onClick={() => setIsCreateDeviceModalOpen(true)}
          className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white px-2 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Adicionar Dispositivo</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por placa, motorista ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
        {filteredDevices.map((device) => {
          const vehicle = getVehicleForDevice(device.id);
          const driver = getDriverForDevice(device.id);
          const position = device.position;
          
          return (
            <div key={device.id} className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      {vehicle?.photo ? (
                        <img
                          src={vehicle.photo}
                          alt={`Foto do veículo ${vehicle.plate}`}
                          className="w-4 h-4 sm:w-5 sm:h-5 object-cover rounded"
                          onError={(e) => {
                            // Fallback to truck icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <Truck className={`text-blue-600 ${vehicle?.photo ? 'hidden' : ''}`} size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {vehicle?.plate || 'N/A'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {vehicle?.brand} {vehicle?.model}
                      </p>
                    </div>
                  </div>
                  <span className={`px-1 sm:px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusBadge(device.status)}`}>
                    {device.status}
                  </span>
                </div>

                {driver && (
                  <div className="mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{driver.name}</p>
                    <p className="text-xs text-gray-600">CNH: {driver.license}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full" 
                          style={{ width: `${driver.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{driver.score}%</span>
                    </div>
                  </div>
                )}

                {position && (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Velocidade:</span>
                      <span className="font-medium">{position.speed} km/h</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Odômetro:</span>
                      <span className="font-medium">{position.odometer.toLocaleString()} km</span>
                    </div>
                    {position.fuel && (
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Combustível:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full" 
                              style={{ width: `${position.fuel}%` }}
                            />
                          </div>
                          <span className="font-medium">{position.fuel}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
                    <span className="truncate">Última atualização: {formatLastUpdate(device.lastUpdate)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDevices.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-12 text-center">
          <Truck className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-2 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nenhum veículo encontrado</h3>
          <p className="text-sm sm:text-base text-gray-600">Tente ajustar os filtros ou adicionar novos veículos.</p>
        </div>
      )}

      {isCreateDeviceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Novo Dispositivo</h3>
                <p className="text-sm text-gray-600">Provisionamento rápido sem sair da visão de veículos</p>
              </div>
              <button
                onClick={() => {
                  setIsCreateDeviceModalOpen(false);
                  setDeviceForm({ imei: '', iccid: '', model: '', protocol: '', vehicleId: '' });
                  setDeviceErrors({});
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IMEI *</label>
                  <input
                    type="text"
                    value={deviceForm.imei}
                    onChange={(e) => {
                      setDeviceForm((prev) => ({ ...prev, imei: e.target.value }));
                      if (deviceErrors.imei) {
                        setDeviceErrors((prev) => ({ ...prev, imei: '' }));
                      }
                    }}
                    maxLength={15}
                    placeholder="860123456789012"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      deviceErrors.imei ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {deviceErrors.imei && <p className="text-xs text-red-600 mt-1">{deviceErrors.imei}</p>}
                  {deviceForm.imei && (
                    <p
                      className={`text-xs mt-1 ${validateIMEI(deviceForm.imei) ? 'text-green-600' : 'text-orange-500'}`}
                    >
                      {validateIMEI(deviceForm.imei) ? '✓ IMEI válido' : 'IMEI deve conter 15 dígitos válidos'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ICCID *</label>
                  <input
                    type="text"
                    value={deviceForm.iccid}
                    onChange={(e) => {
                      setDeviceForm((prev) => ({ ...prev, iccid: e.target.value }));
                      if (deviceErrors.iccid) {
                        setDeviceErrors((prev) => ({ ...prev, iccid: '' }));
                      }
                    }}
                    maxLength={20}
                    placeholder="89551234567890123456"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      deviceErrors.iccid ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {deviceErrors.iccid && <p className="text-xs text-red-600 mt-1">{deviceErrors.iccid}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modelo *</label>
                  <select
                    value={deviceForm.model}
                    onChange={(e) => {
                      const selected = equipmentModels.find((model) => model.name === e.target.value);
                      setDeviceForm((prev) => ({
                        ...prev,
                        model: e.target.value,
                        protocol: selected?.protocol ?? prev.protocol,
                      }));
                      if (deviceErrors.model) {
                        setDeviceErrors((prev) => ({ ...prev, model: '' }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      deviceErrors.model ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione o modelo</option>
                    {equipmentModels.map((model) => (
                      <option key={model.id} value={model.name}>
                        {model.name} - {model.manufacturer}
                      </option>
                    ))}
                  </select>
                  {deviceErrors.model && <p className="text-xs text-red-600 mt-1">{deviceErrors.model}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Protocolo *</label>
                  <input
                    type="text"
                    value={deviceForm.protocol}
                    onChange={(e) => {
                      setDeviceForm((prev) => ({ ...prev, protocol: e.target.value }));
                      if (deviceErrors.protocol) {
                        setDeviceErrors((prev) => ({ ...prev, protocol: '' }));
                      }
                    }}
                    placeholder="GT06"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      deviceErrors.protocol ? 'border-red-300' : 'border-gray-300'
                    }`}
                    readOnly={!!equipmentModels.find((model) => model.name === deviceForm.model)}
                  />
                  {deviceErrors.protocol && <p className="text-xs text-red-600 mt-1">{deviceErrors.protocol}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vincular a um veículo</label>
                  <select
                    value={deviceForm.vehicleId}
                    onChange={(e) => setDeviceForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Nenhum veículo</option>
                    {localVehicles
                      .filter((vehicle) => !vehicle.deviceId || vehicle.id === deviceForm.vehicleId)
                      .map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.brand} {vehicle.model}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {deviceForm.imei && (
                <div
                  className={`rounded-lg p-4 ${
                    validateIMEI(deviceForm.imei) ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${validateIMEI(deviceForm.imei) ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-gray-800">
                      {validateIMEI(deviceForm.imei) ? 'IMEI válido' : 'IMEI inválido'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Formatado: {formatIMEI(deviceForm.imei)}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsCreateDeviceModalOpen(false);
                  setDeviceForm({ imei: '', iccid: '', model: '', protocol: '', vehicleId: '' });
                  setDeviceErrors({});
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const errors: Record<string, string> = {};

                  if (!deviceForm.imei) {
                    errors.imei = 'IMEI é obrigatório';
                  } else if (!validateIMEI(deviceForm.imei)) {
                    errors.imei = 'Informe um IMEI válido';
                  } else if (
                    isDuplicateIMEI(
                      deviceForm.imei,
                      localDevices
                        .map((device) => ({
                          imei: (device as Partial<Device>).imei || '',
                          id: device.id,
                        }))
                        .filter((entry) => entry.imei)
                    )
                  ) {
                    errors.imei = 'Este IMEI já está cadastrado';
                  }

                  if (!deviceForm.iccid) {
                    errors.iccid = 'ICCID é obrigatório';
                  }

                  if (!deviceForm.model) {
                    errors.model = 'Selecione um modelo';
                  }

                  if (!deviceForm.protocol) {
                    errors.protocol = 'Informe o protocolo';
                  }

                  setDeviceErrors(errors);

                  if (Object.keys(errors).length > 0) {
                    return;
                  }

                  const newDevice: Device = {
                    id: `custom_${Date.now()}`,
                    tenantId: 'default',
                    imei: deviceForm.imei.replace(/\D/g, ''),
                    iccid: deviceForm.iccid,
                    model: deviceForm.model,
                    protocol: deviceForm.protocol,
                    status: 'offline',
                    lastUpdate: new Date().toISOString(),
                    position: undefined,
                    driverId: undefined,
                    vehicleId: deviceForm.vehicleId || undefined,
                  };

                  setLocalDevices((prev) => [...prev, newDevice]);

                  if (deviceForm.vehicleId) {
                    setLocalVehicles((prev) =>
                      prev.map((vehicle) =>
                        vehicle.id === deviceForm.vehicleId
                          ? {
                              ...vehicle,
                              deviceId: newDevice.id,
                            }
                          : vehicle
                      )
                    );
                  }

                  setIsCreateDeviceModalOpen(false);
                  setDeviceForm({ imei: '', iccid: '', model: '', protocol: '', vehicleId: '' });
                  setDeviceErrors({});
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={16} />
                Criar Dispositivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
