import React, { useState } from 'react';
import { BarChart3, Download, Calendar, Building, Truck, Smartphone, DollarSign, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { AdminReport } from '../../types/admin';
import { mockAdminReport, mockClients, mockAdminVehicles, mockAdminDevices } from '../../data/adminMockData';

export const AdminReports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [report] = useState<AdminReport>(mockAdminReport);

  const getRevenueGrowth = () => {
    // Simulate growth calculation
    return 12.5;
  };

  const getClientsByPlan = () => {
    const planCounts = mockClients.reduce((acc, client) => {
      acc[client.plan] = (acc[client.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { plan: 'Basic', count: planCounts.basic || 0, color: 'bg-blue-500' },
      { plan: 'Premium', count: planCounts.premium || 0, color: 'bg-purple-500' },
      { plan: 'Enterprise', count: planCounts.enterprise || 0, color: 'bg-orange-500' }
    ];
  };

  const getDevicesByStatus = () => {
    const statusCounts = mockAdminDevices.reduce((acc, device) => {
      acc[device.activationStatus] = (acc[device.activationStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { status: 'Ativo', count: statusCounts.active || 0, color: 'text-green-600' },
      { status: 'Inativo', count: statusCounts.inactive || 0, color: 'text-gray-600' },
      { status: 'Pendente', count: statusCounts.pending || 0, color: 'text-yellow-600' },
      { status: 'Suspenso', count: statusCounts.suspended || 0, color: 'text-red-600' }
    ];
  };

  const exportReport = (type: string) => {
    console.log(`Exporting ${type} report for period: ${selectedPeriod}`);
    // Implement export functionality
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatórios Administrativos</h2>
          <p className="text-gray-600">Visão geral da plataforma e métricas operacionais</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="week">Esta Semana</option>
            <option value="month">Este Mês</option>
            <option value="quarter">Este Trimestre</option>
            <option value="year">Este Ano</option>
          </select>
          <button 
            onClick={() => exportReport('general')}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Exportar
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.activeClients}</p>
              <p className="text-sm text-green-600 mt-1">+{report.newClientsThisMonth} este mês</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Veículos Ativos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.activeVehicles}</p>
              <p className="text-sm text-gray-500 mt-1">Na plataforma</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Truck className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispositivos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.provisionedDevices}</p>
              <p className="text-sm text-gray-500 mt-1">Provisionados</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Smartphone className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                R$ {report.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-green-600 mt-1">+{getRevenueGrowth()}% vs mês anterior</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients by Plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Clientes por Plano</h3>
            <BarChart3 className="text-gray-400" size={20} />
          </div>
          
          <div className="space-y-4">
            {getClientsByPlan().map((item) => (
              <div key={item.plan} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${item.color}`} />
                  <span className="text-sm font-medium text-gray-900">{item.plan}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                  <span className="text-xs text-gray-500">
                    ({((item.count / mockClients.length) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Devices Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Status dos Dispositivos</h3>
            <Smartphone className="text-gray-400" size={20} />
          </div>
          
          <div className="space-y-4">
            {getDevicesByStatus().map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{item.status}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Atividade Recente</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="text-blue-600" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Novo cliente cadastrado</p>
              <p className="text-xs text-gray-600">Logística XYZ S.A. - Plano Enterprise</p>
            </div>
            <span className="text-xs text-gray-500">2h atrás</span>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <Smartphone className="text-green-600" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Dispositivo provisionado</p>
              <p className="text-xs text-gray-600">IMEI: 860123456789015 - Cliente: Transportadora ABC</p>
            </div>
            <span className="text-xs text-gray-500">4h atrás</span>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="text-yellow-600" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Pagamento pendente</p>
              <p className="text-xs text-gray-600">João da Silva - MEI - Vencimento: hoje</p>
            </div>
            <span className="text-xs text-gray-500">6h atrás</span>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Exportar Relatórios</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => exportReport('clients')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Building className="text-blue-600" size={20} />
            <div className="text-left">
              <div className="font-medium text-gray-900">Relatório de Clientes</div>
              <div className="text-sm text-gray-600">Lista completa com status e planos</div>
            </div>
          </button>
          
          <button 
            onClick={() => exportReport('vehicles')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Truck className="text-green-600" size={20} />
            <div className="text-left">
              <div className="font-medium text-gray-900">Relatório de Veículos</div>
              <div className="text-sm text-gray-600">Frota ativa e vinculações</div>
            </div>
          </button>
          
          <button 
            onClick={() => exportReport('devices')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Smartphone className="text-purple-600" size={20} />
            <div className="text-left">
              <div className="font-medium text-gray-900">Relatório de Dispositivos</div>
              <div className="text-sm text-gray-600">Status de provisionamento</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};