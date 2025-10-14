import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Square, Circle, ZoomIn, ZoomOut, RotateCcw, AlertTriangle } from 'lucide-react';
import { Device, Vehicle } from '../../types';
import { useGoogleFleetMap } from '../../hooks/useGoogleFleetMap';

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
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');

  useEffect(() => {
    const savedApiKey = localStorage.getItem('googleMapsApiKey');
    if (savedApiKey) {
      setGoogleMapsApiKey(savedApiKey);
    }
  }, []);

  const {
    mapRef,
    selectedDevice: internalSelectedDevice,
    setSelectedDevice,
    mapStyle,
    handleMapStyleChange,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    toggleTraffic,
    showTraffic,
    showOfflineDevices,
    setShowOfflineDevices,
    showGeofences,
    setShowGeofences,
    filteredDevices,
    onlineDevices,
    movingDevices,
    stoppedDevices,
    offlineDevices,
    getStatusColor,
    getStatusIcon,
    getStatusLabel,
    focusOnDevice,
    loadError
  } = useGoogleFleetMap({ apiKey: googleMapsApiKey, devices, vehicles });

  useEffect(() => {
    if (selectedDevice) {
      setSelectedDevice(selectedDevice);
      focusOnDevice(selectedDevice);
    } else {
      setSelectedDevice(undefined);
    }
  }, [selectedDevice, setSelectedDevice, focusOnDevice]);

  useEffect(() => {
    if (internalSelectedDevice && internalSelectedDevice !== selectedDevice) {
      onDeviceSelect(internalSelectedDevice);
    }
  }, [internalSelectedDevice, selectedDevice, onDeviceSelect]);

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
    focusOnDevice(deviceId);
    if (deviceId !== selectedDevice) {
      onDeviceSelect(deviceId);
    }
  };

  if (googleMapsApiKey && typeof window !== 'undefined') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Mapa da Frota</h3>
          <p className="text-sm text-gray-600">Visualização em tempo real com os mesmos recursos do módulo de mapas</p>
        </div>

        <div className="relative h-72 sm:h-80 lg:h-96">
          <div ref={mapRef} className="absolute inset-0" />

          {loadError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 text-center px-4">
              <AlertTriangle className="w-9 h-9 text-yellow-600" />
              <div className="space-y-1.5">
                <h4 className="text-base font-semibold text-gray-900">Mapa indisponível</h4>
                <p className="text-xs sm:text-sm text-gray-600 max-w-sm">
                  {loadError} Acesse Administração → Configurações → Mapas para validar a chave da API e habilitar o faturamento.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="absolute top-4 right-4 space-y-2 z-10">
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                  <button
                    onClick={handleZoomIn}
                    className="block w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors border-b border-gray-200"
                    title="Mais zoom"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="block w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    title="Menos zoom"
                  >
                    <ZoomOut size={14} />
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow border border-gray-200 p-2 space-y-1">
                  <button
                    onClick={() => handleMapStyleChange('roadmap')}
                    className={`w-full px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      mapStyle === 'roadmap' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Mapa
                  </button>
                  <button
                    onClick={() => handleMapStyleChange('satellite')}
                    className={`w-full px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      mapStyle === 'satellite' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Satélite
                  </button>
                  <button
                    onClick={() => handleMapStyleChange('terrain')}
                    className={`w-full px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      mapStyle === 'terrain' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Terreno
                  </button>
                </div>

                <button
                  onClick={toggleTraffic}
                  className={`bg-white rounded-lg shadow border border-gray-200 px-3 py-2 text-xs font-medium transition-colors ${
                    showTraffic ? 'text-orange-700 bg-orange-100 border-orange-200' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Tráfego
                </button>

                <button
                  onClick={handleResetView}
                  className="bg-white rounded-lg shadow border border-gray-200 w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  title="Centralizar mapa"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow border border-gray-200 p-3">
                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Legenda</h4>
                <div className="space-y-1.5 text-xs text-gray-700">
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
            </>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-xl font-semibold text-green-600">{onlineDevices.length}</p>
              <p className="text-xs text-gray-600">Online</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-xl font-semibold text-blue-600">{movingDevices.length}</p>
              <p className="text-xs text-gray-600">Em movimento</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-xl font-semibold text-yellow-600">{stoppedDevices.length}</p>
              <p className="text-xs text-gray-600">Parados</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-xl font-semibold text-gray-600">{offlineDevices.length}</p>
              <p className="text-xs text-gray-600">Offline</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Filtros rápidos</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOfflineDevices}
                  onChange={(event) => setShowOfflineDevices(event.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Mostrar dispositivos offline</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showGeofences}
                  onChange={(event) => setShowGeofences(event.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Mostrar cercas virtuais</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900">Dispositivos</h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredDevices.map((device) => {
                  const StatusIcon = getStatusIcon(device);
                  const isSelected = internalSelectedDevice === device.id;

                  return (
                    <button
                      key={device.id}
                      onClick={() => handleDeviceSelect(device.id)}
                      className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon size={16} className={getStatusColor(device)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{device.model}</p>
                          <p className="text-xs text-gray-600 truncate">{getStatusLabel(device)}</p>
                          {device.position && (
                            <p className="text-xs text-gray-500">{device.position.speed} km/h</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {internalSelectedDevice && (() => {
              const device = devices.find((item) => item.id === internalSelectedDevice);
              if (!device) return null;

              return (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Detalhes do dispositivo</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Modelo</p>
                      <p className="font-medium text-gray-900">{device.model}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">IMEI</p>
                      <p className="font-medium text-gray-900">{device.imei}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                      <p className={`font-medium ${getStatusColor(device)}`}>{getStatusLabel(device)}</p>
                    </div>
                    {device.position && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Velocidade</p>
                            <p className="font-medium text-gray-900">{device.position.speed} km/h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Direção</p>
                            <p className="font-medium text-gray-900">{device.position.heading}°</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Coordenadas</p>
                          <p className="font-medium text-gray-900">
                            {device.position.lat.toFixed(6)}, {device.position.lon.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Odômetro</p>
                          <p className="font-medium text-gray-900">{device.position.odometer.toLocaleString()} km</p>
                        </div>
                        {device.position.fuel !== undefined && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Combustível</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${device.position.fuel}%` }}
                                />
                              </div>
                              <span className="font-medium text-gray-900">{device.position.fuel}%</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Última atualização</p>
                      <p className="font-medium text-gray-900">{new Date(device.lastUpdate).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Mapa da Frota</h3>
        <p className="text-sm text-gray-600">Visualização em tempo real</p>
      </div>
      <div className="relative h-72 sm:h-80 lg:h-96 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3" />
          <p className="text-sm sm:text-base text-gray-500 font-medium">Configure a API do Google Maps</p>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xs mx-auto">
            Para visualizar o mapa interativo, acesse Administração → Configurações → Mapas e informe sua chave da API do Google Maps.
          </p>
        </div>
      </div>
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs sm:text-sm overflow-x-auto">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-green-500" />
            <span className="text-gray-700 whitespace-nowrap">Em movimento</span>
          </div>
          <div className="flex items-center gap-2">
            <Square size={14} className="text-yellow-500" />
            <span className="text-gray-700 whitespace-nowrap">Parado (ligado)</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={14} className="text-blue-500" />
            <span className="text-gray-700 whitespace-nowrap">Parado (desligado)</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={14} className="text-gray-400" />
            <span className="text-gray-700 whitespace-nowrap">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

