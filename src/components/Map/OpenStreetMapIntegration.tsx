import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import {
  Navigation,
  Circle,
  Square,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Device, Vehicle } from '../../types';
import { getVehiclePhotoFromDevice, getVehicleTypeFromDevice } from '../../utils/vehicleIcons';

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 5;

const statusColors = {
  moving: '#22c55e',
  stopped: '#f59e0b',
  idle: '#3b82f6',
  offline: '#9ca3af'
} as const;

type StatusKey = keyof typeof statusColors;

interface OpenStreetMapIntegrationProps {
  devices: Device[];
  vehicles?: Vehicle[];
}

const getDeviceStatus = (device: Device): StatusKey => {
  if (device.status === 'offline') return 'offline';
  if (device.position?.ignition && (device.position?.speed || 0) > 5) return 'moving';
  if (device.position?.ignition) return 'stopped';
  return 'idle';
};

const getStatusLabel = (status: StatusKey) => {
  switch (status) {
    case 'moving':
      return 'Em movimento';
    case 'stopped':
      return 'Parado (ligado)';
    case 'idle':
      return 'Parado (desligado)';
    case 'offline':
    default:
      return 'Offline';
  }
};

const getStatusIcon = (status: StatusKey) => {
  switch (status) {
    case 'moving':
      return Navigation;
    case 'stopped':
      return Square;
    case 'idle':
    case 'offline':
    default:
      return Circle;
  }
};

export const OpenStreetMapIntegration: React.FC<OpenStreetMapIntegrationProps> = ({
  devices,
  vehicles = []
}) => {
  const [selectedDevice, setSelectedDevice] = useState<string>();
  const [showOfflineDevices, setShowOfflineDevices] = useState(true);
  const mapRef = useRef<LeafletMap | null>(null);

  const devicesWithLocation = useMemo(
    () => devices.filter(device => device.position && Number.isFinite(device.position.lat) && Number.isFinite(device.position.lon)),
    [devices]
  );

  const onlineDevices = useMemo(
    () => devices.filter(device => device.status === 'online'),
    [devices]
  );

  const movingDevices = useMemo(
    () => devices.filter(device => device.position?.ignition && (device.position?.speed || 0) > 5),
    [devices]
  );

  const stoppedDevices = useMemo(
    () =>
      devices.filter(
        device =>
          device.status === 'online' &&
          device.position?.ignition &&
          (device.position?.speed || 0) <= 5
      ),
    [devices]
  );

  const offlineDevices = useMemo(
    () => devices.filter(device => device.status === 'offline'),
    [devices]
  );

  const filteredDevices = useMemo(
    () =>
      (showOfflineDevices ? devicesWithLocation : devicesWithLocation.filter(device => device.status === 'online')),
    [devicesWithLocation, showOfflineDevices]
  );

  const focusOnDevice = useCallback(
    (deviceId: string) => {
      const device = devicesWithLocation.find(item => item.id === deviceId);
      if (!device?.position || !mapRef.current) return;

      mapRef.current.setView([device.position.lat, device.position.lon], Math.max(mapRef.current.getZoom(), 14), {
        animate: true
      });
    },
    [devicesWithLocation]
  );

  useEffect(() => {
    if (!mapRef.current || !filteredDevices.length) return;

    const bounds = L.latLngBounds(
      filteredDevices.map(device => [device.position!.lat, device.position!.lon] as [number, number])
    );

    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [filteredDevices]);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleResetView = () => {
    if (!mapRef.current) return;

    if (filteredDevices.length) {
      const bounds = L.latLngBounds(
        filteredDevices.map(device => [device.position!.lat, device.position!.lon] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  };

  const renderMarkerPopup = (device: Device) => {
    const status = getDeviceStatus(device);
    const Icon = getStatusIcon(status);
    const vehicleType = getVehicleTypeFromDevice(device.id, vehicles);
    const vehiclePhoto = getVehiclePhotoFromDevice(device.id, vehicles);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-600" />
          <p className="text-sm font-medium text-gray-900">{device.model}</p>
        </div>
        <p className="text-xs text-gray-600">IMEI: {device.imei}</p>
        {device.position && (
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <p className="text-[11px] text-gray-500 uppercase">Latitude</p>
              <p className="font-medium">{device.position.lat.toFixed(5)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase">Longitude</p>
              <p className="font-medium">{device.position.lon.toFixed(5)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase">Velocidade</p>
              <p className="font-medium">{Math.round(device.position.speed || 0)} km/h</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase">Último sinal</p>
              <p className="font-medium">{new Date(device.position.timestamp || device.lastUpdate || '').toLocaleString()}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-200 bg-gray-50 text-[11px] font-semibold"
          >
            {vehicleType?.slice(0, 2).toUpperCase() || 'DV'}
          </span>
          <span>{vehicleType ? vehicleType.toUpperCase() : 'Dispositivo'}</span>
        </div>
        {vehiclePhoto && (
          <img
            src={vehiclePhoto}
            alt="Foto do veículo"
            className="w-full h-24 object-cover rounded-md border border-gray-200"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa da Frota</h1>
          <p className="text-gray-600">Visualização com base no OpenStreetMap sem necessidade de chave de API</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg max-w-md">
          <AlertCircle className="shrink-0" size={18} />
          <p className="text-sm">
            Este mapa gratuito não oferece recursos de tráfego ou imagem de satélite. Configure o Google Maps quando desejar habilitar
            essas camadas adicionais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="relative h-[600px]">
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                className="h-full w-full"
                whenCreated={(map) => {
                  mapRef.current = map;
                  if (devicesWithLocation.length) {
                    const bounds = L.latLngBounds(
                      devicesWithLocation.map(device => [device.position!.lat, device.position!.lon] as [number, number])
                    );
                    map.fitBounds(bounds, { padding: [40, 40] });
                  }
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {filteredDevices.map(device => {
                  const status = getDeviceStatus(device);
                  const color = statusColors[status];

                  return (
                    <CircleMarker
                      key={device.id}
                      center={[device.position!.lat, device.position!.lon]}
                      radius={selectedDevice === device.id ? 12 : 9}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: selectedDevice === device.id ? 0.9 : 0.75,
                        weight: selectedDevice === device.id ? 3 : 2
                      }}
                      eventHandlers={{
                        click: () => {
                          setSelectedDevice(device.id);
                          focusOnDevice(device.id);
                        }
                      }}
                    >
                      <Popup>{renderMarkerPopup(device)}</Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>

              <div className="absolute top-4 right-4 z-10 space-y-2">
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
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

                <button
                  onClick={() => setShowOfflineDevices(prev => !prev)}
                  className="bg-white rounded-lg shadow border border-gray-200 px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2"
                >
                  {showOfflineDevices ? (
                    <>
                      <EyeOff size={14} />
                      Ocultar offline
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Mostrar offline
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetView}
                  className="bg-white rounded-lg shadow border border-gray-200 w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  title="Resetar visualização"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow border border-gray-200 p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Legenda</h4>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.moving }} />
                    <span>Em movimento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.stopped }} />
                    <span>Parado (ligado)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.idle }} />
                    <span>Parado (desligado)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.offline }} />
                    <span>Offline</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
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

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Dispositivos</h3>
              <p className="text-xs text-gray-500">Clique em um dispositivo para centralizar no mapa</p>
            </div>
            <div className="divide-y divide-gray-200 max-h-[420px] overflow-y-auto">
              {filteredDevices.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                  Nenhum dispositivo com localização disponível no momento.
                </div>
              ) : (
                filteredDevices.map(device => {
                  const status = getDeviceStatus(device);
                  const Icon = getStatusIcon(status);

                  return (
                    <button
                      key={device.id}
                      onClick={() => {
                        setSelectedDevice(device.id);
                        focusOnDevice(device.id);
                      }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        selectedDevice === device.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="relative inline-flex items-center justify-center">
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: statusColors[status] }}
                        >
                          <Icon size={14} />
                        </span>
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{device.model}</p>
                        <p className="text-xs text-gray-500">IMEI: {device.imei}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-600">
                          {getStatusLabel(status)}
                        </span>
                        {device.position && (
                          <p className="text-[11px] text-gray-400">
                            {new Date(device.position.timestamp || device.lastUpdate || '').toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

