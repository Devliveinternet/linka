import React, { useState } from 'react';
import { Search, Filter, AlertTriangle, CheckCircle, Clock, MapPin, Eye } from 'lucide-react';
import { Alert } from '../../types';

interface AlertsViewProps {
  alerts: Alert[];
  onAcknowledgeAlert: (alertId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onAcknowledgeAlert }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = !searchTerm || 
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'acknowledged' && alert.acknowledged) ||
      (filterStatus === 'pending' && !alert.acknowledged);
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels = {
      speeding: 'Excesso de Velocidade',
      geofence: 'Cerca Virtual',
      idle: 'Ociosidade',
      fuel: 'Combustível',
      maintenance: 'Manutenção',
      fatigue: 'Fadiga',
      harsh_driving: 'Condução Agressiva'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR');
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
    return `${Math.floor(diffMins / 1440)}d atrás`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-600">Monitoramento e notificações do sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {filteredAlerts.filter(a => !a.acknowledged).length} pendentes de {filteredAlerts.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar alertas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas as Severidades</option>
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendentes</option>
            <option value="acknowledged">Reconhecidos</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div 
            key={alert.id} 
            className={`bg-white rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-md ${
              alert.acknowledged ? 'border-gray-200' : getSeverityColor(alert.severity).replace('text-', 'border-').replace('bg-', '').replace('100', '200')
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-3 rounded-lg ${getSeverityColor(alert.severity)}`}>
                  <AlertTriangle size={20} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getAlertTypeLabel(alert.type)}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    {alert.acknowledged && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Reconhecido
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-3">{alert.message}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{formatTime(alert.timestamp)}</span>
                      <span className="text-gray-400">({formatTimeAgo(alert.timestamp)})</span>
                    </div>
                    {alert.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>Ver localização</span>
                      </div>
                    )}
                  </div>
                  
                  {alert.acknowledgedBy && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700">
                        Reconhecido por {alert.acknowledgedBy} em {formatTime(alert.acknowledgedAt!)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // View details functionality
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Ver detalhes"
                >
                  <Eye size={16} />
                </button>
                {!alert.acknowledged && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcknowledgeAlert(alert.id);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Reconhecer
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {alerts.length === 0 ? 'Nenhum alerta' : 'Nenhum alerta encontrado'}
          </h3>
          <p className="text-gray-600">
            {alerts.length === 0 
              ? 'Sua frota está operando normalmente.' 
              : 'Tente ajustar os filtros de busca.'}
          </p>
        </div>
      )}
    </div>
  );
};