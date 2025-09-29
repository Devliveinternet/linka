import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Smartphone, Wifi, WifiOff, Battery, Signal, X, Save } from 'lucide-react';
import { AdminDevice, Client, AdminVehicle } from '../../types/admin';
import { mockAdminDevices, mockClients, mockAdminVehicles } from '../../data/adminMockData';
import { validateIMEI, formatIMEI, isDuplicateIMEI } from '../../utils/imeiValidator';
import { equipmentModels, m2mProviders } from '../../data/equipmentData';

export const DevicesManagement: React.FC = () => {
  const [devices, setDevices] = useState<AdminDevice[]>(mockAdminDevices);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AdminDevice | null>(null);
  const [formData, setFormData] = useState<Partial<AdminDevice>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getClientName = (clientId: string) => {
    return mockClients.find(c => c.id === clientId)?.name || 'N/A';
  };

  const getVehicleInfo = (vehicleId?: string) => {
    return vehicleId ? mockAdminVehicles.find(v => v.id === vehicleId) : undefined;
  };

  const filteredDevices = devices.filter(device => {
    const clientName = getClientName(device.clientId);
    const vehicle = getVehicleInfo(device.vehicleId);
    
    const matchesSearch = !searchTerm || 
      device.imei.includes(searchTerm) ||
      device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || device.activationStatus === filterStatus;
    const matchesClient = filterClient === 'all' || device.clientId === filterClient;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const getConnectionStatus = (lastConnection?: string) => {
    if (!lastConnection) return { status: 'never', color: 'text-gray-400', label: 'Nunca conectado' };
    
    const now = new Date();
    const lastConn = new Date(lastConnection);
    const diffMs = now.getTime() - lastConn.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) return { status: 'online', color: 'text-green-600', label: 'Online' };
    if (diffMins < 60) return { status: 'recent', color: 'text-yellow-600', label: `${diffMins}min atrás` };
    return { status: 'offline', color: 'text-red-600', label: 'Offline' };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.imei) {
      newErrors.imei = 'IMEI é obrigatório';
    } else if (!validateIMEI(formData.imei)) {
      newErrors.imei = 'IMEI inválido (checksum incorreto)';
    } else if (isDuplicateIMEI(formData.imei, devices.map(d => ({ imei: d.imei, id: d.id })), editingDevice?.id)) {
      newErrors.imei = 'IMEI já cadastrado no sistema';
    }
    
    if (!formData.clientId) {
      newErrors.clientId = 'Cliente é obrigatório';
    }
    
    if (!formData.serialNumber) {
      newErrors.serialNumber = 'Número serial é obrigatório';
    }
    
    if (!formData.model) {
      newErrors.model = 'Modelo é obrigatório';
    }
    
    if (!formData.protocol) {
      newErrors.protocol = 'Protocolo é obrigatório';
    }
    
    if (!formData.iccid) {
      newErrors.iccid = 'ICCID é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (device: AdminDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setShowEditModal(true);
  };

  const handleDelete = (deviceId: string) => {
    if (confirm('Tem certeza que deseja excluir este dispositivo?')) {
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    }
  };

  const handleActivate = (deviceId: string) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, activationStatus: 'active' } : d
    ));
  };

  const handleSuspend = (deviceId: string) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, activationStatus: 'suspended' } : d
    ));
  };

  const handleSaveEdit = () => {
    if (!validateForm()) return;
    
    if (editingDevice && formData) {
      // Editing existing device
      setDevices(prev => prev.map(d => 
        d.id === editingDevice.id ? { ...d, ...formData } as AdminDevice : d
      ));
    } else if (formData) {
      // Creating new device
      const newDevice: AdminDevice = {
        id: `ad_${Date.now()}`,
        clientId: formData.clientId || '',
        vehicleId: formData.vehicleId,
        imei: formData.imei?.replace(/\D/g, '') || '',
        serialNumber: formData.serialNumber || '',
        model: formData.model || '',
        protocol: formData.protocol || '',
        iccid: formData.iccid || '',
        firmwareVersion: formData.firmwareVersion || '1.0.0',
        activationStatus: formData.activationStatus || 'pending',
        lastConnection: undefined,
        signalStrength: undefined,
        batteryLevel: undefined,
        createdAt: new Date().toISOString()
      };
      
      setDevices(prev => [...prev, newDevice]);
    }
    
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingDevice(null);
    setFormData({});
    setErrors({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getAvailableVehicles = () => {
    return mockAdminVehicles.filter(v => 
      v.clientId === formData.clientId && 
      (!devices.some(d => d.vehicleId === v.id) || v.id === editingDevice?.vehicleId)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Dispositivos</h2>
          <p className="text-gray-600">Provisionamento e gerenciamento de rastreadores</p>
        </div>
        <button 
          onClick={() => {
            setEditingDevice(null);
            setFormData({});
            setShowEditModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Provisionar Dispositivo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por IMEI, serial, modelo, cliente ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os Clientes</option>
            {mockClients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="pending">Pendente</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Dispositivo</th>
                <th className="text-left p-4 font-semibold text-gray-900">Cliente</th>
                <th className="text-left p-4 font-semibold text-gray-900">Veículo</th>
                <th className="text-left p-4 font-semibold text-gray-900">Conectividade</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDevices.map((device) => {
                const vehicle = getVehicleInfo(device.vehicleId);
                const connection = getConnectionStatus(device.lastConnection);
                
                return (
                  <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Smartphone className="text-green-600" size={20} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{device.model}</div>
                          <div className="text-sm text-gray-600">
                            IMEI: {device.imei}
                          </div>
                          <div className="text-xs text-gray-500">
                            Serial: {device.serialNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            Firmware: v{device.firmwareVersion}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">
                        {getClientName(device.clientId)}
                      </div>
                    </td>
                    <td className="p-4">
                      {vehicle ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{vehicle.plate}</div>
                          <div className="text-gray-600">{vehicle.brand} {vehicle.model}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Não vinculado</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {connection.status === 'online' ? (
                            <Wifi className="text-green-500" size={14} />
                          ) : (
                            <WifiOff className="text-red-500" size={14} />
                          )}
                          <span className={`text-sm font-medium ${connection.color}`}>
                            {connection.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {device.signalStrength && (
                            <div className="flex items-center gap-1">
                              <Signal size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-600">{device.signalStrength}%</span>
                            </div>
                          )}
                          {device.batteryLevel && (
                            <div className="flex items-center gap-1">
                              <Battery size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-600">{device.batteryLevel}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(device.activationStatus)}`}>
                          {device.activationStatus === 'active' ? 'Ativo' :
                           device.activationStatus === 'pending' ? 'Pendente' :
                           device.activationStatus === 'suspended' ? 'Suspenso' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(device)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {/* View details */}}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </button>
                        {device.activationStatus === 'active' ? (
                          <button
                            onClick={() => handleSuspend(device.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Suspender"
                          >
                            <WifiOff size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(device.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Ativar"
                          >
                            <Wifi size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(device.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDevices.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dispositivo encontrado</h3>
          <p className="text-gray-600">Tente ajustar os filtros ou provisionar novos dispositivos.</p>
        </div>
      )}

      {/* Edit/Create Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDevice ? 'Editar Dispositivo' : 'Novo Dispositivo'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <select
                    value={formData.clientId || ''}
                    onChange={(e) => handleInputChange('clientId', e.target.value)}
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
                    value={formData.imei || ''}
                    onChange={(e) => handleInputChange('imei', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.imei ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="860123456789012"
                    maxLength={15}
                  />
                  {errors.imei && <p className="text-red-600 text-xs mt-1">{errors.imei}</p>}
                  {formData.imei && validateIMEI(formData.imei) && (
                    <p className="text-green-600 text-xs mt-1">✓ IMEI válido</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número Serial *
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber || ''}
                    onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.serialNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="GT06N-001"
                  />
                  {errors.serialNumber && <p className="text-red-600 text-xs mt-1">{errors.serialNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo *
                  </label>
                  <select
                    value={formData.model || ''}
                    onChange={(e) => {
                      const selectedModel = equipmentModels.find(m => m.name === e.target.value);
                      handleInputChange('model', e.target.value);
                      if (selectedModel) {
                        handleInputChange('protocol', selectedModel.protocol);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.model ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione o modelo</option>
                    {equipmentModels.map(model => (
                      <option key={model.id} value={model.name}>
                        {model.name} - {model.manufacturer}
                      </option>
                    ))}
                  </select>
                  {errors.model && <p className="text-red-600 text-xs mt-1">{errors.model}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protocolo *
                  </label>
                  <input
                    type="text"
                    value={formData.protocol || ''}
                    onChange={(e) => handleInputChange('protocol', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.protocol ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="GT06"
                    readOnly={!!equipmentModels.find(m => m.name === formData.model)}
                  />
                  {errors.protocol && <p className="text-red-600 text-xs mt-1">{errors.protocol}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ICCID (Chip) *
                  </label>
                  <input
                    type="text"
                    value={formData.iccid || ''}
                    onChange={(e) => handleInputChange('iccid', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.iccid ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="89551234567890123456"
                    maxLength={20}
                  />
                  {errors.iccid && <p className="text-red-600 text-xs mt-1">{errors.iccid}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Versão do Firmware
                  </label>
                  <input
                    type="text"
                    value={formData.firmwareVersion || ''}
                    onChange={(e) => handleInputChange('firmwareVersion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1.0.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status de Ativação
                  </label>
                  <select
                    value={formData.activationStatus || 'pending'}
                    onChange={(e) => handleInputChange('activationStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pendente</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Veículo Vinculado
                  </label>
                  <select
                    value={formData.vehicleId || ''}
                    onChange={(e) => handleInputChange('vehicleId', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Nenhum veículo</option>
                    {getAvailableVehicles().map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Model Details */}
              {formData.model && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Detalhes do Modelo</h4>
                  {(() => {
                    const model = equipmentModels.find(m => m.name === formData.model);
                    return model ? (
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Fabricante:</span> {model.manufacturer}</p>
                        <p><span className="font-medium">Protocolo:</span> {model.protocol}</p>
                        <p><span className="font-medium">Recursos:</span> {model.features.join(', ')}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* IMEI Validation Info */}
              {formData.imei && (
                <div className={`rounded-lg p-4 ${
                  validateIMEI(formData.imei) ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {validateIMEI(formData.imei) ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium text-green-800">IMEI válido</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-sm font-medium text-red-800">IMEI inválido</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Formatado: {formatIMEI(formData.imei)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={16} />
                {editingDevice ? 'Salvar Alterações' : 'Criar Dispositivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};