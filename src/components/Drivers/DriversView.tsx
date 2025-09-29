import React, { useState } from 'react';
import { Search, Plus, User, Phone, Mail, Award, Clock, TrendingUp } from 'lucide-react';
import { Driver, Device } from '../../types';

interface DriversViewProps {
  drivers: Driver[];
  devices: Device[];
}

export const DriversView: React.FC<DriversViewProps> = ({ drivers, devices }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getDriverDevice = (driverId: string) => {
    return devices.find(d => d.driverId === driverId);
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.license.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Motoristas</h1>
          <p className="text-gray-600">Gestão da equipe e performance</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          Adicionar Motorista
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar motoristas por nome, CNH ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDrivers.map((driver) => {
          const device = getDriverDevice(driver.id);
          const isOnDuty = device?.status === 'online' && device?.position?.ignition;
          
          return (
            <div key={driver.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
                      <p className="text-sm text-gray-600">CNH: {driver.license}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(driver.status)}`}>
                    {driver.status}
                  </span>
                </div>

                {/* Score */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Score de Condução</span>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getScoreColor(driver.score)}`}>
                      {driver.score}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        driver.score >= 90 ? 'bg-green-500' : 
                        driver.score >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${driver.score}%` }}
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span>{driver.phone}</span>
                    </div>
                  )}
                  {driver.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={14} />
                      <span>{driver.email}</span>
                    </div>
                  )}
                </div>

                {/* Current Status */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status Atual:</span>
                    <span className={`font-medium ${isOnDuty ? 'text-green-600' : 'text-gray-600'}`}>
                      {isOnDuty ? 'Em serviço' : 'Fora de serviço'}
                    </span>
                  </div>
                  {device?.position && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-600">Velocidade:</span>
                      <span className="font-medium">{device.position.speed} km/h</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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