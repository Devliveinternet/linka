import React, { useState } from 'react';
import { Plus, MapPin, Circle, Square, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Geofence } from '../../types';

interface GeofencesViewProps {
  geofences: Geofence[];
}

export const GeofencesView: React.FC<GeofencesViewProps> = ({ geofences }) => {
  const [selectedGeofence, setSelectedGeofence] = useState<string>();

  const getTypeIcon = (type: string) => {
    return type === 'circle' ? Circle : Square;
  };

  const getTypeLabel = (type: string) => {
    return type === 'circle' ? 'Circular' : 'Polígono';
  };

  const getRuleTypeLabel = (ruleType: string) => {
    const labels = {
      enter: 'Entrada',
      exit: 'Saída',
      speed_limit: 'Limite de Velocidade'
    };
    return labels[ruleType as keyof typeof labels] || ruleType;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cercas Virtuais</h1>
          <p className="text-gray-600">Gestão de geofences e regras de monitoramento</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          Criar Cerca Virtual
        </button>
      </div>

      {/* Geofences List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {geofences.map((geofence) => {
          const TypeIcon = getTypeIcon(geofence.type);
          const isSelected = selectedGeofence === geofence.id;
          
          return (
            <div 
              key={geofence.id} 
              className={`bg-white rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer ${
                isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:shadow-md'
              }`}
              onClick={() => setSelectedGeofence(isSelected ? undefined : geofence.id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TypeIcon className="text-green-600" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{geofence.name}</h3>
                      <p className="text-sm text-gray-600">{getTypeLabel(geofence.type)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">Status:</span>
                  <div className="flex items-center gap-2">
                    {geofence.isActive ? (
                      <ToggleRight className="text-green-500" size={20} />
                    ) : (
                      <ToggleLeft className="text-gray-400" size={20} />
                    )}
                    <span className={`text-sm font-medium ${
                      geofence.isActive ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {geofence.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>

                {/* Rules */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Regras Configuradas:</h4>
                  {geofence.rules.map((rule) => (
                    <div key={rule.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">
                          {getRuleTypeLabel(rule.type)}
                        </span>
                        {rule.value && (
                          <span className="text-sm text-gray-600">{rule.value} km/h</span>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">
                          Ações: {rule.actions.join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coordinates Info */}
                {geofence.type === 'circle' && geofence.radius && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={14} />
                      <span>Raio: {geofence.radius}m</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map View for Selected Geofence */}
      {selectedGeofence && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Visualização da Cerca: {geofences.find(g => g.id === selectedGeofence)?.name}
            </h3>
          </div>
          <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Visualização da Cerca Virtual</p>
              <p className="text-sm text-gray-400">Integração com mapa interativo</p>
            </div>
          </div>
        </div>
      )}

      {geofences.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma cerca virtual encontrada</h3>
          <p className="text-gray-600">Crie sua primeira cerca virtual para começar o monitoramento.</p>
        </div>
      )}
    </div>
  );
};