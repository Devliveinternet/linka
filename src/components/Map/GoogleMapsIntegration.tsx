import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Circle,
  Square
} from 'lucide-react';
import { Device, Vehicle } from '../../types';
import { createVehicleIcon, getVehicleTypeFromDevice, getVehiclePhotoFromDevice } from '../../utils/vehicleIcons';

interface GoogleMapsIntegrationProps {
  apiKey: string;
  devices: Device[];
  vehicles?: Vehicle[];
  /**
   * Optional identifier of the selected device. When provided, the component becomes controlled
   * and will highlight and center the specified device. When omitted, the component manages its
   * own selection state internally.
   */
  selectedDevice?: string;
  /**
   * Callback triggered when a device marker or list item is selected.
   */
  onDeviceSelect?: (deviceId: string) => void;
  /**
   * Layout variant. `full` renders the complete fleet map experience used in the dedicated map
   * page, while `dashboard` provides a compact layout tailored for dashboard cards.
   */
  variant?: 'full' | 'dashboard';
  /**
   * Additional classes applied to the outer container when using the dashboard variant.
   */
  className?: string;
}

export const GoogleMapsIntegration: React.FC<GoogleMapsIntegrationProps> = (props) => {
  const {
    apiKey,
    devices,
    vehicles = [],
    selectedDevice,
    onDeviceSelect,
    variant = 'full',
    className
  } = props;
  const isControlled = Object.prototype.hasOwnProperty.call(props, 'selectedDevice');
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [internalSelectedDevice, setInternalSelectedDevice] = useState<string>();
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  const [showOfflineDevices, setShowOfflineDevices] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const lastCenteredDeviceRef = useRef<string>();
  const lastCenteredPositionRef = useRef<{ lat: number; lng: number }>();

  const activeSelectedDevice = isControlled ? selectedDevice : internalSelectedDevice;

  useEffect(() => {
    if (isControlled) {
      setInternalSelectedDevice(selectedDevice);
    }
  }, [isControlled, selectedDevice]);

  const isDashboardVariant = variant === 'dashboard';
  const mapHeightClass = useMemo(
    () => (isDashboardVariant ? 'h-64 sm:h-80 lg:h-96' : 'h-[600px]'),
    [isDashboardVariant]
  );

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

    const bounds = new google.maps.LatLngBounds();
    let hasVisibleDevice = false;

    filteredDevices.forEach((device) => {
      if (!device.position) return;

      const position = {
        lat: device.position.lat,
        lng: device.position.lon
      };

      const speedValue = device.position.speed ?? 0;
      const ignitionOn = Boolean(device.position.ignition);
      const odometerValue = device.position.odometer;
      const formattedOdometer =
        typeof odometerValue === 'number' ? `${odometerValue.toLocaleString()} km` : 'N/A';
      const fuelValue = device.position.fuel;
      const formattedFuel = typeof fuelValue === 'number' ? `${fuelValue}%` : null;
      const formattedSpeed = `${speedValue} km/h`;
      const formattedHeading =
        typeof device.position.heading === 'number'
          ? `${device.position.heading.toFixed(0)}°`
          : 'N/A';
      const lastUpdate = device.lastUpdate
        ? new Date(device.lastUpdate).toLocaleString('pt-BR')
        : 'N/A';

      bounds.extend(position);
      hasVisibleDevice = true;

      // Create custom marker icon based on device status
      const getMarkerIcon = () => {
        const vehicleType = getVehicleTypeFromDevice(device.id, vehicles);
        const vehiclePhoto = getVehiclePhotoFromDevice(device.id, vehicles);
        const isMoving = ignitionOn && speedValue > 5;
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
                <span style="color: #374151; font-size: 12px; margin-left: 4px; font-weight: 500;">${formattedSpeed}</span>
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: #6B7280; font-size: 12px;">Ignição:</span>
                <span style="color: ${ignitionOn ? '#10B981' : '#EF4444'}; font-size: 12px; margin-left: 4px; font-weight: 500;">${ignitionOn ? 'Ligada' : 'Desligada'}</span>
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: #6B7280; font-size: 12px;">Odômetro:</span>
                <span style="color: #374151; font-size: 12px; margin-left: 4px;">${formattedOdometer}</span>
              </div>
              ${formattedFuel ? `
                <div style="margin-bottom: 4px;">
                  <span style="color: #6B7280; font-size: 12px;">Combustível:</span>
                  <span style="color: #374151; font-size: 12px; margin-left: 4px;">${formattedFuel}</span>
                </div>
              ` : ''}
              <div style="margin-bottom: 4px;">
                <span style="color: #6B7280; font-size: 12px;">Direção:</span>
                <span style="color: #374151; font-size: 12px; margin-left: 4px;">${formattedHeading}</span>
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
                <span style="color: #9CA3AF; font-size: 11px;">Última atualização: ${lastUpdate}</span>
              </div>
            ` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        handleDeviceSelection(device.id);

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

    if (hasVisibleDevice) {
      if (markersRef.current.length === 1) {
        mapInstance.setCenter(bounds.getCenter());
        const currentZoom = mapInstance.getZoom() ?? 12;
        mapInstance.setZoom(Math.max(currentZoom, 14));
      } else {
        mapInstance.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 } as google.maps.Padding);
      }
    }
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
  }, [map, devices, vehicles, showOfflineDevices, selectedDevice]);

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

  const mapControls = (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      {/* Zoom Controls */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <button
          onClick={handleZoomIn}
          className={`block ${isDashboardVariant ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center hover:bg-gray-50 transition-colors border-b border-gray-200`}
        >
          <ZoomIn size={isDashboardVariant ? 14 : 16} />
        </button>
        <button
          onClick={handleZoomOut}
          className={`block ${isDashboardVariant ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center hover:bg-gray-50 transition-colors`}
        >
          <ZoomOut size={isDashboardVariant ? 14 : 16} />
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

      {/* Traffic Layer */}
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
        className={`bg-white rounded-lg shadow-lg border border-gray-200 ${isDashboardVariant ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center hover:bg-gray-50 transition-colors`}
        title="Resetar visualização"
      >
        <RotateCcw size={isDashboardVariant ? 14 : 16} />
      </button>
    </div>
  );

  const legend = (
    <div className={`absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 ${isDashboardVariant ? 'text-xs' : ''}`}>
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
  );

  if (isDashboardVariant) {
    return (
      <div className={className}>
        <div className={`relative ${mapHeightClass}`}>
          <div className="w-full h-full" ref={mapRef} />
          {mapControls}
          {legend}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-green-600">{onlineDevices.length}</p>
            <p className="text-xs text-gray-600">Online</p>
          </div>
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-blue-600">{movingDevices.length}</p>
            <p className="text-xs text-gray-600">Em movimento</p>
          </div>
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-yellow-600">{stoppedDevices.length}</p>
            <p className="text-xs text-gray-600">Parados</p>
          </div>
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-gray-600">{offlineDevices.length}</p>
            <p className="text-xs text-gray-600">Offline</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className={`relative w-full ${mapHeightClass}`}>
              <div className="w-full h-full" ref={mapRef} />
              {mapControls}
              {legend}
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
                const speed = typeof device.position?.speed === 'number' ? device.position.speed : undefined;

                return (
                  <button
                    key={device.id}
                    onClick={() => {
                      handleDeviceSelection(device.id);
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
                        {typeof speed === 'number' && (
                          <div className="text-xs text-gray-500">
                            {speed} km/h
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
          {activeSelectedDevice && (() => {
            const device = devices.find(d => d.id === activeSelectedDevice);
            if (!device) return null;

            const odometerValue = device.position?.odometer;
            const formattedOdometer =
              typeof odometerValue === 'number' ? `${odometerValue.toLocaleString()} km` : 'N/A';
            const fuelValue = device.position?.fuel;
            const formattedFuel = typeof fuelValue === 'number' ? `${fuelValue}%` : 'N/A';
            const formattedHeading =
              typeof device.position?.heading === 'number'
                ? `${device.position.heading.toFixed(0)}°`
                : 'N/A';
            const formattedSpeed =
              typeof device.position?.speed === 'number' ? `${device.position.speed} km/h` : 'N/A';
            const formattedSatellites =
              typeof device.position?.satellites === 'number' ? device.position.satellites : 'N/A';
            const lastUpdate = device.lastUpdate
              ? new Date(device.lastUpdate).toLocaleString('pt-BR')
              : 'N/A';

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
                        <p className="text-sm font-medium text-gray-900">{formattedSpeed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Direção</p>
                        <p className="text-sm font-medium text-gray-900">{formattedHeading}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Coordenadas</p>
                        <p className="text-sm font-medium text-gray-900">
                          {device.position.lat.toFixed(6)}, {device.position.lon.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Odômetro</p>
                        <p className="text-sm font-medium text-gray-900">{formattedOdometer}</p>
                      </div>
                      {typeof device.position.fuel === 'number' && (
                        <div>
                          <p className="text-xs text-gray-600">Combustível</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.max(0, Math.min(device.position.fuel, 100))}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{formattedFuel}</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Satélites</p>
                        <p className="text-sm font-medium text-gray-900">{formattedSatellites}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs text-gray-600">Última atualização</p>
                    <p className="text-sm font-medium text-gray-900">{lastUpdate}</p>
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