import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Truck, Clock, Save, X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Device, Vehicle } from '../../types';
import { mockClients } from '../../data/adminMockData';
import { handleImageUpload, validateImageUrl } from '../../utils/vehicleIcons';
import { useAuth } from '../../context/AuthContext';
import { useDrivers } from '../../context/DriverContext';

type VehicleFormState = {
  plate: string;
  clientId: string;
  trackerId: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  vehicleType: 'car' | 'truck' | 'motorcycle' | 'machine';
  status: 'active' | 'inactive' | 'maintenance';
  chassisNumber: string;
  initialOdometer: string;
  currentOdometer: string;
  photo: string;
};

const createInitialVehicleForm = (): VehicleFormState => ({
  plate: '',
  clientId: '',
  trackerId: '',
  brand: '',
  model: '',
  year: String(new Date().getFullYear()),
  color: '',
  vehicleType: 'truck',
  status: 'active',
  chassisNumber: '',
  initialOdometer: '',
  currentOdometer: '',
  photo: '',
});

const parseIntegerInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

interface VehiclesListProps {
  devices: Device[];
  vehicles: Vehicle[];
}

export const VehiclesList: React.FC<VehiclesListProps> = ({ devices, vehicles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [localDevices, setLocalDevices] = useState<Device[]>(devices);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(vehicles);
  const [isCreateDeviceModalOpen, setIsCreateDeviceModalOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(() => createInitialVehicleForm());
  const [vehicleErrors, setVehicleErrors] = useState<Record<string, string>>({});
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [vehiclePhotoError, setVehiclePhotoError] = useState('');
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [vehicleSubmitError, setVehicleSubmitError] = useState<string | null>(null);
  const { apiFetch } = useAuth();
  const { drivers } = useDrivers();

  useEffect(() => {
    setLocalDevices(devices);
  }, [devices]);

  useEffect(() => {
    setLocalVehicles(vehicles);
  }, [vehicles]);

  const resetVehicleForm = () => {
    setVehicleForm(createInitialVehicleForm());
    setVehicleErrors({});
    setVehiclePhotoError('');
    setIsUploadingPhoto(false);
    setVehicleSubmitError(null);
  };

  const handleVehicleInputChange = <K extends keyof VehicleFormState>(field: K, value: VehicleFormState[K]) => {
    setVehicleForm(prev => ({ ...prev, [field]: value }));
    if (vehicleErrors[field]) {
      setVehicleErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleVehiclePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setVehiclePhotoError('');

    try {
      const photoData = await handleImageUpload(file);
      setVehicleForm(prev => ({ ...prev, photo: photoData }));
    } catch (error) {
      setVehiclePhotoError(error instanceof Error ? error.message : 'Erro ao fazer upload da imagem');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleVehiclePhotoUrl = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setVehicleForm(prev => ({ ...prev, photo: '' }));
      setVehiclePhotoError('');
      return;
    }

    setVehiclePhotoError('');
    const isValid = await validateImageUrl(trimmed);
    if (isValid) {
      setVehicleForm(prev => ({ ...prev, photo: trimmed }));
    } else {
      setVehiclePhotoError('URL da imagem inválida ou inacessível');
    }
  };

  const removeVehiclePhoto = () => {
    setVehicleForm(prev => ({ ...prev, photo: '' }));
    setVehiclePhotoError('');
  };

  const buildTraccarPayload = (
    trackerIdValue: string,
    plateValue: string,
    brandValue: string,
    modelValue: string,
    colorValue: string,
    chassisValue: string,
    ensuredYear: number,
    ensuredInitial: number,
    ensuredCurrent: number,
  ) => {
    const attributes: Record<string, any> = {
      trackerId: trackerIdValue,
      clientId: vehicleForm.clientId,
      brand: brandValue,
      model: modelValue,
      color: colorValue || undefined,
      year: ensuredYear,
      chassisNumber: chassisValue,
      vehicleType: vehicleForm.vehicleType,
      initialOdometer: ensuredInitial,
      currentOdometer: ensuredCurrent,
      photo: vehicleForm.photo || undefined,
      status: vehicleForm.status,
    };

    const cleanedAttributes = Object.entries(attributes).reduce<Record<string, any>>((acc, [key, value]) => {
      if (value === undefined || value === null || value === '') {
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {});

    const payload: Record<string, any> = {
      name: plateValue,
      uniqueId: trackerIdValue,
      trackerId: trackerIdValue,
      plate: plateValue,
      clientId: vehicleForm.clientId,
      brand: brandValue,
      model: modelValue,
      color: colorValue || undefined,
      year: ensuredYear,
      chassisNumber: chassisValue,
      vehicleType: vehicleForm.vehicleType,
      initialOdometer: ensuredInitial,
      currentOdometer: ensuredCurrent,
      photo: vehicleForm.photo || undefined,
      status: vehicleForm.status,
      attributes: cleanedAttributes,
    };

    return Object.entries(payload).reduce<Record<string, any>>((acc, [key, value]) => {
      if (value === undefined || value === null || value === '') {
        return acc;
      }
      if (typeof value === 'string') {
        acc[key] = value.trim();
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {});
  };

  const handleSaveVehicle = async () => {
    if (isSavingVehicle) {
      return;
    }

    const newVehicleErrors: Record<string, string> = {};
    const trackerIdValue = vehicleForm.trackerId.trim();
    let initialOdometerValue = parseIntegerInput(vehicleForm.initialOdometer);
    let currentOdometerValue = parseIntegerInput(vehicleForm.currentOdometer);
    let yearValue = parseIntegerInput(vehicleForm.year);

    if (!vehicleForm.plate.trim()) {
      newVehicleErrors.plate = 'Placa é obrigatória';
    }
    if (!vehicleForm.clientId) {
      newVehicleErrors.clientId = 'Selecione um cliente';
    }
    if (!trackerIdValue) {
      newVehicleErrors.trackerId = 'Informe o IMEI ou ID do rastreador';
    } else if (localDevices.some(device => device.imei === trackerIdValue)) {
      newVehicleErrors.trackerId = 'Este identificador já está vinculado a outro dispositivo';
    }
    if (!vehicleForm.brand.trim()) {
      newVehicleErrors.brand = 'Marca é obrigatória';
    }
    if (!vehicleForm.model.trim()) {
      newVehicleErrors.model = 'Modelo é obrigatório';
    }
    if (yearValue === undefined) {
      newVehicleErrors.year = 'Informe um ano válido';
    } else {
      const currentYear = new Date().getFullYear();
      if (yearValue < 1990 || yearValue > currentYear + 1) {
        newVehicleErrors.year = `Ano deve estar entre 1990 e ${currentYear + 1}`;
      }
    }
    if (!vehicleForm.vehicleType) {
      newVehicleErrors.vehicleType = 'Selecione o tipo do veículo';
    }
    if (!vehicleForm.status) {
      newVehicleErrors.status = 'Selecione o status';
    }
    if (!vehicleForm.chassisNumber.trim()) {
      newVehicleErrors.chassisNumber = 'Número do chassi é obrigatório';
    }

    if (vehicleForm.initialOdometer && initialOdometerValue === undefined) {
      newVehicleErrors.initialOdometer = 'Informe um número válido';
    }
    if (vehicleForm.currentOdometer && currentOdometerValue === undefined) {
      newVehicleErrors.currentOdometer = 'Informe um número válido';
    }
    if (
      initialOdometerValue !== undefined &&
      currentOdometerValue !== undefined &&
      currentOdometerValue < initialOdometerValue
    ) {
      newVehicleErrors.currentOdometer = 'Odômetro atual não pode ser menor que o inicial';
    }

    setVehicleErrors(newVehicleErrors);

    if (Object.keys(newVehicleErrors).length > 0) {
      return;
    }

    if (yearValue === undefined) {
      yearValue = new Date().getFullYear();
    }
    if (initialOdometerValue === undefined) {
      initialOdometerValue = 0;
    }
    if (currentOdometerValue === undefined) {
      currentOdometerValue = initialOdometerValue ?? 0;
    }

    const ensuredYear = yearValue ?? new Date().getFullYear();
    const ensuredInitial = initialOdometerValue ?? 0;
    const ensuredCurrent = currentOdometerValue ?? ensuredInitial;
    const timestamp = Date.now();
    const newVehicleId = `vehicle_${timestamp}`;
    const nextMaintenance = ensuredCurrent + 10000;
    const plateValue = vehicleForm.plate.trim().toUpperCase();
    const brandValue = vehicleForm.brand.trim();
    const modelValue = vehicleForm.model.trim();
    const colorValue = vehicleForm.color.trim();
    const chassisValue = vehicleForm.chassisNumber.trim();

    const payload = buildTraccarPayload(
      trackerIdValue,
      plateValue,
      brandValue,
      modelValue,
      colorValue,
      chassisValue,
      ensuredYear,
      ensuredInitial,
      ensuredCurrent,
    );

    setIsSavingVehicle(true);
    setVehicleSubmitError(null);

    try {
      const createdDevice = await apiFetch<any>('/traccar/devices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const createdAttributes =
        createdDevice?.attributes && typeof createdDevice.attributes === 'object' && !Array.isArray(createdDevice.attributes)
          ? createdDevice.attributes
          : {};

      const resolvedDeviceId = createdDevice?.id != null ? String(createdDevice.id) : `device_${timestamp}`;
      const resolvedTrackerId = createdDevice?.uniqueId != null ? String(createdDevice.uniqueId) : trackerIdValue;
      const resolvedStatus = typeof createdDevice?.status === 'string' ? createdDevice.status.toLowerCase() : 'offline';
      const normalizedStatus: Device['status'] =
        resolvedStatus === 'online'
          ? 'online'
          : resolvedStatus === 'inactive'
            ? 'inactive'
            : 'offline';
      const resolvedModel =
        (createdDevice?.model as string) ||
        (createdDevice?.category as string) ||
        (createdAttributes?.model as string) ||
        modelValue ||
        'Veículo';
      const resolvedProtocol =
        typeof createdDevice?.protocol === 'string' && createdDevice.protocol.trim() ? createdDevice.protocol : 'GT06';
      const resolvedLastUpdate =
        (createdDevice?.lastUpdate as string) || (createdDevice?.createTime as string) || new Date().toISOString();
      const resolvedTenant =
        typeof createdDevice?.tenantId === 'string' && createdDevice.tenantId.trim()
          ? createdDevice.tenantId
          : 'default';

      const newVehicle: Vehicle = {
        id: newVehicleId,
        tenantId: resolvedTenant,
        clientId: vehicleForm.clientId,
        plate: plateValue,
        model: modelValue,
        year: ensuredYear,
        brand: brandValue,
        fuelType: 'diesel',
        deviceId: resolvedDeviceId,
        driverId: undefined,
        status: vehicleForm.status,
        odometer: ensuredCurrent,
        nextMaintenance,
        vehicleType: vehicleForm.vehicleType,
        photo: vehicleForm.photo || undefined,
        color: colorValue || undefined,
        chassisNumber: chassisValue,
        initialOdometer: ensuredInitial,
        currentOdometer: ensuredCurrent,
        trackerId: resolvedTrackerId,
      };

      const iccid =
        typeof createdAttributes?.iccid === 'string'
          ? createdAttributes.iccid
          : typeof createdDevice?.iccid === 'string'
            ? createdDevice.iccid
            : '';

      const newDevice: Device = {
        id: resolvedDeviceId,
        tenantId: resolvedTenant,
        imei: resolvedTrackerId,
        iccid,
        model: resolvedModel,
        protocol: resolvedProtocol,
        status: normalizedStatus,
        lastUpdate: resolvedLastUpdate,
        position: undefined,
        driverId: undefined,
        vehicleId: newVehicleId,
      };

      setLocalVehicles(prev => [...prev, newVehicle]);
      setLocalDevices(prev => [...prev, newDevice]);

      setIsCreateDeviceModalOpen(false);
      resetVehicleForm();
    } catch (error) {
      console.error('Erro ao salvar veículo no Traccar:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o veículo';
      setVehicleSubmitError(message);
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const getVehicleForDevice = (deviceId: string) => {
    return localVehicles.find(v => v.deviceId === deviceId);
  };

  const getDriverForDevice = (deviceId: string) => {
    const vehicle = getVehicleForDevice(deviceId);
    if (!vehicle) {
      return undefined;
    }
    return drivers.find(driver => driver.vehicleId === vehicle.id);
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
          onClick={() => {
            setIsCreateDeviceModalOpen(true);
            setVehicleSubmitError(null);
          }}
          className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white px-2 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Adicionar Veículo</span>
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
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Novo Veículo</h3>
                <p className="text-sm text-gray-600">Cadastre um veículo e vincule o rastreador correspondente</p>
              </div>
              <button
                onClick={() => {
                  setIsCreateDeviceModalOpen(false);
                  resetVehicleForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              <div className="space-y-6 bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Placa *</label>
                    <input
                      type="text"
                      value={vehicleForm.plate}
                      onChange={(e) => handleVehicleInputChange('plate', e.target.value)}
                      placeholder="ABC1234"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.plate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {vehicleErrors.plate && <p className="text-xs text-red-600 mt-1">{vehicleErrors.plate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                    <select
                      value={vehicleForm.clientId}
                      onChange={(e) => handleVehicleInputChange('clientId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.clientId ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecione um cliente</option>
                      {mockClients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                    {vehicleErrors.clientId && <p className="text-xs text-red-600 mt-1">{vehicleErrors.clientId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IMEI / ID do Rastreador *</label>
                    <input
                      type="text"
                      value={vehicleForm.trackerId}
                      onChange={(e) => handleVehicleInputChange('trackerId', e.target.value)}
                      placeholder="860123456789012"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.trackerId ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">Este identificador será utilizado como uniqueId no Traccar.</p>
                    {vehicleErrors.trackerId && <p className="text-xs text-red-600 mt-1">{vehicleErrors.trackerId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marca *</label>
                    <input
                      type="text"
                      value={vehicleForm.brand}
                      onChange={(e) => handleVehicleInputChange('brand', e.target.value)}
                      placeholder="Scania"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.brand ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {vehicleErrors.brand && <p className="text-xs text-red-600 mt-1">{vehicleErrors.brand}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modelo *</label>
                    <input
                      type="text"
                      value={vehicleForm.model}
                      onChange={(e) => handleVehicleInputChange('model', e.target.value)}
                      placeholder="R450"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.model ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {vehicleErrors.model && <p className="text-xs text-red-600 mt-1">{vehicleErrors.model}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ano *</label>
                    <input
                      type="number"
                      value={vehicleForm.year}
                      onChange={(e) => handleVehicleInputChange('year', e.target.value)}
                      placeholder="2025"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.year ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {vehicleErrors.year && <p className="text-xs text-red-600 mt-1">{vehicleErrors.year}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
                    <input
                      type="text"
                      value={vehicleForm.color}
                      onChange={(e) => handleVehicleInputChange('color', e.target.value)}
                      placeholder="Branco"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Veículo *</label>
                    <select
                      value={vehicleForm.vehicleType}
                      onChange={(e) => handleVehicleInputChange('vehicleType', e.target.value as VehicleFormState['vehicleType'])}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.vehicleType ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="car">Carro</option>
                      <option value="truck">Caminhão</option>
                      <option value="motorcycle">Moto</option>
                      <option value="machine">Máquina</option>
                    </select>
                    {vehicleErrors.vehicleType && <p className="text-xs text-red-600 mt-1">{vehicleErrors.vehicleType}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                    <select
                      value={vehicleForm.status}
                      onChange={(e) => handleVehicleInputChange('status', e.target.value as VehicleFormState['status'])}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.status ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                      <option value="maintenance">Manutenção</option>
                    </select>
                    {vehicleErrors.status && <p className="text-xs text-red-600 mt-1">{vehicleErrors.status}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número do Chassi *</label>
                  <input
                    type="text"
                    value={vehicleForm.chassisNumber}
                    onChange={(e) => handleVehicleInputChange('chassisNumber', e.target.value)}
                    placeholder="9BSC4X2008R123456"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      vehicleErrors.chassisNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {vehicleErrors.chassisNumber && <p className="text-xs text-red-600 mt-1">{vehicleErrors.chassisNumber}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Odômetro Inicial (km)</label>
                    <input
                      type="number"
                      value={vehicleForm.initialOdometer}
                      onChange={(e) => handleVehicleInputChange('initialOdometer', e.target.value)}
                      placeholder="0"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.initialOdometer ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {vehicleErrors.initialOdometer && <p className="text-xs text-red-600 mt-1">{vehicleErrors.initialOdometer}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Odômetro Atual (km)</label>
                    <input
                      type="number"
                      value={vehicleForm.currentOdometer}
                      onChange={(e) => handleVehicleInputChange('currentOdometer', e.target.value)}
                      placeholder="45872"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        vehicleErrors.currentOdometer ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {vehicleErrors.currentOdometer && <p className="text-xs text-red-600 mt-1">{vehicleErrors.currentOdometer}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Veículo</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Esta foto será usada como ícone personalizado no mapa. Recomendado: imagem quadrada, máximo 5MB.
                  </p>

                  {vehicleForm.photo && (
                    <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <img
                          src={vehicleForm.photo}
                          alt="Foto do veículo"
                          className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                          onError={() => setVehiclePhotoError('Erro ao carregar imagem')}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Foto atual</p>
                          <p className="text-xs text-gray-500">Esta imagem será usada no mapa</p>
                        </div>
                        <button
                          type="button"
                          onClick={removeVehiclePhoto}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover foto"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleVehiclePhotoUpload}
                          className="hidden"
                          disabled={isUploadingPhoto}
                        />
                        <div
                          className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${
                            isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-700">
                            {isUploadingPhoto ? 'Fazendo upload...' : 'Clique para fazer upload'}
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG até 5MB</p>
                        </div>
                      </label>
                    </div>

                    <div className="relative">
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                          <ImageIcon size={16} />
                        </span>
                        <input
                          type="url"
                          placeholder="Ou cole a URL de uma imagem..."
                          onBlur={(e) => handleVehiclePhotoUrl(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {vehiclePhotoError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                      {vehiclePhotoError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsCreateDeviceModalOpen(false);
                  resetVehicleForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveVehicle}
                disabled={isSavingVehicle}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingVehicle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                {isSavingVehicle ? 'Salvando...' : 'Salvar Veículo'}
              </button>
              {vehicleSubmitError && (
                <p className="text-sm text-red-600 text-center">{vehicleSubmitError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
