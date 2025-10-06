import React, { useEffect, useState } from 'react';
import { MapPin, Circle, Square, Navigation } from 'lucide-react';
import { Device, Vehicle } from '../../types';
import { GoogleMapsIntegration } from '../Map/GoogleMapsIntegration';

interface FleetMapProps {
  devices: Device[];
  vehicles?: Vehicle[];
  selectedDevice?: string;
  onDeviceSelect: (deviceId: string) => void;
}

const getStatusColor = (device: Device) => {
  if (device.status === 'offline') return 'text-gray-400';
  if (device.position?.ignition && device.position?.speed && device.position.speed > 5) {
    return 'text-green-500';
  }
  if (device.position?.ignition) return 'text-yellow-500';
  return 'text-blue-500';
};

export const FleetMap: React.FC<FleetMapProps> = ({
  devices,
  vehicles = [],
  selectedDevice,
  onDeviceSelect
}) => {
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');

  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('googleMapsApiKey');
    if (savedApiKey) {
      setGoogleMapsApiKey(savedApiKey);
    }
  }, []);

  // If Google Maps is available and API key is configured, show interactive map
  if (googleMapsApiKey && typeof window !== 'undefined') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Mapa da Frota</h3>
          <p className="text-xs sm:text-sm text-gray-600">Visualização em tempo real</p>
        </div>

        <GoogleMapsIntegration
          apiKey={googleMapsApiKey}
          devices={devices}
          vehicles={vehicles}
          selectedDevice={selectedDevice}
          onDeviceSelect={onDeviceSelect}
          variant="dashboard"
          className="flex flex-col"
        />
      </div>
    );
  }

  // Fallback to placeholder map if no API key is configured
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Mapa da Frota</h3>
        <p className="text-xs sm:text-sm text-gray-600">Visualização em tempo real</p>
      </div>
      
      <div className="relative h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        {/* Placeholder for map */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-2 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-500 font-medium">Mapa Interativo</p>
            <p className="text-xs sm:text-sm text-gray-400">Configure a API do Google Maps em Administração → Configurações</p>
          </div>
        </div>
        
        {/* Device markers overlay for placeholder */}
        <div className="absolute inset-2 sm:inset-4">
          {devices.map((device, index) => {
            const StatusIcon = device.status === 'offline' ? Circle : device.position?.ignition ? Navigation : Square;
            const isSelected = selectedDevice === device.id;

            return (
              <button
                key={device.id}
                onClick={() => onDeviceSelect(device.id)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                  isSelected ? 'scale-125 z-10' : 'hover:scale-110'
                }`}
                style={{
                  left: `${20 + (index * 15)}%`,
                  top: `${30 + (index * 10)}%`
                }}
                title={`${device.model} - ${device.status}`}
              >
                <div className={`p-1 sm:p-2 rounded-full bg-white shadow-lg border-2 ${
                  isSelected ? 'border-blue-500' : 'border-gray-300'
                }`}>
                  <StatusIcon 
                    size={14} 
                    className={`sm:w-4 sm:h-4 ${getStatusColor(device)}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm overflow-x-auto">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-700 whitespace-nowrap">Em movimento</span>
          </div>
          <div className="flex items-center gap-2">
            <Square size={14} className="text-yellow-500 flex-shrink-0" />
            <span className="text-gray-700 whitespace-nowrap">Parado (ligado)</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 whitespace-nowrap">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};