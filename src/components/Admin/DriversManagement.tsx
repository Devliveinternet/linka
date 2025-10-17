import React, { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, User, Phone, Mail, Car, Link2, Unlink } from 'lucide-react';
import { useDrivers } from '../../context/DriverContext';
import { Vehicle } from '../../types';
import { DriverFormModal } from '../Drivers/DriverFormModal';

interface DriversManagementProps {
  vehicles: Vehicle[];
}

export const DriversManagement: React.FC<DriversManagementProps> = ({ vehicles }) => {
  const { drivers, addDriver, updateDriver, removeDriver, unassignVehicle } = useDrivers();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const driverBeingEdited = useMemo(
    () => (editingDriverId ? drivers.find(driver => driver.id === editingDriverId) : undefined),
    [drivers, editingDriverId]
  );

  const handleOpenCreateModal = () => {
    setEditingDriverId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (driverId: string) => {
    setEditingDriverId(driverId);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: Parameters<typeof addDriver>[0]) => {
    setIsSubmitting(true);
    try {
      if (editingDriverId) {
        updateDriver(editingDriverId, values);
      } else {
        addDriver(values);
      }
      setIsModalOpen(false);
      setEditingDriverId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) {
      return;
    }
    if (confirm(`Deseja remover o motorista ${driver.name}?`)) {
      removeDriver(driverId);
    }
  };

  const handleUnassign = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver?.vehicleId) {
      return;
    }
    if (confirm(`Remover vínculo do veículo com ${driver.name}?`)) {
      unassignVehicle(driverId);
    }
  };

  const getVehicleForDriver = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver?.vehicleId) {
      return undefined;
    }
    return vehicles.find(vehicle => vehicle.id === driver.vehicleId);
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
      const matchesSearch = !searchTerm.trim()
        || driver.name.toLowerCase().includes(searchTerm.toLowerCase())
        || driver.license.toLowerCase().includes(searchTerm.toLowerCase())
        || driver.email?.toLowerCase().includes(searchTerm.toLowerCase())
        || driver.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [drivers, filterStatus, searchTerm]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return badges[status] ?? 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Motoristas</h2>
          <p className="text-gray-600">Cadastro, vínculo com veículos e credenciais</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Novo Motorista
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, CNH, email ou telefone..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Motorista</th>
                <th className="text-left p-4 font-semibold text-gray-900">CNH</th>
                <th className="text-left p-4 font-semibold text-gray-900">Veículo Vinculado</th>
                <th className="text-left p-4 font-semibold text-gray-900">Score</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDrivers.map(driver => {
                const vehicle = getVehicleForDriver(driver.id);
                return (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-600">ID: {driver.id}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                            <Phone size={12} />
                            <span>{driver.phone || 'Sem telefone'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail size={12} />
                            <span>{driver.email || 'Sem email'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{driver.license}</div>
                        <div className="text-gray-600">Criado em {new Date(driver.createdAt).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      {vehicle ? (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Car size={16} className="text-blue-500" />
                          <span className="font-medium">{vehicle.plate}</span>
                          <span className="text-gray-500">{vehicle.model}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Sem veículo vinculado</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-900">{driver.score}%</div>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              driver.score >= 90
                                ? 'bg-green-500'
                                : driver.score >= 75
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${driver.score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(driver.status)}`}>
                        {driver.status === 'active' && 'Ativo'}
                        {driver.status === 'inactive' && 'Inativo'}
                        {driver.status === 'suspended' && 'Suspenso'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(driver.id)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(driver.id)}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                          Excluir
                        </button>
                        <button
                          onClick={() =>
                            vehicle ? handleUnassign(driver.id) : handleOpenEditModal(driver.id)
                          }
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          {vehicle ? (
                            <>
                              <Unlink size={16} />
                              Desvincular
                            </>
                          ) : (
                            <>
                              <Link2 size={16} />
                              Vincular Veículo
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    Nenhum motorista encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DriverFormModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setEditingDriverId(null);
          }
        }}
        onSubmit={handleSubmit}
        vehicles={vehicles}
        isSubmitting={isSubmitting}
        title={editingDriverId ? 'Editar Motorista' : 'Novo Motorista'}
        confirmLabel={editingDriverId ? 'Atualizar Motorista' : 'Salvar Motorista'}
        initialValues={driverBeingEdited}
      />
    </div>
  );
};

