import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Building, Phone, Mail, CreditCard, AlertCircle } from 'lucide-react';
import { Client } from '../../types/admin';
import { mockClients } from '../../data/adminMockData';

export const ClientsManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.document.includes(searchTerm) ||
      client.contacts.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const getPlanBadge = (plan: string) => {
    const badges = {
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-orange-100 text-orange-800'
    };
    return badges[plan as keyof typeof badges] || badges.basic;
  };

  const formatDocument = (document: string, type: string) => {
    if (type === 'cnpj') {
      return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleDelete = (clientId: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      setClients(prev => prev.filter(c => c.id !== clientId));
    }
  };

  const handleStatusChange = (clientId: string, newStatus: Client['status']) => {
    setClients(prev => prev.map(c => 
      c.id === clientId ? { ...c, status: newStatus } : c
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Clientes</h2>
          <p className="text-gray-600">Cadastro e gerenciamento de clientes da plataforma</p>
        </div>
        <button 
          onClick={() => {
            setEditingClient(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, documento ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
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

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Cliente</th>
                <th className="text-left p-4 font-semibold text-gray-900">Documento</th>
                <th className="text-left p-4 font-semibold text-gray-900">Contato</th>
                <th className="text-left p-4 font-semibold text-gray-900">Plano</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900">Próx. Cobrança</th>
                <th className="text-left p-4 font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-600">
                          {client.address.city}, {client.address.state}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {formatDocument(client.document, client.documentType)}
                      </div>
                      <div className="text-gray-600 uppercase">
                        {client.documentType}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={12} className="text-gray-400" />
                        <span>{client.contacts.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={12} className="text-gray-400" />
                        <span>{client.contacts.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanBadge(client.plan)}`}>
                      {client.plan.charAt(0).toUpperCase() + client.plan.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={client.status}
                      onChange={(e) => handleStatusChange(client.id, e.target.value as Client['status'])}
                      className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${getStatusBadge(client.status)}`}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                      <option value="suspended">Suspenso</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {client.nextBilling ? (
                        <div className="flex items-center gap-2">
                          <CreditCard size={12} className="text-gray-400" />
                          <span>{new Date(client.nextBilling).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle size={12} />
                          <span>Pendente</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(client)}
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
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredClients.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
          <p className="text-gray-600">Tente ajustar os filtros ou adicionar novos clientes.</p>
        </div>
      )}
    </div>
  );
};