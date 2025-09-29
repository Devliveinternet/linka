import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Truck, Link, Unlink, Wrench, X, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { AdminVehicle, Client, AdminDevice } from '../../types/admin';
import { mockAdminVehicles, mockClients, mockAdminDevices } from '../../data/adminMockData';
import { handleImageUpload, validateImageUrl } from '../../utils/vehicleIcons';

export const VehiclesManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<AdminVehicle[]>(mockAdminVehicles);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<AdminVehicle | null>(null);
  const [formData, setFormData] = useState<Partial<AdminVehicle>>({});
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string>('');

  const getClientName = (clientId: string) => {
    return mockClients.find(c => c.id === clientId)?.name || 'N/A';
  };

  const getDeviceInfo = (deviceId?: string) => {
    return deviceId ? mockAdminDevices.find(d => d.id === deviceId) : undefined;
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const clientName = getClientName(vehicle.clientId);
    
    const matchesSearch = !searchTerm || 
      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
    const matchesClient = filterClient === 'all' || vehicle.clientId === filterClient;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const getVehicleTypeLabel = (type: string) => {
    const labels = {
      car: 'Carro',
      truck: 'Caminhão',
      motorcycle: 'Moto',
      machine: 'Máquina'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleEdit = (vehicle: AdminVehicle) => {
    setEditingVehicle(vehicle);
    setFormData(vehicle);
    setShowEditModal(true);
  };

  const handleDelete = (vehicleId: string) => {
    if (confirm('Tem certeza que deseja excluir este veículo?')) {
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
    }
  };

  const handleLinkDevice = (vehicleId: string) => {
    // Open device linking modal
    console.log('Link device to vehicle:', vehicleId);
  };

  const handleUnlinkDevice = (vehicleId: string) => {
    if (confirm('Tem certeza que deseja desvincular o dispositivo?')) {
      setVehicles(prev => prev.map(v => 
        v.id === vehicleId ? { ...v, deviceId: undefined } : v
      ));
    }
  };

  const handleSaveEdit = () => {
    if (editingVehicle && formData) {
      setVehicles(prev => prev.map(v => 
        v.id === editingVehicle.id ? { ...v, ...formData } as AdminVehicle : v
      ));
      setShowEditModal(false);
      setEditingVehicle(null);
      setFormData({});
    }
    if (!editingVehicle && formData) {
      // Creating new vehicle
      const newVehicle: AdminVehicle = {
        id: `av_${Date.now()}`,
        clientId: formData.clientId || '',
        plate: formData.plate || '',
        model: formData.model || '',
        brand: formData.brand || '',
        year: formData.year || new Date().getFullYear(),
        color: formData.color || '',
        chassisNumber: formData.chassisNumber || '',
        vehicleType: formData.vehicleType || 'car',
        initialOdometer: formData.initialOdometer || 0,
        currentOdometer: formData.currentOdometer || formData.initialOdometer || 0,
        deviceId: formData.deviceId,
        status: formData.status || 'active',
        createdAt: new Date().toISOString()
      };
      
      setVehicles(prev => [...prev, newVehicle]);
      setShowEditModal(false);
      setEditingVehicle(null);
      setFormData({});
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingVehicle(null);
    setFormData({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setPhotoError('');

    try {
      const photoData = await handleImageUpload(file);
      handleInputChange('photo', photoData);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Erro ao fazer upload da imagem');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoUrlChange = async (url: string) => {
    if (!url.trim()) {
      handleInputChange('photo', '');
      setPhotoError('');
      return;
    }

    setPhotoError('');
    const isValid = await validateImageUrl(url);
    if (isValid) {
      handleInputChange('photo', url);
    } else {
      setPhotoError('URL da imagem inválida ou inacessível');
    }
  };

  const removePhoto = () => {
    handleInputChange('photo', '');
    setPhotoError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Veículos</h2>
          <p className="text-gray-600">Cadastro e gerenciamento da frota de clientes</p>
        </div>
        <button 
          onClick={() => {
            setEditingVehicle(null);
            setFormData({});
            setShowEditModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Adicionar Veículo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por placa, modelo, marca, cliente ou chassi..."
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
            <option value="maintenance">Manutenção</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Veículo</th>
                <th className="text-left p-4 font-semibold text-gray-900">Cliente</th>
                <th className="text-left p-4 font-semibold text-gray-900">Tipo</th>
                <th className="text-left p-4 font-semibold text-gray-900">Odômetro</th>
                <th className="text-left p-4 font-semibold text-gray-900">Dispositivo</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.map((vehicle) => {
                const device = getDeviceInfo(vehicle.deviceId);
                
                return (
                  <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Truck className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{vehicle.plate}</div>
                          <div className="text-sm text-gray-600">
                            {vehicle.brand} {vehicle.model} ({vehicle.year})
                          </div>
                          <div className="text-xs text-gray-500">
                            Chassi: {vehicle.chassisNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">
                        {getClientName(vehicle.clientId)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-900">
                        {getVehicleTypeLabel(vehicle.vehicleType)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Cor: {vehicle.color}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {vehicle.currentOdometer.toLocaleString()} km
                        </div>
                        <div className="text-xs text-gray-600">
                          Inicial: {vehicle.initialOdometer.toLocaleString()} km
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {device ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{device.model}</div>
                          <div className="text-xs text-gray-600">IMEI: {device.imei}</div>
                          <div className={`text-xs font-medium ${
                            device.activationStatus === 'active' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {device.activationStatus}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Não vinculado</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(vehicle.status)}`}>
                        {vehicle.status === 'active' ? 'Ativo' : 
                         vehicle.status === 'maintenance' ? 'Manutenção' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(vehicle)}
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
                        {vehicle.deviceId ? (
                          <button
                            onClick={() => handleUnlinkDevice(vehicle.id)}
                            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Desvincular Dispositivo"
                          >
                            <Unlink size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLinkDevice(vehicle.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Vincular Dispositivo"
                          >
                            <Link size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(vehicle.id)}
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

      {filteredVehicles.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum veículo encontrado</h3>
          <p className="text-gray-600">Tente ajustar os filtros ou adicionar novos veículos.</p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
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
                    Placa *
                  </label>
                  <input
                    type="text"
                    value={formData.plate || ''}
                    onChange={(e) => handleInputChange('plate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ABC1234"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <select
                    value={formData.clientId || ''}
                    onChange={(e) => handleInputChange('clientId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um cliente</option>
                    {mockClients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca *
                  </label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Scania"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="R450"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ano *
                  </label>
                  <input
                    type="number"
                    value={formData.year || ''}
                    onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="2023"
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
                    value={formData.color || ''}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Branco"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Veículo *
                  </label>
                  <select
                    value={formData.vehicleType || ''}
                    onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="car">Carro</option>
                    <option value="truck">Caminhão</option>
                    <option value="motorcycle">Moto</option>
                    <option value="machine">Máquina</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="maintenance">Manutenção</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Chassi *
                </label>
                <input
                  type="text"
                  value={formData.chassisNumber || ''}
                  onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="9BSC4X2008R123456"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Odômetro Inicial (km)
                  </label>
                  <input
                    type="number"
                    value={formData.initialOdometer || ''}
                    onChange={(e) => handleInputChange('initialOdometer', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Odômetro Atual (km)
                  </label>
                  <input
                    type="number"
                    value={formData.currentOdometer || ''}
                    onChange={(e) => handleInputChange('currentOdometer', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="45872"
                    min="0"
                  />
                </div>
              </div>
              
              {/* Vehicle Photo Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto do Veículo
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Esta foto será usada como ícone personalizado no mapa. Recomendado: imagem quadrada, máximo 5MB.
                </p>
                
                {/* Current Photo Preview */}
                {formData.photo && (
                  <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={formData.photo}
                        alt="Foto do veículo"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                        onError={() => setPhotoError('Erro ao carregar imagem')}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Foto atual</p>
                        <p className="text-xs text-gray-500">Esta imagem será usada no mapa</p>
                      </div>
                      <button
                        onClick={removePhoto}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover foto"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Upload Options */}
                <div className="space-y-3">
                  {/* File Upload */}
                  <div>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={isUploadingPhoto}
                      />
                      <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${
                        isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
                      }`}>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">
                          {isUploadingPhoto ? 'Fazendo upload...' : 'Clique para fazer upload'}
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG até 5MB</p>
                      </div>
                    </label>
                  </div>
                  
                  {/* URL Input */}
                  <div className="relative">
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                        <ImageIcon size={16} />
                      </span>
                      <input
                        type="url"
                        placeholder="Ou cole a URL de uma imagem..."
                        onChange={(e) => handlePhotoUrlChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                
                {photoError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    {photoError}
                  </div>
                )}
              </div>
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
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};