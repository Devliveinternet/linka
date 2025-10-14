import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Truck, Clock, Save, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Device, Vehicle, Driver } from '../../types';
import { equipmentModels } from '../../data/equipmentData';
import { validateIMEI, formatIMEI, isDuplicateIMEI } from '../../utils/imeiValidator';
import { mockClients } from '../../data/adminMockData';
import { handleImageUpload, validateImageUrl } from '../../utils/vehicleIcons';

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
  });
  const [deviceErrors, setDeviceErrors] = useState<Record<string, string>>({});
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(() => createInitialVehicleForm());
  const [vehicleErrors, setVehicleErrors] = useState<Record<string, string>>({});
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [vehiclePhotoError, setVehiclePhotoError] = useState('');

  useEffect(() => {
    setLocalDevices(devices);
  }, [devices]);

  useEffect(() => {
    setLocalVehicles(vehicles);
  }, [vehicles]);

  useEffect(() => {
    if (deviceForm.imei) {
      setVehicleForm(prev => (prev.trackerId ? prev : { ...prev, trackerId: deviceForm.imei }));
    }
  }, [deviceForm.imei]);

  const resetVehicleForm = () => {
    setVehicleForm(createInitialVehicleForm());
    setVehicleErrors({});
    setVehiclePhotoError('');
    setIsUploadingPhoto(false);
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
                  setDeviceForm({ imei: '', iccid: '', model: '', protocol: '' });
                  setDeviceErrors({});
                  resetVehicleForm();
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

                <div className="md:col-span-2 space-y-4">
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
                          placeholder="2023"
                          min="1990"
                          max={new Date().getFullYear() + 1}
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
                  setDeviceForm({ imei: '', iccid: '', model: '', protocol: '' });
                  setDeviceErrors({});
                  resetVehicleForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const newDeviceErrors: Record<string, string> = {};

                  if (!deviceForm.imei) {
                    newDeviceErrors.imei = 'IMEI é obrigatório';
                  } else if (!validateIMEI(deviceForm.imei)) {
                    newDeviceErrors.imei = 'Informe um IMEI válido';
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
                    newDeviceErrors.imei = 'Este IMEI já está cadastrado';
                  }

                  if (!deviceForm.iccid) {
                    newDeviceErrors.iccid = 'ICCID é obrigatório';
                  }

                  if (!deviceForm.model) {
                    newDeviceErrors.model = 'Selecione um modelo';
                  }

                  if (!deviceForm.protocol) {
                    newDeviceErrors.protocol = 'Informe o protocolo';
                  }

                  setDeviceErrors(newDeviceErrors);

                  if (Object.keys(newDeviceErrors).length > 0) {
                    return;
                  }

                  let yearValue = parseIntegerInput(vehicleForm.year);
                  let initialOdometerValue = parseIntegerInput(vehicleForm.initialOdometer);
                  let currentOdometerValue = parseIntegerInput(vehicleForm.currentOdometer);
                  const newVehicleErrors: Record<string, string> = {};

                  if (!vehicleForm.plate.trim()) {
                    newVehicleErrors.plate = 'Placa é obrigatória';
                  }
                  if (!vehicleForm.clientId) {
                    newVehicleErrors.clientId = 'Cliente é obrigatório';
                  }
                  if (!vehicleForm.trackerId.trim()) {
                    newVehicleErrors.trackerId = 'Informe um identificador de rastreador';
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
                    currentOdometerValue = initialOdometerValue;
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
                    vehicleId: undefined,
                  };

                  const ensuredYear = yearValue ?? new Date().getFullYear();
                  const ensuredInitial = initialOdometerValue ?? 0;
                  const ensuredCurrent = currentOdometerValue ?? ensuredInitial;
                  const newVehicleId = `vehicle_${Date.now()}`;
                  const nextMaintenance = ensuredCurrent + 10000;
                  const trackerIdValue = (vehicleForm.trackerId || deviceForm.imei).trim();
                  const plateValue = vehicleForm.plate.trim().toUpperCase();
                  const brandValue = vehicleForm.brand.trim();
                  const modelValue = vehicleForm.model.trim();
                  const colorValue = vehicleForm.color.trim();
                  const chassisValue = vehicleForm.chassisNumber.trim();

                  const newVehicle: Vehicle = {
                    id: newVehicleId,
                    tenantId: 'default',
                    clientId: vehicleForm.clientId,
                    plate: plateValue,
                    model: modelValue,
                    year: ensuredYear,
                    brand: brandValue,
                    fuelType: 'diesel',
                    status: vehicleForm.status,
                    odometer: ensuredCurrent,
                    nextMaintenance,
                    vehicleType: vehicleForm.vehicleType,
                    photo: vehicleForm.photo || undefined,
                    color: colorValue || undefined,
                    chassisNumber: chassisValue,
                    initialOdometer: ensuredInitial,
                    currentOdometer: ensuredCurrent,
                    trackerId: trackerIdValue,
                    deviceId: newDevice.id,
                  };

                  newDevice.vehicleId = newVehicleId;

                  setLocalVehicles(prev => [...prev, newVehicle]);
                  setLocalDevices((prev) => [...prev, newDevice]);

                  setIsCreateDeviceModalOpen(false);
                  setDeviceForm({ imei: '', iccid: '', model: '', protocol: '' });
                  setDeviceErrors({});
                  setVehicleErrors({});
                  resetVehicleForm();
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
