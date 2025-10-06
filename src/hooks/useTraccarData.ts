import { useState, useEffect, useCallback } from 'react';
import { Alert, Trip, Geofence, Driver, Vehicle } from '../types';
import { traccarService, type DeviceSummary } from '../services/traccarService';

interface TraccarData {
  devices: DeviceSummary[];  // <- agora usa o resumo enriquecido
  alerts: Alert[];
  trips: Trip[];             // carregue sob demanda em outra tela
  geofences: Geofence[];
  drivers: Driver[];
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
}

export const useTraccarData = (refreshInterval: number = 30000) => {
  const [data, setData] = useState<TraccarData>({
    devices: [],
    alerts: [],
    trips: [],          // vamos deixar vazio por padrão
    geofences: [],
    drivers: [],
    vehicles: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Devices (enriquecidos), Alerts e Geofences em paralelo
      const [devices, alerts, geofences] = await Promise.all([
        traccarService.getDevicesEnriched(),
        traccarService.getAlerts(),
        traccarService.getGeofences(),
      ]);

      // Drivers e Vehicles derivados dos devices (placeholders para os campos que não existem no Traccar)
      const drivers: Driver[] = devices.map((d, index) => ({
        id: `driver_${d.id}`,
        tenantId: (d as any).tenantId ?? 'default',
        name: d.name || `Motorista ${index + 1}`,
        license: `CNH${String(index + 1).padStart(6, '0')}`,
        badge: `B${String(index + 1).padStart(3, '0')}`,
        phone: `+55${String(11000000000 + index).slice(0, 11)}`,
        email: `motorista${index + 1}@linka.com`,
        score: Math.floor(Math.random() * 40) + 60,
        status: d.status === 'online' ? 'active' : 'inactive',
        createdAt: new Date().toISOString(),
      }));

      const vehicles: Vehicle[] = devices.map((d, index) => ({
        id: `vehicle_${d.id}`,
        tenantId: (d as any).tenantId ?? 'default',
        plate: d.uniqueId?.slice(-6)?.toUpperCase() || `ABC${String(1000 + index)}`,
        model: d.model,
        year: 2020 + (index % 5),
        brand: ['Scania', 'Volvo', 'Mercedes', 'Iveco', 'Ford'][index % 5],
        fuelType: 'diesel',
        deviceId: d.id,
        driverId: `driver_${d.id}`,
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
        drivers,
        vehicles,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching Traccar data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return {
    ...data,
    refetch: fetchData,
  };
};
