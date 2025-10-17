import { useState, useEffect, useCallback } from 'react';
import { Alert, Trip, Geofence, Vehicle } from '../types';
import { useAuth } from '../context/AuthContext';

type DeviceSummary = {
  id: number;
  name: string;
  uniqueId: string;
  status: 'online' | 'offline' | 'unknown' | string;
  model?: string;
  category?: string;
  lastUpdate?: string;
  minutesAgo?: number;
  lastFixTime?: string;
  speedKmh?: number;
  address?: string;
};

interface TraccarData {
  devices: DeviceSummary[];  // <- agora usa o resumo enriquecido
  alerts: Alert[];
  trips: Trip[];             // carregue sob demanda em outra tela
  geofences: Geofence[];
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
}

interface UseTraccarDataOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export const useTraccarData = ({
  refreshInterval = 30000,
  autoRefresh = true,
}: UseTraccarDataOptions = {}) => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<TraccarData>({
    devices: [],
    alerts: [],
    trips: [],          // vamos deixar vazio por padrão
    geofences: [],
    vehicles: [],
    loading: true,
    error: null,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({
        ...prev,
        error: null,
        // Evita piscar a aplicação inteira após o carregamento inicial
        loading: isInitialLoad ? true : prev.loading,
      }));

      // Devices (enriquecidos), Alerts e Geofences em paralelo
      const [devices, alerts, geofences] = await Promise.all([
        apiFetch<DeviceSummary[]>('/traccar/devices/enriched'),
        apiFetch<Alert[]>('/traccar/events'),
        apiFetch<Geofence[]>('/traccar/geofences'),
      ]);

      // Drivers e Vehicles derivados dos devices (placeholders para os campos que não existem no Traccar)
      const vehicles: Vehicle[] = devices.map((d, index) => ({
        id: `vehicle_${d.id}`,
        tenantId: (d as any).tenantId ?? 'default',
        plate: d.uniqueId?.slice(-6)?.toUpperCase() || `ABC${String(1000 + index)}`,
        model: d.model,
        year: 2020 + (index % 5),
        brand: ['Scania', 'Volvo', 'Mercedes', 'Iveco', 'Ford'][index % 5],
        fuelType: 'diesel',
        deviceId: d.id,
        driverId: undefined,
        status: d.status === 'online' ? 'active' : 'inactive',
        odometer: 0,                 // não vem do Traccar por padrão
        nextMaintenance: 5000,       // placeholder
        vehicleType: 'truck',
      }));

      setData({
        devices,
        alerts,
        trips: [],       // mantenha vazio; busque trips quando necessário
        geofences,
        vehicles,
        loading: false,
        error: null,
      });
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('Error fetching Traccar data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }));
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [apiFetch, isInitialLoad]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData, refreshInterval]);

  return {
    ...data,
    refetch: fetchData,
  };
};
