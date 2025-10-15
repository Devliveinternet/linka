import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import {
  Navigation,
  Square,
  Circle as CircleIcon,
  Search,
  RefreshCcw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTraccarRealtime } from '../hooks/useTraccarRealtime';

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 5;

type Position = {
  deviceId: number;
  latitude: number;
  longitude: number;
  speed?: number;
  course?: number;
  fixTime?: string;
  deviceTime?: string;
  serverTime?: string;
  attributes?: Record<string, any>;
};

type StatusKey = 'moving' | 'running' | 'idle' | 'offline';

const statusColors: Record<StatusKey, string> = {
  moving: '#22c55e',
  running: '#f59e0b',
  idle: '#3b82f6',
  offline: '#9ca3af'
};

const tsOf = (position?: Position) => {
  if (!position) return 0;
  const ts = position.fixTime || position.deviceTime || position.serverTime;
  return ts ? new Date(ts).getTime() : 0;
};

const kmh = (speed?: number) => {
  if (typeof speed !== 'number') return 0;
  return Math.round(speed * 3.6);
};

const statusFor = (position?: Position): StatusKey => {
  if (!position) return 'offline';
  const timestamp = tsOf(position);
  if (!timestamp || Date.now() - timestamp > 10 * 60 * 1000) {
    return 'offline';
  }
  const speed = kmh(position.speed);
  if (speed > 10) return 'moving';
  if (speed > 0) return 'running';
  return 'idle';
};

const formatTime = (position?: Position) => {
  const ts = tsOf(position);
  if (!ts) return 'Sem dados';
  return new Date(ts).toLocaleString();
};

export const OpenStreetLiveMap: React.FC = () => {
  const { apiFetch, token } = useAuth();
  const mapRef = useRef<LeafletMap | null>(null);
  const [deviceSnapshots, setDeviceSnapshots] = useState<Map<number, Position>>(() => new Map());
  const [nameMap, setNameMap] = useState<Record<number, string>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    apiFetch<Record<number, string>>('/traccar/devices/map')
      .then((result) => setNameMap(result || {}))
      .catch(() => setNameMap({}));

    apiFetch<Position[]>('/traccar/positions/latest')
      .then((positions) => {
        if (Array.isArray(positions)) {
          applyBatch(positions);
          fitToMarkers(positions);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiFetch, token]);

  const applyBatch = (batch: Position[]) => {
    setDeviceSnapshots((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const position of batch) {
        if (typeof position.latitude !== 'number' || typeof position.longitude !== 'number') continue;
        const prevPos = prev.get(position.deviceId);
        if (!prevPos || tsOf(position) >= tsOf(prevPos)) {
          next.set(position.deviceId, position);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const fitToMarkers = (positions: Position[] | Map<number, Position>) => {
    const map = mapRef.current;
    if (!map) return;

    const items = Array.isArray(positions) ? positions : Array.from(positions.values());
    const valid = items.filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number');
    if (!valid.length) return;

    const bounds = L.latLngBounds(valid.map((item) => [item.latitude, item.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48] });
  };

  useEffect(() => {
    if (!mapRef.current) return;
    if (!deviceSnapshots.size) return;
    fitToMarkers(deviceSnapshots);
  }, [deviceSnapshots]);

  useTraccarRealtime({
    onPositions: (positions: Position[]) => {
      if (Array.isArray(positions) && positions.length) {
        applyBatch(positions);
      }
    }
  });

  const entries = useMemo(() => {
    const base = Array.from(deviceSnapshots.entries()).map(([id, snapshot]) => ({
      id,
      name: nameMap[id] || `Dispositivo ${id}`,
      snapshot,
      status: statusFor(snapshot)
    }));

    base.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [deviceSnapshots, nameMap, query]);

  const counts = useMemo(() => {
    const values = Array.from(deviceSnapshots.values());
    const total = values.length;
    const moving = values.filter((pos) => statusFor(pos) === 'moving').length;
    const running = values.filter((pos) => statusFor(pos) === 'running').length;
    const idle = values.filter((pos) => statusFor(pos) === 'idle').length;
    const offline = values.filter((pos) => statusFor(pos) === 'offline').length;

    return { total, moving, running, idle, offline };
  }, [deviceSnapshots]);

  const focusOnDevice = (deviceId: number) => {
    const position = deviceSnapshots.get(deviceId);
    if (!position || !mapRef.current) return;

    mapRef.current.setView([position.latitude, position.longitude], Math.max(mapRef.current.getZoom(), 13), {
      animate: true
    });
  };

  const resetView = () => {
    if (!mapRef.current) return;
    if (deviceSnapshots.size) {
      fitToMarkers(deviceSnapshots);
    } else {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mapa em tempo real (OpenStreetMap)</h2>
              <p className="text-sm text-gray-600">Atualizações em tempo real utilizando tiles públicos gratuitos</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
              <RefreshCcw size={14} />
              Atualização automática
            </div>
          </div>

          <div className="relative h-[520px]">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              className="absolute inset-0"
              whenCreated={(map) => {
                mapRef.current = map;
                if (deviceSnapshots.size) {
                  fitToMarkers(deviceSnapshots);
                }
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {entries.map(({ id, snapshot, status, name }) => (
                <CircleMarker
                  key={id}
                  center={[snapshot.latitude, snapshot.longitude]}
                  radius={11}
                  pathOptions={{
                    color: statusColors[status],
                    fillColor: statusColors[status],
                    fillOpacity: 0.85,
                    weight: 3
                  }}
                  eventHandlers={{
                    click: () => focusOnDevice(id)
                  }}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        {status === 'moving' ? (
                          <Navigation size={16} className="text-green-600" />
                        ) : status === 'running' ? (
                          <Square size={16} className="text-yellow-500" />
                        ) : (
                          <CircleIcon size={16} className={status === 'idle' ? 'text-blue-500' : 'text-gray-400'} />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{name}</p>
                          <p className="text-xs text-gray-500">ID: {id}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase">Velocidade</p>
                          <p className="font-medium">{kmh(snapshot.speed)} km/h</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase">Última atualização</p>
                          <p className="font-medium">{formatTime(snapshot)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase">Latitude</p>
                          <p className="font-medium">{snapshot.latitude.toFixed(5)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase">Longitude</p>
                          <p className="font-medium">{snapshot.longitude.toFixed(5)}</p>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            <div className="absolute top-4 right-4 space-y-2 z-10">
              <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <button
                  onClick={() => mapRef.current?.zoomIn()}
                  className="block w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors border-b border-gray-200"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => mapRef.current?.zoomOut()}
                  className="block w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ZoomOut size={16} />
                </button>
              </div>

              <button
                onClick={resetView}
                className="bg-white rounded-lg shadow border border-gray-200 w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                title="Centralizar mapa"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow border border-gray-200 p-3 text-xs text-gray-600">
              <h4 className="font-semibold text-gray-900 mb-2">Legenda</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.moving }} />
                  <span>Em movimento</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.running }} />
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

            {!entries.length && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/95 text-center px-6">
                <WifiOff className="w-10 h-10 text-gray-400" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Nenhuma posição disponível</h3>
                  <p className="text-sm text-gray-600 max-w-sm">
                    Aguarde alguns instantes enquanto recebemos as primeiras coordenadas dos dispositivos conectados.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumo da Frota</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-2xl font-semibold text-blue-600">{counts.total}</p>
              <p className="text-xs text-gray-500">Com posição</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-2xl font-semibold text-green-600">{counts.moving}</p>
              <p className="text-xs text-gray-500">Em movimento</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-2xl font-semibold text-yellow-600">{counts.running}</p>
              <p className="text-xs text-gray-500">Parado (ligado)</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-2xl font-semibold text-gray-500">{counts.offline}</p>
              <p className="text-xs text-gray-500">Sem atualização &gt; 10 min</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar dispositivo"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <span className="text-xs text-gray-500">{entries.length} dispositivos</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
            {entries.map(({ id, name, snapshot, status }) => (
              <button
                key={id}
                onClick={() => focusOnDevice(id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: statusColors[status] }}
                >
                  {status === 'moving' ? <Navigation size={14} /> : status === 'running' ? <Square size={14} /> : <CircleIcon size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-500 truncate">Último sinal: {formatTime(snapshot)}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p className="font-semibold text-gray-700">{kmh(snapshot.speed)} km/h</p>
                  <p>{status === 'offline' ? 'Offline' : status === 'moving' ? 'Em movimento' : status === 'running' ? 'Parado (ligado)' : 'Parado (desligado)'}</p>
                </div>
              </button>
            ))}
            {!entries.length && (
              <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                <WifiOff size={16} />
                Nenhum dispositivo com posição encontrada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

