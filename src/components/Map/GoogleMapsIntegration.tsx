import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Navigation, Circle, Square, AlertTriangle } from 'lucide-react';
import { Device, Vehicle } from '../../types';
import { useGoogleFleetMap } from '../../hooks/useGoogleFleetMap';
import { GOOGLE_MAPS_MAP_ID_STORAGE_KEY } from '../../utils/googleMaps';

interface GoogleMapsIntegrationProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  devices: Device[];
  vehicles?: Vehicle[];
}

export const GoogleMapsIntegration: React.FC<GoogleMapsIntegrationProps> = ({
  apiKey,
  devices,
  vehicles = []
}) => {
  const storedMapId = typeof window !== 'undefined'
    ? window.localStorage?.getItem(GOOGLE_MAPS_MAP_ID_STORAGE_KEY)?.trim() ?? ''
    : '';

  const {
    mapRef,
    selectedDevice,
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
  } = useGoogleFleetMap({ apiKey, mapId: storedMapId, devices, vehicles });

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
            <div className="relative h-[600px]">
              <div ref={mapRef} className="absolute inset-0" />

              {loadError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/95 text-center px-6">
                  <AlertTriangle className="w-10 h-10 text-yellow-600" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Não foi possível carregar o Google Maps</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">{loadError}</p>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Revise a configuração da chave na área de Administração → Configurações → Mapas. Certifique-se de que a API
                      Maps JavaScript está habilitada e que o faturamento está ativo.
                    </p>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
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
              {filteredDevices.map((device) => {
                const StatusIcon = getStatusIcon(device);
                const isSelected = selectedDevice === device.id;

                return (
                  <button
                    key={device.id}
                    onClick={() => {
                      setSelectedDevice(device.id);
                      focusOnDevice(device.id);
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