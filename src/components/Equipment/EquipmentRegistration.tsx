import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Smartphone, 
  Truck, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Save,
  Link,
  Settings,
  Wifi
} from 'lucide-react';
import { Equipment, EquipmentModel, M2MProvider, VehicleRegistration, EquipmentLog } from '../../types/equipment';
import { AdminVehicle, Client } from '../../types/admin';
import { equipmentModels, m2mProviders, mockEquipments, mockEquipmentLogs } from '../../data/equipmentData';
import { mockAdminVehicles, mockClients } from '../../data/adminMockData';
import { validateIMEI, formatIMEI, isDuplicateIMEI } from '../../utils/imeiValidator';

export const EquipmentRegistration: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>(mockEquipments);
  const [logs, setLogs] = useState<EquipmentLog[]>(mockEquipmentLogs);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>(mockAdminVehicles);
  
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [equipmentData, setEquipmentData] = useState({
    imei: '',
    model: '',
    provider: '',
    status: 'configuring' as const,
    clientId: ''
  });
  
  const [vehicleData, setVehicleData] = useState<VehicleRegistration>({
    plate: '',
    renavam: '',
    type: 'car',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: ''
  });
  
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [createNewVehicle, setCreateNewVehicle] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredEquipments = equipments.filter(equipment => {
    const model = equipmentModels.find(m => m.id === equipment.model);
    const client = mockClients.find(c => c.id === equipment.clientId);
    const vehicle = vehicles.find(v => v.id === equipment.vehicleId);
    
    return !searchTerm || 
      equipment.imei.includes(searchTerm) ||
      model?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!equipmentData.imei) {
      newErrors.imei = 'IMEI é obrigatório';
    } else if (!validateIMEI(equipmentData.imei)) {
      newErrors.imei = 'IMEI inválido (checksum incorreto)';
    } else if (isDuplicateIMEI(equipmentData.imei, equipments)) {
      newErrors.imei = 'IMEI já cadastrado no sistema';
    }
    
    if (!equipmentData.model) {
      newErrors.model = 'Modelo é obrigatório';
    }
    
    if (!equipmentData.provider) {
      newErrors.provider = 'Provedor é obrigatório';
    }
    
    if (!equipmentData.clientId) {
      newErrors.clientId = 'Cliente é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (createNewVehicle) {
      if (!vehicleData.plate) {
        newErrors.plate = 'Placa é obrigatória';
      }
      if (!vehicleData.type) {
        newErrors.type = 'Tipo de veículo é obrigatório';
      }
    } else if (!selectedVehicle) {
      newErrors.vehicle = 'Selecione um veículo ou crie um novo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    try {
      // Create new vehicle if needed
      let vehicleId = selectedVehicle;
      if (createNewVehicle) {
        const newVehicle: AdminVehicle = {
          id: `av_${Date.now()}`,
          clientId: equipmentData.clientId,
          plate: vehicleData.plate,
          model: vehicleData.model || '',
          brand: vehicleData.brand || '',
          year: vehicleData.year || new Date().getFullYear(),
          color: vehicleData.color || '',
          chassisNumber: `CHASSIS_${Date.now()}`,
          vehicleType: vehicleData.type,
          initialOdometer: 0,
          currentOdometer: 0,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        
        setVehicles(prev => [...prev, newVehicle]);
        vehicleId = newVehicle.id;
      }

      // Get model configuration
      const model = equipmentModels.find(m => m.id === equipmentData.model);
      const provider = m2mProviders.find(p => p.id === equipmentData.provider);

      // Create equipment
      const newEquipment: Equipment = {
        id: `eq_${Date.now()}`,
        imei: equipmentData.imei.replace(/\D/g, ''),
        model: equipmentData.model,
        provider: equipmentData.provider,
        status: equipmentData.status,
        vehicleId,
        clientId: equipmentData.clientId,
        apnConfig: {
          apn: provider?.apn || 'gprs.tim.br',
          username: '',
          password: ''
        },
        serverConfig: {
          ip: model?.defaultConfig.serverIp || '200.123.45.67',
          port: model?.defaultConfig.serverPort || 5023,
          protocol: model?.protocol || 'GT06'
        },
        createdAt: new Date().toISOString(),
        activatedAt: equipmentData.status === 'active' ? new Date().toISOString() : undefined,
        lastConfigUpdate: new Date().toISOString()
      };

      setEquipments(prev => [...prev, newEquipment]);

      // Create logs
      const registrationLog: EquipmentLog = {
        id: `log_${Date.now()}_1`,
        equipmentId: newEquipment.id,
        type: 'registration',
        message: `Equipamento ${model?.name} registrado no sistema`,
        details: { 
          imei: newEquipment.imei, 
          model: model?.name,
          provider: provider?.name 
        },
        timestamp: new Date().toISOString(),
        userId: 'current_user'
      };

      const linkingLog: EquipmentLog = {
        id: `log_${Date.now()}_2`,
        equipmentId: newEquipment.id,
        type: 'linking',
        message: `Equipamento vinculado ao veículo ${vehicleData.plate || vehicles.find(v => v.id === vehicleId)?.plate}`,
        details: { 
          vehicleId, 
          plate: vehicleData.plate || vehicles.find(v => v.id === vehicleId)?.plate 
        },
        timestamp: new Date().toISOString(),
        userId: 'current_user'
      };

      const configLog: EquipmentLog = {
        id: `log_${Date.now()}_3`,
        equipmentId: newEquipment.id,
        type: 'configuration',
        message: 'Configuração inicial enviada para o equipamento',
        details: {
          apn: newEquipment.apnConfig?.apn,
          serverIp: newEquipment.serverConfig?.ip,
          serverPort: newEquipment.serverConfig?.port
        },
        timestamp: new Date().toISOString(),
        userId: 'current_user'
      };

      setLogs(prev => [...prev, registrationLog, linkingLog, configLog]);

      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      alert('Equipamento registrado e configurado com sucesso!');
    } catch (error) {
      console.error('Error registering equipment:', error);
      alert('Erro ao registrar equipamento. Tente novamente.');
    }
  };

  const resetForm = () => {
    setEquipmentData({
      imei: '',
      model: '',
      provider: '',
      status: 'configuring',
      clientId: ''
    });
    setVehicleData({
      plate: '',
      renavam: '',
      type: 'car',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      color: ''
    });
    setSelectedVehicle('');
    setCreateNewVehicle(false);
    setCurrentStep(1);
    setErrors({});
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      configuring: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const getModelName = (modelId: string) => {
    return equipmentModels.find(m => m.id === modelId)?.name || modelId;
  };

  const getProviderName = (providerId: string) => {
    return m2mProviders.find(p => p.id === providerId)?.name || providerId;
  };

  const getClientName = (clientId: string) => {
    return mockClients.find(c => c.id === clientId)?.name || 'N/A';
  };

  const getVehiclePlate = (vehicleId?: string) => {
    return vehicleId ? vehicles.find(v => v.id === vehicleId)?.plate || 'N/A' : 'Não vinculado';
  };

  const availableVehicles = vehicles.filter(v => 
    v.clientId === equipmentData.clientId && 
    !equipments.some(eq => eq.vehicleId === v.id)
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Dados do Equipamento</h3>
        <p className="text-sm text-gray-600">Informações básicas do rastreador</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente *
          </label>
          <select
            value={equipmentData.clientId}
            onChange={(e) => setEquipmentData(prev => ({ ...prev, clientId: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.clientId ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Selecione um cliente</option>
            {mockClients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          {errors.clientId && <p className="text-red-600 text-xs mt-1">{errors.clientId}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            IMEI *
          </label>
          <input
            type="text"
            value={equipmentData.imei}
            onChange={(e) => setEquipmentData(prev => ({ ...prev, imei: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.imei ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="860123456789012"
            maxLength={15}
          />
          {errors.imei && <p className="text-red-600 text-xs mt-1">{errors.imei}</p>}
          {equipmentData.imei && validateIMEI(equipmentData.imei) && (
            <p className="text-green-600 text-xs mt-1">✓ IMEI válido</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modelo do Equipamento *
          </label>
          <select
            value={equipmentData.model}
            onChange={(e) => setEquipmentData(prev => ({ ...prev, model: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.model ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Selecione o modelo</option>
            {equipmentModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.manufacturer}
              </option>
            ))}
          </select>
          {errors.model && <p className="text-red-600 text-xs mt-1">{errors.model}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provedor M2M *
          </label>
          <select
            value={equipmentData.provider}
            onChange={(e) => setEquipmentData(prev => ({ ...prev, provider: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.provider ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Selecione o provedor</option>
            {m2mProviders.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name} - {provider.pricing}
              </option>
            ))}
          </select>
          {errors.provider && <p className="text-red-600 text-xs mt-1">{errors.provider}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status Inicial
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="configuring"
                checked={equipmentData.status === 'configuring'}
                onChange={(e) => setEquipmentData(prev => ({ ...prev, status: e.target.value as any }))}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Em configuração</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="active"
                checked={equipmentData.status === 'active'}
                onChange={(e) => setEquipmentData(prev => ({ ...prev, status: e.target.value as any }))}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Ativo</span>
            </label>
          </div>
        </div>
      </div>

      {/* Model Details */}
      {equipmentData.model && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Detalhes do Modelo</h4>
          {(() => {
            const model = equipmentModels.find(m => m.id === equipmentData.model);
            return model ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Protocolo:</span> {model.protocol}</p>
                <p><span className="font-medium">Recursos:</span> {model.features.join(', ')}</p>
                <p><span className="font-medium">Servidor padrão:</span> {model.defaultConfig.serverIp}:{model.defaultConfig.serverPort}</p>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Vinculação com Veículo</h3>
        <p className="text-sm text-gray-600">Selecione um veículo existente ou cadastre um novo</p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!createNewVehicle}
              onChange={() => setCreateNewVehicle(false)}
              className="text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Selecionar veículo existente</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={createNewVehicle}
              onChange={() => setCreateNewVehicle(true)}
              className="text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Cadastrar novo veículo</span>
          </label>
        </div>

        {!createNewVehicle ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Veículo Disponível
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.vehicle ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Selecione um veículo</option>
              {availableVehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.brand} {vehicle.model} ({vehicle.year})
                </option>
              ))}
            </select>
            {errors.vehicle && <p className="text-red-600 text-xs mt-1">{errors.vehicle}</p>}
            
            {availableVehicles.length === 0 && (
              <p className="text-yellow-600 text-sm mt-2">
                Nenhum veículo disponível para este cliente. Cadastre um novo veículo.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placa *
              </label>
              <input
                type="text"
                value={vehicleData.plate}
                onChange={(e) => setVehicleData(prev => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.plate ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="ABC1234"
                maxLength={7}
              />
              {errors.plate && <p className="text-red-600 text-xs mt-1">{errors.plate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RENAVAM
              </label>
              <input
                type="text"
                value={vehicleData.renavam}
                onChange={(e) => setVehicleData(prev => ({ ...prev, renavam: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="12345678901"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Veículo *
              </label>
              <select
                value={vehicleData.type}
                onChange={(e) => setVehicleData(prev => ({ ...prev, type: e.target.value as any }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.type ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="car">Carro</option>
                <option value="truck">Caminhão</option>
                <option value="motorcycle">Moto</option>
                <option value="machine">Máquina</option>
              </select>
              {errors.type && <p className="text-red-600 text-xs mt-1">{errors.type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca
              </label>
              <input
                type="text"
                value={vehicleData.brand}
                onChange={(e) => setVehicleData(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Scania"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo
              </label>
              <input
                type="text"
                value={vehicleData.model}
                onChange={(e) => setVehicleData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="R450"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ano
              </label>
              <input
                type="number"
                value={vehicleData.year}
                onChange={(e) => setVehicleData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1990"
                max="2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cor
              </label>
              <input
                type="text"
                value={vehicleData.color}
                onChange={(e) => setVehicleData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Branco"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => {
    const model = equipmentModels.find(m => m.id === equipmentData.model);
    const provider = m2mProviders.find(p => p.id === equipmentData.provider);
    const client = mockClients.find(c => c.id === equipmentData.clientId);
    const vehicle = createNewVehicle ? vehicleData : vehicles.find(v => v.id === selectedVehicle);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmação e Ativação</h3>
          <p className="text-sm text-gray-600">Revise as informações antes de finalizar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equipment Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <Smartphone size={16} />
              Equipamento
            </h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">IMEI:</span> {formatIMEI(equipmentData.imei)}</p>
              <p><span className="font-medium">Modelo:</span> {model?.name}</p>
              <p><span className="font-medium">Protocolo:</span> {model?.protocol}</p>
              <p><span className="font-medium">Provedor:</span> {provider?.name}</p>
              <p><span className="font-medium">Cliente:</span> {client?.name}</p>
            </div>
          </div>

          {/* Vehicle Summary */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
              <Truck size={16} />
              Veículo
            </h4>
            <div className="space-y-2 text-sm">
              {createNewVehicle ? (
                <>
                  <p><span className="font-medium">Placa:</span> {vehicleData.plate}</p>
                  <p><span className="font-medium">Tipo:</span> {vehicleData.type}</p>
                  <p><span className="font-medium">Marca:</span> {vehicleData.brand || 'N/A'}</p>
                  <p><span className="font-medium">Modelo:</span> {vehicleData.model || 'N/A'}</p>
                  <p><span className="font-medium">Ano:</span> {vehicleData.year}</p>
                </>
              ) : (
                <>
                  <p><span className="font-medium">Placa:</span> {vehicle?.plate}</p>
                  <p><span className="font-medium">Modelo:</span> {vehicle?.brand} {vehicle?.model}</p>
                  <p><span className="font-medium">Ano:</span> {vehicle?.year}</p>
                  <p><span className="font-medium">Tipo:</span> {vehicle?.vehicleType}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Settings size={16} />
            Configuração que será enviada
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><span className="font-medium">APN:</span> {provider?.apn}</p>
              <p><span className="font-medium">Servidor:</span> {model?.defaultConfig.serverIp}</p>
              <p><span className="font-medium">Porta:</span> {model?.defaultConfig.serverPort}</p>
            </div>
            <div>
              <p><span className="font-medium">Protocolo:</span> {model?.protocol}</p>
              <p><span className="font-medium">Status inicial:</span> {equipmentData.status === 'active' ? 'Ativo' : 'Em configuração'}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Atenção</p>
              <p className="text-yellow-700">
                Após a confirmação, o equipamento será registrado no sistema e receberá as configurações automaticamente. 
                Certifique-se de que o chip M2M está ativo e o equipamento está ligado.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipamentos</h1>
          <p className="text-gray-600">Registro e configuração de rastreadores</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Adicionar Equipamento
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por IMEI, modelo, cliente ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
      </div>

      {/* Equipment List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Equipamento</th>
                <th className="text-left p-4 font-semibold text-gray-900">Cliente</th>
                <th className="text-left p-4 font-semibold text-gray-900">Veículo</th>
                <th className="text-left p-4 font-semibold text-gray-900">Provedor</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900">Última Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEquipments.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Smartphone className="text-green-600" size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{getModelName(equipment.model)}</div>
                        <div className="text-sm text-gray-600">IMEI: {formatIMEI(equipment.imei)}</div>
                        <div className="text-xs text-gray-500">
                          Criado: {new Date(equipment.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium text-gray-900">
                      {getClientName(equipment.clientId)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium text-gray-900">
                      {getVehiclePlate(equipment.vehicleId)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-900">
                      {getProviderName(equipment.provider)}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(equipment.status)}`}>
                      {equipment.status === 'active' ? 'Ativo' : 
                       equipment.status === 'configuring' ? 'Configurando' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-600">
                      {equipment.lastConfigUpdate ? 
                        new Date(equipment.lastConfigUpdate).toLocaleDateString('pt-BR') : 
                        'Nunca'
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Adicionar Equipamento</h3>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step <= currentStep 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step}
                      </div>
                      {step < 3 && (
                        <div className={`w-8 h-0.5 ${
                          step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {currentStep === 1 && 'Dados do Equipamento'}
                  {currentStep === 2 && 'Vinculação com Veículo'}
                  {currentStep === 3 && 'Confirmação e Ativação'}
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div>
                {currentStep > 1 && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Voltar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                {currentStep < 3 ? (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    onClick={handleFinish}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle size={16} />
                    Finalizar Registro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredEquipments.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum equipamento encontrado</h3>
          <p className="text-gray-600">Adicione seu primeiro equipamento para começar.</p>
        </div>
      )}
    </div>
  );
};