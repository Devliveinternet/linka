import React from 'react';
import { AlertTriangle, Clock, MapPin, CheckCircle } from 'lucide-react';
import { Alert } from '../../types';

interface RecentAlertsProps {
  alerts: Alert[];
}

export const RecentAlerts: React.FC<RecentAlertsProps> = ({ alerts }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
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
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
    return `${Math.floor(diffMins / 1440)}d atrás`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Alertas Recentes</h3>
        <p className="text-xs sm:text-sm text-gray-600">Últimas notificações do sistema</p>
      </div>
      
      <div className="max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-500 mx-auto mb-2 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-500">Nenhum alerta recente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-1 sm:p-2 rounded-full ${getSeverityColor(alert.severity)} flex-shrink-0`}>
                    <AlertTriangle size={14} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {getAlertTypeLabel(alert.type)}
                      </p>
                      <span className={`px-1 sm:px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${
                        alert.acknowledged 
                          ? 'bg-green-100 text-green-800' 
                          : getSeverityColor(alert.severity)
                      }`}>
                        {alert.acknowledged ? 'Reconhecido' : alert.severity.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{alert.message}</p>
                    
                    <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{formatTime(alert.timestamp)}</span>
                      </div>
                      {alert.location && (
                        <div className="flex items-center gap-1 hidden sm:flex">
                          <MapPin size={12} />
                          <span>Ver no mapa</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
        <button className="w-full text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          Ver todos os alertas
        </button>
      </div>
    </div>
  );
};