import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize, 
  Layers, 
  Filter,
  MapPin,
  Navigation,
  Circle,
  Square,
  Eye,
  EyeOff
} from 'lucide-react';
import { Device } from '../../types';
import { createVehicleIcon, getVehicleTypeFromDevice, getVehiclePhotoFromDevice } from '../../utils/vehicleIcons';

interface GoogleMapsIntegrationProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  devices: Device[];
  vehicles?: any[];
}

export const GoogleMapsIntegration: React.FC<GoogleMapsIntegrationProps> = ({
  apiKey,
  devices,
  vehicles = []
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>();
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  const [showOfflineDevices, setShowOfflineDevices] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  const initializeMap = async () => {
    if (!apiKey || !mapRef.current) return;

    try {
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['maps', 'marker']
      });

      await loader.load();

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
      addDeviceMarkers(mapInstance);
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  };

  const addDeviceMarkers = (mapInstance: google.maps.Map) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const filteredDevices = showOfflineDevices ? devices : devices.filter(d => d.status === 'online');

    filteredDevices.forEach((device) => {
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
        setSelectedDevice(device.id);
        
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

  const handleMapStyleChange = (style: 'roadmap' | 'satellite' | 'terrain') => {
    if (map) {
      const mapTypeId = {
        roadmap: google.maps.MapTypeId.ROADMAP,
        satellite: google.maps.MapTypeId.SATELLITE,
        terrain: google.maps.MapTypeId.TERRAIN
      };
      map.setMapTypeId(mapTypeId[style]);
      setMapStyle(style);
    }
  };

  const toggleTraffic = () => {
    if (map) {
      if (showTraffic && trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
        trafficLayerRef.current = null;
      } else if (!showTraffic) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
        trafficLayerRef.current.setMap(map);
      }
      setShowTraffic(!showTraffic);
    }
  };

  useEffect(() => {
    initializeMap();
  }, [apiKey]);

  useEffect(() => {
    if (map) {
      addDeviceMarkers(map);
    }
  }, [map, devices, showOfflineDevices, selectedDevice]);

  const getStatusColor = (device: Device) => {
    if (device.status === 'offline') return 'text-gray-400';
    if (device.position?.ignition && device.position?.speed > 5) return 'text-green-500';
    if (device.position?.ignition) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getStatusIcon = (device: Device) => {
    if (device.status === 'offline') return Circle;
    if (device.position?.ignition && device.position?.speed > 5) return Navigation;
    if (device.position?.ignition) return Square;
    return Circle;
  };

  const getStatusLabel = (device: Device) => {
    if (device.status === 'offline') return 'Offline';
    if (device.position?.ignition && device.position?.speed > 5) return 'Em movimento';
    if (device.position?.ignition) return 'Parado (ligado)';
    return 'Parado (desligado)';
  };

  const onlineDevices = devices.filter(d => d.status === 'online');
  const movingDevices = devices.filter(d => d.position?.ignition && d.position?.speed > 5);
  const stoppedDevices = devices.filter(d => d.status === 'online' && d.position?.ignition && d.position?.speed <= 5);
  const offlineDevices = devices.filter(d => d.status === 'offline');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa da Frota</h1>
          <p className="text-gray-600">Visualização em tempo real da localização dos veículos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="relative h-[600px]" ref={mapRef}>
              {/* Map Controls Overlay */}
              <div className="absolute top-4 right-4 z-10 space-y-2">
                {/* Zoom Controls */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={handleZoomIn}
                    className="block w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors border-b border-gray-200"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="block w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ZoomOut size={16} />
                  </button>
                </div>

                {/* Map Style Controls */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                  <div className="space-y-1">
                    <button
                      onClick={() => handleMapStyleChange('roadmap')}
                      className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${
                        mapStyle === 'roadmap' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Mapa
                    </button>
                    <button
                      onClick={() => handleMapStyleChange('satellite')}
                      className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${
                        mapStyle === 'satellite' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Satélite
                    </button>
                    <button
                      onClick={() => handleMapStyleChange('terrain')}
                      className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${
                        mapStyle === 'terrain' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Terreno
                    </button>
                  </div>
                </div>

                {/* Layer Controls */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                  <button
                    onClick={toggleTraffic}
                    className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${
                      showTraffic ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Tráfego
                  </button>
                </div>

                {/* Reset View */}
                <button
                  onClick={handleResetView}
                  className="bg-white rounded-lg shadow-lg border border-gray-200 w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  title="Resetar visualização"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Legenda</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Navigation size={12} className="text-green-500" />
                    <span>Em movimento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Square size={12} className="text-yellow-500" />
                    <span>Parado (ligado)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle size={12} className="text-blue-500" />
                    <span>Parado (desligado)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle size={12} className="text-gray-400" />
                    <span>Offline</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{onlineDevices.length}</p>
                <p className="text-xs text-gray-600">Online</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{movingDevices.length}</p>
                <p className="text-xs text-gray-600">Em movimento</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stoppedDevices.length}</p>
                <p className="text-xs text-gray-600">Parados</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{offlineDevices.length}</p>
                <p className="text-xs text-gray-600">Offline</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Filtros</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOfflineDevices}
                  onChange={(e) => setShowOfflineDevices(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Mostrar dispositivos offline</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showGeofences}
                  onChange={(e) => setShowGeofences(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Mostrar cercas virtuais</span>
              </label>
            </div>
          </div>

          {/* Device List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Dispositivos</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(showOfflineDevices ? devices : onlineDevices).map((device) => {
                const StatusIcon = getStatusIcon(device);
                const isSelected = selectedDevice === device.id;
                
                return (
                  <button
                    key={device.id}
                    onClick={() => {
                      setSelectedDevice(device.id);
                      if (map && device.position) {
                        map.setCenter({ lat: device.position.lat, lng: device.position.lon });
                        map.setZoom(15);
                      }
                    }}
                    className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon size={16} className={getStatusColor(device)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {device.model}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {getStatusLabel(device)}
                        </div>
                        {device.position && (
                          <div className="text-xs text-gray-500">
                            {device.position.speed} km/h
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Device Details */}
          {selectedDevice && (() => {
            const device = devices.find(d => d.id === selectedDevice);
            if (!device) return null;

            return (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Detalhes do Dispositivo</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Modelo</p>
                    <p className="text-sm font-medium text-gray-900">{device.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">IMEI</p>
                    <p className="text-sm font-medium text-gray-900">{device.imei}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <p className={`text-sm font-medium ${getStatusColor(device)}`}>
                      {getStatusLabel(device)}
                    </p>
                  </div>
                  {device.position && (
                    <>
                      <div>
                        <p className="text-xs text-gray-600">Velocidade</p>
                        <p className="text-sm font-medium text-gray-900">{device.position.speed} km/h</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Direção</p>
                        <p className="text-sm font-medium text-gray-900">{device.position.heading}°</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Coordenadas</p>
                        <p className="text-sm font-medium text-gray-900">
                          {device.position.lat.toFixed(6)}, {device.position.lon.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Odômetro</p>
                        <p className="text-sm font-medium text-gray-900">{device.position.odometer.toLocaleString()} km</p>
                      </div>
                      {device.position.fuel && (
                        <div>
                          <p className="text-xs text-gray-600">Combustível</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${device.position.fuel}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{device.position.fuel}%</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Satélites</p>
                        <p className="text-sm font-medium text-gray-900">{device.position.satellites || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs text-gray-600">Última atualização</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(device.lastUpdate).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};