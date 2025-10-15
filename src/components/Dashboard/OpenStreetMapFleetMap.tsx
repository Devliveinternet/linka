import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Square,
  Circle as CircleIcon,
  AlertTriangle
} from 'lucide-react';
import { Device, Vehicle } from '../../types';
import { getVehiclePhotoFromDevice, getVehicleTypeFromDevice } from '../../utils/vehicleIcons';

interface FleetMapProps {
  devices: Device[];
  vehicles?: Vehicle[];
  selectedDevice?: string;
  onDeviceSelect: (deviceId: string) => void;
}

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 5;

const statusColors = {
  moving: '#22c55e',
  stopped: '#f59e0b',
  idle: '#3b82f6',
  offline: '#9ca3af'
} as const;

type StatusKey = keyof typeof statusColors;

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

export const OpenStreetMapFleetMap: React.FC<FleetMapProps> = ({
  devices,
  vehicles = [],
  selectedDevice,
  onDeviceSelect
}) => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [showOfflineDevices, setShowOfflineDevices] = useState(true);

  const devicesWithLocation = useMemo(
    () => devices.filter(device => device.position && Number.isFinite(device.position.lat) && Number.isFinite(device.position.lon)),
    [devices]
  );

  const filteredDevices = useMemo(
    () =>
      (showOfflineDevices ? devicesWithLocation : devicesWithLocation.filter(device => device.status === 'online')),
    [devicesWithLocation, showOfflineDevices]
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

  useEffect(() => {
    if (!mapRef.current || !filteredDevices.length) return;

    const bounds = L.latLngBounds(
      filteredDevices.map(device => [device.position!.lat, device.position!.lon] as [number, number])
    );

    mapRef.current.fitBounds(bounds, { padding: [32, 32] });
  }, [filteredDevices]);

  const focusOnDevice = (deviceId: string) => {
    const device = devicesWithLocation.find(item => item.id === deviceId);
    if (!device?.position || !mapRef.current) return;

    mapRef.current.setView([device.position.lat, device.position.lon], Math.max(mapRef.current.getZoom(), 13), {
      animate: true
    });
  };

  const handleSelectDevice = (deviceId: string) => {
    onDeviceSelect(deviceId);
    focusOnDevice(deviceId);
  };

  const handleResetView = () => {
    if (!mapRef.current) return;

    if (filteredDevices.length) {
      const bounds = L.latLngBounds(
        filteredDevices.map(device => [device.position!.lat, device.position!.lon] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [32, 32] });
    } else {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  };

  if (!devicesWithLocation.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="text-yellow-500" size={32} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sem localizações disponíveis</h3>
          <p className="text-sm text-gray-600">Nenhum dispositivo possui coordenadas válidas para exibir no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Mapa da Frota (OpenStreetMap)</h3>
        <p className="text-sm text-gray-600">Mapa gratuito sem necessidade de chave de API</p>
      </div>

      <div className="relative h-72 sm:h-80 lg:h-96">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="absolute inset-0"
          whenCreated={(map) => {
            mapRef.current = map;
            if (devicesWithLocation.length) {
              const bounds = L.latLngBounds(
                devicesWithLocation.map(device => [device.position!.lat, device.position!.lon] as [number, number])
              );
              map.fitBounds(bounds, { padding: [32, 32] });
            }
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredDevices.map(device => {
            const status = getDeviceStatus(device);
            const Icon = status === 'moving' ? Navigation : status === 'stopped' ? Square : CircleIcon;
            const color = statusColors[status];

            return (
              <CircleMarker
                key={device.id}
                center={[device.position!.lat, device.position!.lon]}
                radius={selectedDevice === device.id ? 10 : 8}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: selectedDevice === device.id ? 0.9 : 0.75,
                  weight: selectedDevice === device.id ? 3 : 2
                }}
                eventHandlers={{
                  click: () => handleSelectDevice(device.id)
                }}
              >
                <Popup>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-gray-600" />
                      <p className="text-sm font-medium text-gray-900">{device.model}</p>
                    </div>
                    <p className="text-xs text-gray-600">IMEI: {device.imei}</p>
                    {device.position && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase">Lat</p>
                          <p className="font-medium">{device.position.lat.toFixed(5)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase">Lon</p>
                          <p className="font-medium">{device.position.lon.toFixed(5)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase">Velocidade</p>
                          <p className="font-medium">{Math.round(device.position.speed || 0)} km/h</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase">Última atualização</p>
                          <p className="font-medium">{new Date(device.position.timestamp || device.lastUpdate || '').toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {(() => {
                      const vehiclePhoto = getVehiclePhotoFromDevice(device.id, vehicles);
                      const vehicleType = getVehicleTypeFromDevice(device.id, vehicles);
                      if (!vehiclePhoto && !vehicleType) return null;

                      return (
                        <div className="space-y-1">
                          {vehiclePhoto && (
                            <img
                              src={vehiclePhoto}
                              alt="Foto do veículo"
                              className="w-full h-20 object-cover rounded-md border border-gray-200"
                            />
                          )}
                          {vehicleType && (
                            <p className="text-xs text-gray-600">Tipo: {vehicleType.toUpperCase()}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        <div className="absolute top-4 right-4 space-y-2 z-10">
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="block w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors border-b border-gray-200"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="block w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ZoomOut size={14} />
            </button>
          </div>

          <button
            onClick={() => setShowOfflineDevices(prev => !prev)}
            className="bg-white rounded-lg shadow border border-gray-200 px-3 py-2 text-xs font-medium transition-colors"
          >
            {showOfflineDevices ? 'Ocultar offline' : 'Mostrar offline'}
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
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors.moving }} />
              <span>Em movimento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors.stopped }} />
              <span>Parado (ligado)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors.idle }} />
              <span>Parado (desligado)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors.offline }} />
              <span>Offline</span>
            </div>
          </div>
        </div>
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

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {filteredDevices.map(device => {
            const status = getDeviceStatus(device);

            return (
              <button
                key={device.id}
                onClick={() => handleSelectDevice(device.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  selectedDevice === device.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{device.model}</p>
                  <p className="text-xs text-gray-500">IMEI: {device.imei}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-600">{getStatusLabel(status)}</p>
                  {device.position && (
                    <p className="text-[11px] text-gray-400">
                      {new Date(device.position.timestamp || device.lastUpdate || '').toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

