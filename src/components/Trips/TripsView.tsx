import React, { useState } from 'react';
import { Search, Calendar, MapPin, Clock, Fuel, TrendingUp, Filter, Eye } from 'lucide-react';
import { Trip, Driver, Vehicle } from '../../types';

interface TripsViewProps {
  trips: Trip[];
  drivers: Driver[];
  vehicles: Vehicle[];
}

export const TripsView: React.FC<TripsViewProps> = ({ trips, drivers, vehicles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getDriverName = (driverId?: string) => {
    return driverId ? drivers.find(d => d.id === driverId)?.name || 'N/A' : 'N/A';
  };

  const getVehiclePlate = (deviceId: string) => {
    const vehicle = vehicles.find(v => v.deviceId === deviceId);
    return vehicle?.plate || 'N/A';
  };

  const filteredTrips = trips.filter(trip => {
    const driverName = getDriverName(trip.driverId);
    const vehiclePlate = getVehiclePlate(trip.deviceId);
    
    const matchesSearch = !searchTerm || 
      driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.startLocation.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.endLocation?.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || trip.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Viagens</h1>
          <p className="text-gray-600">Histórico e análise de trajetos</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar size={20} />
            Período
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Filter size={20} />
            Exportar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar viagens por motorista, veículo ou destino..."
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
            <option value="active">Ativa</option>
            <option value="completed">Concluída</option>
          </select>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Viagem</th>
                <th className="text-left p-4 font-semibold text-gray-900">Motorista</th>
                <th className="text-left p-4 font-semibold text-gray-900">Veículo</th>
                <th className="text-left p-4 font-semibold text-gray-900">Duração</th>
                <th className="text-left p-4 font-semibold text-gray-900">Distância</th>
                <th className="text-left p-4 font-semibold text-gray-900">Score</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <MapPin size={14} className="text-gray-400" />
                        <span>{trip.startLocation.address || 'Origem'}</span>
                      </div>
                      {trip.endLocation && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <MapPin size={14} className="text-gray-400" />
                          <span>{trip.endLocation.address || 'Destino'}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateTime(trip.startTime)}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-gray-900">
                      {getDriverName(trip.driverId)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-gray-900">
                      {getVehiclePlate(trip.deviceId)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDuration(trip.duration)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-900">
                      {trip.distance.toFixed(1)} km
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getScoreColor(trip.score)}`}>
                      {trip.score}%
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      trip.status === 'active' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {trip.status === 'active' ? 'Ativa' : 'Concluída'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTrips.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma viagem encontrada</h3>
          <p className="text-gray-600">Tente ajustar os filtros ou aguarde novas viagens.</p>
        </div>
      )}
    </div>
  );
};