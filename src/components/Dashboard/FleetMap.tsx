import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Circle, Square, Navigation, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Device, Vehicle } from '../../types';
import { createVehicleIcon, getVehicleTypeFromDevice, getVehiclePhotoFromDevice } from '../../utils/vehicleIcons';

interface FleetMapProps {
  devices: Device[];
  vehicles?: Vehicle[];
  selectedDevice?: string;
  onDeviceSelect: (deviceId: string) => void;
}

export const FleetMap: React.FC<FleetMapProps> = ({ 
  devices, 
  vehicles = [],
  selectedDevice, 
  onDeviceSelect 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('googleMapsApiKey');
    if (savedApiKey) {
      setGoogleMapsApiKey(savedApiKey);
    }
  }, []);

  // Initialize Google Maps
  const initializeMap = async () => {
    if (!googleMapsApiKey || !mapRef.current) return;

    try {
      // Load Google Maps API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=maps`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (mapRef.current && window.google) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: -16.6799, lng: -49.255 },
            zoom: 12,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: false
          });

          setMap(mapInstance);
        }
      };

      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };

      // Only add script if it doesn't exist
      if (!document.querySelector(`script[src*="maps.googleapis.com"]`)) {
        document.head.appendChild(script);
      } else if (window.google && mapRef.current) {
        // Google Maps already loaded
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: -16.6799, lng: -49.255 },
          zoom: 12,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false
        });
        setMap(mapInstance);
      }
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  };

  // Add device markers to map
  const addDeviceMarkers = (mapInstance: google.maps.Map) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    devices.forEach((device) => {
      if (!device.position) return;

      const position = {
        lat: device.position.lat,
        lng: device.position.lon
      };

      // Create custom marker icon based on device status
      const getMarkerIcon = () => {
        const vehicleType = getVehicleTypeFromDevice(device.id, vehicles);
        const vehiclePhoto = getVehiclePhotoFromDevice(device.id, vehicles);
        const isMoving = device.position!.ignition && device.position!.speed > 5;
        const isSelected = selectedDevice === device.id;
        
        return createVehicleIcon(vehicleType, device.status, isMoving, isSelected, vehiclePhoto);
      };

      const marker = new google.maps.Marker({
        position,
        map: mapInstance,
        icon: getMarkerIcon(),
        title: `${getVehicleTypeFromDevice(device.id, vehicles).toUpperCase()} - ${device.status}`
      });

      // Create info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 250px; font-family: system-ui;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #111827;">${device.model}</h3>
            <div style="margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 12px;">IMEI:</span>
              <span style="color: #374151; font-size: 12px; margin-left: 4px;">${device.imei}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 12px;">Status:</span>
              <span style="color: ${device.status === 'online' ? '#10B981' : '#6B7280'}; font-size: 12px; margin-left: 4px; font-weight: 500;">${device.status}</span>
            </div>
            ${device.position ? `
              <div style="margin-bottom: 4px;">
                <span style="color: #6B7280; font-size: 12px;">Velocidade:</span>
                <span style="color: #374151; font-size: 12px; margin-left: 4px; font-weight: 500;">${device.position.speed} km/h</span>
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: #6B7280; font-size: 12px;">Ignição:</span>
                <span style="color: ${device.position.ignition ? '#10B981' : '#EF4444'}; font-size: 12px; margin-left: 4px; font-weight: 500;">${device.position.ignition ? 'Ligada' : 'Desligada'}</span>
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: #6B7280; font-size: 12px;">Odômetro:</span>
                <span style="color: #374151; font-size: 12px; margin-left: 4px;">${device.position.odometer.toLocaleString()} km</span>
              </div>
              ${device.position.fuel ? `
                <div style="margin-bottom: 4px;">
                  <span style="color: #6B7280; font-size: 12px;">Combustível:</span>
                  <span style="color: #374151; font-size: 12px; margin-left: 4px;">${device.position.fuel}%</span>
                </div>
              ` : ''}
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
                <span style="color: #9CA3AF; font-size: 11px;">Última atualização: ${new Date(device.lastUpdate).toLocaleString('pt-BR')}</span>
              </div>
            ` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        onDeviceSelect(device.id);
        
        // Close other info windows
        markersRef.current.forEach(m => {
          if (m !== marker && (m as any).infoWindow) {
            (m as any).infoWindow.close();
          }
        });
        
        infoWindow.open(mapInstance, marker);
        (marker as any).infoWindow = infoWindow;
      });

      markersRef.current.push(marker);
    });
  };

  // Map control handlers
  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom() || 12;
      map.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom() || 12;
      map.setZoom(Math.max(currentZoom - 1, 1));
    }
  };

  const handleResetView = () => {
    if (map) {
      map.setCenter({ lat: -16.6799, lng: -49.255 });
      map.setZoom(12);
    }
  };

  // Initialize map when API key is available
  useEffect(() => {
    if (googleMapsApiKey) {
      initializeMap();
    }
  }, [googleMapsApiKey]);

  // Update markers when devices or selection changes
  useEffect(() => {
    if (map) {
      addDeviceMarkers(map);
    }
  }, [map, devices, selectedDevice]);

  // Simulate real-time position updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real implementation, this would be WebSocket updates
      console.log('Real-time position update simulation');
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (device: Device) => {
    if (device.status === 'offline') return 'text-gray-400';
    if (device.position?.ignition) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getStatusIcon = (device: Device) => {
    if (device.status === 'offline') return Circle;
    if (device.position?.ignition) return Navigation;
    return Square;
  };

  // If Google Maps is available and API key is configured, show interactive map
  if (googleMapsApiKey && typeof window !== 'undefined') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Mapa da Frota</h3>
          <p className="text-xs sm:text-sm text-gray-600">Visualização em tempo real</p>
        </div>
        
        <div className="relative h-64 sm:h-80 lg:h-96">
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 space-y-2">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <button
                onClick={handleZoomIn}
                className="block w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors border-b border-gray-200"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={handleZoomOut}
                className="block w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
            </div>
            <button
              onClick={handleResetView}
              className="bg-white rounded-lg shadow-lg border border-gray-200 w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
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
            const StatusIcon = getStatusIcon(device);
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