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

  const markersRef = useRef<google.maps.Marker[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const loaderRef = useRef<Loader>();

  const addDeviceMarkers = useCallback(
    (mapInstance: google.maps.Map) => {
      markersRef.current.forEach(marker => marker.setMap(null));
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

        const marker = new google.maps.Marker({
          position,
          map: mapInstance,
          icon: getMarkerIcon(),
          title: `${getVehicleTypeFromDevice(device.id, vehicles).toUpperCase()} - ${device.status}`
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

          infoWindow.open(mapInstance, marker);
          (marker as any).infoWindow = infoWindow;
        });

        markersRef.current.push(marker);
      });
    },
    [devices, selectedDevice, showOfflineDevices, vehicles]
  );

  const initializeMap = useCallback(async () => {
    if (!apiKey || !mapRef.current) return;

    if (!loaderRef.current) {
      loaderRef.current = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['maps', 'marker']
      });
    }

    try {
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
    }
  }, [apiKey, addDeviceMarkers]);

  useEffect(() => {
    if (!apiKey) return;
    initializeMap();
  }, [apiKey, initializeMap]);

  useEffect(() => {
    if (map) {
      addDeviceMarkers(map);
    }
  }, [map, addDeviceMarkers]);

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
    focusOnDevice
  };
};

