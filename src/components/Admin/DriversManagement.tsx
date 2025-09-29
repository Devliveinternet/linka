import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, User, Phone, Mail, CreditCard, Key, Key as KeyOff } from 'lucide-react';
import { AdminDriver, Client, AdminVehicle } from '../../types/admin';
import { mockAdminDrivers, mockClients, mockAdminVehicles } from '../../data/adminMockData';

export const DriversManagement: React.FC = () => {
  const [drivers, setDrivers] = useState<AdminDriver[]>(mockAdminDrivers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');

  const getClientName = (clientId: string) => {
    return mockClients.find(c => c.id === clientId)?.name || 'N/A';
  };

  const getAssignedVehiclesInfo = (vehicleIds: string[]) => {
    return vehicleIds.map(id => mockAdminVehicles.find(v => v.id === id)).filter(Boolean);
  };

  const filteredDrivers = drivers.filter(driver => {
    const clientName = getClientName(driver.clientId);
    
    const matchesSearch = !searchTerm || 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.document.includes(searchTerm) ||
      driver.license.includes(searchTerm) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
    const matchesClient = filterClient === 'all' || driver.clientId === filterClient;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const isLicenseExpiring = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const handleEdit = (driver: AdminDriver) => {
    console.log('Edit driver:', driver);
  };

  const handleDelete = (driverId: string) => {
    if (confirm('Tem certeza que deseja excluir este motorista?')) {
      setDrivers(prev => prev.filter(d => d.id !== driverId));
    }
  };

  const handleToggleAppAccess = (driverId: string) => {
    setDrivers(prev => prev.map(d => 
      d.id === driverId ? { ...d, hasAppAccess: !d.hasAppAccess } : d
    ));
  };

  const handleCreateCredentials = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      const username = driver.name.toLowerCase().replace(/\s+/g, '.');
      setDrivers(prev => prev.map(d => 
        d.id === driverId ? { 
          ...d, 
          hasAppAccess: true,
          appCredentials: { username, lastLogin: undefined }
        } : d
      ));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Motoristas</h2>
          <p className="text-gray-600">Cadastro e gerenciamento de motoristas</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          Novo Motorista
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, CNH, email ou cliente..."
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
            <option value="suspended">Suspenso</option>
          </select>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Motorista</th>
                <th className="text-left p-4 font-semibold text-gray-900">Cliente</th>
                <th className="text-left p-4 font-semibold text-gray-900">CNH</th>
                <th className="text-left p-4 font-semibold text-gray-900">Veículos</th>
                <th className="text-left p-4 font-semibold text-gray-900">Acesso App</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDrivers.map((driver) => {
                const assignedVehicles = getAssignedVehiclesInfo(driver.assignedVehicles);
                const licenseExpiring = isLicenseExpiring(driver.licenseExpiry);
                
                return (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <User className="text-purple-600" size={20} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-600">
                            CPF: {driver.document}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Phone size={10} className="text-gray-400" />
                            <span className="text-gray-600">{driver.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Mail size={10} className="text-gray-400" />
                            <span className="text-gray-600">{driver.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">
                        {getClientName(driver.clientId)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{driver.license}</div>
                        <div className="text-gray-600">Categoria {driver.licenseCategory}</div>
                        <div className={`text-xs ${licenseExpiring ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          Vence: {new Date(driver.licenseExpiry).toLocaleDateString('pt-BR')}
                          {licenseExpiring && ' ⚠️'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {assignedVehicles.length > 0 ? (
                          assignedVehicles.map((vehicle) => (
                            <div key={vehicle?.id} className="text-sm">
                              <span className="font-medium text-gray-900">{vehicle?.plate}</span>
                              <span className="text-gray-600 ml-2">({vehicle?.brand})</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Nenhum veículo</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {driver.hasAppAccess ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-2 text-green-600">
                              <Key size={14} />
                              <span className="font-medium">Ativo</span>
                            </div>
                            {driver.appCredentials && (
                              <div className="text-xs text-gray-600">
                                User: {driver.appCredentials.username}
                              </div>
                            )}
                            {driver.appCredentials?.lastLogin && (
                              <div className="text-xs text-gray-500">
                                Último login: {new Date(driver.appCredentials.lastLogin).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <KeyOff size={14} />
                            <span className="text-sm">Sem acesso</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(driver.status)}`}>
                        {driver.status === 'active' ? 'Ativo' :
                         driver.status === 'suspended' ? 'Suspenso' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(driver)}
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
                        {driver.hasAppAccess ? (
                          <button
                            onClick={() => handleToggleAppAccess(driver.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revogar Acesso"
                          >
                            <KeyOff size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCreateCredentials(driver.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Criar Acesso"
                          >
                            <Key size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(driver.id)}
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

      {filteredDrivers.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum motorista encontrado</h3>
          <p className="text-gray-600">Tente ajustar os filtros ou adicionar novos motoristas.</p>
        </div>
      )}
    </div>
  );
};