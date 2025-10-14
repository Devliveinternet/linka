import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Device, Vehicle } from '../types';
import {
  createVehicleIcon,
  getVehiclePhotoFromDevice,
  getVehicleTypeFromDevice
} from '../utils/vehicleIcons';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_SCRIPT_ID } from '../utils/googleMaps';
import { Circle, Navigation, Square, type LucideIcon } from 'lucide-react';

type MapStyle = 'roadmap' | 'satellite' | 'terrain';

interface UseGoogleFleetMapParams {
  apiKey: string;
  devices: Device[];
  vehicles?: Vehicle[];
}

interface UseGoogleFleetMapResult {
  mapRef: MutableRefObject<HTMLDivElement | null>;
  map: google.maps.Map | null;
  selectedDevice?: string;
  setSelectedDevice: Dispatch<SetStateAction<string | undefined>>;
  mapStyle: MapStyle;
  handleMapStyleChange: (style: MapStyle) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  toggleTraffic: () => void;
  showTraffic: boolean;
  showOfflineDevices: boolean;
  setShowOfflineDevices: (value: boolean) => void;
  showGeofences: boolean;
  setShowGeofences: (value: boolean) => void;
  filteredDevices: Device[];
  onlineDevices: Device[];
  movingDevices: Device[];
  stoppedDevices: Device[];
  offlineDevices: Device[];
  getStatusColor: (device: Device) => string;
  getStatusIcon: (device: Device) => LucideIcon;
  getStatusLabel: (device: Device) => string;
  focusOnDevice: (deviceId: string) => void;
  loadError: string | null;
}

export const useGoogleFleetMap = ({
  apiKey,
  devices,
  vehicles = []
}: UseGoogleFleetMapParams): UseGoogleFleetMapResult => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>();
  const [mapStyle, setMapStyle] = useState<MapStyle>('roadmap');
  const [showOfflineDevices, setShowOfflineDevices] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const loaderRef = useRef<Loader>();

  const createVehicleMarkerContent = useCallback((icon: ReturnType<typeof createVehicleIcon>) => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.transform = 'translate(-50%, -100%)';
    wrapper.style.filter = 'drop-shadow(0 12px 18px rgba(15,23,42,0.35))';

    const body = document.createElement('div');
    body.style.background = 'white';
    body.style.borderRadius = '14px';
    body.style.padding = icon.url ? '6px' : '8px';
    body.style.display = 'flex';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.boxShadow = '0 8px 16px rgba(15, 23, 42, 0.35)';
    body.style.pointerEvents = 'auto';
    body.dataset.markerPart = 'body';

    if (icon.url) {
      const size = icon.scaledSize?.width ?? icon.size?.width ?? 36;
      const img = document.createElement('img');
      img.src = icon.url;
      img.alt = '';
      img.style.width = `${size}px`;
      img.style.height = `${size}px`;
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      body.appendChild(img);
    } else if (icon.path) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const scale = icon.scale ?? 1;
      const width = 24 * scale;
      const height = 24 * scale;
      svg.setAttribute('width', `${width}`);
      svg.setAttribute('height', `${height}`);
      svg.style.transform = `rotate(${icon.rotation ?? 0}deg)`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', icon.path);
      if (icon.fillColor) path.setAttribute('fill', icon.fillColor);
      if (icon.fillOpacity != null) path.setAttribute('fill-opacity', String(icon.fillOpacity));
      if (icon.strokeColor) path.setAttribute('stroke', icon.strokeColor);
      if (icon.strokeOpacity != null) path.setAttribute('stroke-opacity', String(icon.strokeOpacity));
      if (icon.strokeWeight != null) path.setAttribute('stroke-width', String(icon.strokeWeight));
      svg.appendChild(path);
      body.appendChild(svg);
    }

    const pointer = document.createElement('div');
    pointer.style.width = '0';
    pointer.style.height = '0';
    pointer.style.borderLeft = '8px solid transparent';
    pointer.style.borderRight = '8px solid transparent';
    pointer.style.borderTop = '12px solid rgba(15,23,42,0.75)';
    pointer.style.marginTop = '2px';
    pointer.style.pointerEvents = 'none';
    pointer.dataset.markerPart = 'pointer';

    const shadow = document.createElement('div');
    shadow.style.width = '18px';
    shadow.style.height = '6px';
    shadow.style.borderRadius = '50%';
    shadow.style.background = 'rgba(15,23,42,0.35)';
    shadow.style.filter = 'blur(4px)';
    shadow.style.marginTop = '4px';
    shadow.style.pointerEvents = 'none';
    shadow.dataset.markerPart = 'shadow';

    wrapper.appendChild(body);
    wrapper.appendChild(pointer);
    wrapper.appendChild(shadow);

    return wrapper;
  }, []);

  const addDeviceMarkers = useCallback(
    (mapInstance: google.maps.Map) => {
      markersRef.current.forEach(marker => (marker.map = null));
      markersRef.current = [];

      const devicesToRender = showOfflineDevices
        ? devices
        : devices.filter(device => device.status === 'online');

      devicesToRender.forEach(device => {
        if (!device.position) return;

        const position = {
          lat: device.position.lat,
          lng: device.position.lon
        };

        const getMarkerIcon = () => {
          const vehicleType = getVehicleTypeFromDevice(device.id, vehicles);
          const vehiclePhoto = getVehiclePhotoFromDevice(device.id, vehicles);
          const isMoving = device.position?.ignition && device.position?.speed > 5;
          const isSelected = selectedDevice === device.id;

          return createVehicleIcon(
            vehicleType,
            device.status,
            isMoving,
            isSelected,
            vehiclePhoto,
            device.position?.heading ?? 0
          );
        };

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position,
          map: mapInstance,
          title: `${getVehicleTypeFromDevice(device.id, vehicles).toUpperCase()} - ${device.status}`,
          content: createVehicleMarkerContent(getMarkerIcon()),
        });

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

          markersRef.current.forEach(otherMarker => {
            if (otherMarker !== marker && (otherMarker as any).infoWindow) {
              (otherMarker as any).infoWindow.close();
            }
          });

          infoWindow.open({ map: mapInstance, anchor: marker });
          (marker as any).infoWindow = infoWindow;
        });

        markersRef.current.push(marker);
      });
    },
    [createVehicleMarkerContent, devices, selectedDevice, showOfflineDevices, vehicles]
  );

  const resolveGoogleMapsErrorMessage = useCallback((error: unknown) => {
    const rawMessage =
      typeof error === 'string'
        ? error
        : error instanceof Error
        ? error.message
        : '';

    if (rawMessage.includes('BillingNotEnabledMapError')) {
      return 'O faturamento da API do Google Maps não está habilitado. Acesse o Google Cloud Console e ative o faturamento para o projeto associado à chave utilizada.';
    }

    if (rawMessage.includes('InvalidKeyMapError')) {
      return 'A chave informada para o Google Maps é inválida. Verifique se foi copiada corretamente e se não possui restrições incompatíveis.';
    }

    if (rawMessage.includes('RefererNotAllowedMapError')) {
      return 'O domínio atual não está autorizado a usar esta chave da API do Google Maps. Ajuste as restrições de referer no Google Cloud Console.';
    }

    if (rawMessage.includes('RequestDeniedMapError')) {
      return 'A solicitação ao Google Maps foi negada. Confirme se a API Maps JavaScript está habilitada e se a chave possui permissões suficientes.';
    }

    if (rawMessage.includes('ApiNotActivatedMapError')) {
      return 'A API Maps JavaScript não está habilitada no projeto. Ative-a no Google Cloud Console antes de continuar.';
    }

    return rawMessage || 'Não foi possível carregar o Google Maps. Verifique a configuração da chave da API.';
  }, []);

  const initializeMap = useCallback(async () => {
    if (!apiKey || !mapRef.current) {
      if (!apiKey) {
        setLoadError('Nenhuma chave da API do Google Maps foi configurada. Salve uma chave válida para visualizar o mapa.');
      }
      return;
    }

    if (!loaderRef.current) {
      loaderRef.current = new Loader({
        apiKey,
        version: 'weekly',
        libraries: [...GOOGLE_MAPS_LIBRARIES],
        id: GOOGLE_MAPS_SCRIPT_ID
      });
    }

    try {
      setLoadError(null);
      await loaderRef.current.load();

      if (!mapRef.current) return;

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
    } catch (error) {
      console.error('Error loading Google Maps API', error);
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      setMap(null);
      setLoadError(resolveGoogleMapsErrorMessage(error));
      loaderRef.current = undefined;
    }
  }, [apiKey, addDeviceMarkers, resolveGoogleMapsErrorMessage]);

  useEffect(() => {
    if (!apiKey) return;
    initializeMap();
  }, [apiKey, initializeMap]);

  useEffect(() => {
    if (map && !loadError) {
      addDeviceMarkers(map);
    }
  }, [map, addDeviceMarkers, loadError]);

  const handleZoomIn = useCallback(() => {
    if (map) {
      const currentZoom = map.getZoom() || 12;
      map.setZoom(currentZoom + 1);
    }
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (map) {
      const currentZoom = map.getZoom() || 12;
      map.setZoom(Math.max(currentZoom - 1, 1));
    }
  }, [map]);

  const handleResetView = useCallback(() => {
    if (map) {
      map.setCenter({ lat: -16.6799, lng: -49.255 });
      map.setZoom(12);
    }
  }, [map]);

  const handleMapStyleChange = useCallback(
    (style: MapStyle) => {
      if (!map) return;

      const mapTypeId = {
        roadmap: google.maps.MapTypeId.ROADMAP,
        satellite: google.maps.MapTypeId.SATELLITE,
        terrain: google.maps.MapTypeId.TERRAIN
      };

      map.setMapTypeId(mapTypeId[style]);
      setMapStyle(style);
    },
    [map]
  );

  const toggleTraffic = useCallback(() => {
    if (!map) return;

    if (showTraffic && trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
    } else if (!showTraffic) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
      trafficLayerRef.current.setMap(map);
    }

    setShowTraffic(prev => !prev);
  }, [map, showTraffic]);

  const onlineDevices = useMemo(
    () => devices.filter(device => device.status === 'online'),
    [devices]
  );

  const movingDevices = useMemo(
    () => devices.filter(device => device.position?.ignition && device.position?.speed > 5),
    [devices]
  );

  const stoppedDevices = useMemo(
    () =>
      devices.filter(
        device => device.status === 'online' && device.position?.ignition && (device.position?.speed || 0) <= 5
      ),
    [devices]
  );

  const offlineDevices = useMemo(
    () => devices.filter(device => device.status === 'offline'),
    [devices]
  );

  const filteredDevices = useMemo(
    () => (showOfflineDevices ? devices : onlineDevices),
    [devices, onlineDevices, showOfflineDevices]
  );

  const getStatusColor = useCallback((device: Device) => {
    if (device.status === 'offline') return 'text-gray-400';
    if (device.position?.ignition && (device.position?.speed || 0) > 5) return 'text-green-500';
    if (device.position?.ignition) return 'text-yellow-500';
    return 'text-blue-500';
  }, []);

  const getStatusIcon = useCallback((device: Device) => {
    if (device.status === 'offline') return Circle;
    if (device.position?.ignition && (device.position?.speed || 0) > 5) return Navigation;
    if (device.position?.ignition) return Square;
    return Circle;
  }, []);

  const getStatusLabel = useCallback((device: Device) => {
    if (device.status === 'offline') return 'Offline';
    if (device.position?.ignition && (device.position?.speed || 0) > 5) return 'Em movimento';
    if (device.position?.ignition) return 'Parado (ligado)';
    return 'Parado (desligado)';
  }, []);

  const focusOnDevice = useCallback(
    (deviceId: string) => {
      if (!map) return;

      const device = devices.find(item => item.id === deviceId);
      if (!device?.position) return;

      map.setCenter({ lat: device.position.lat, lng: device.position.lon });
      map.setZoom(15);
    },
    [devices, map]
  );

  return {
    mapRef,
    map,
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
  };
};

