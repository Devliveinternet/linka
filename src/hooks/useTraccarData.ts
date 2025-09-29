import { useState, useEffect, useCallback } from 'react';
import { Device, Alert, Trip, Geofence, Driver, Vehicle } from '../types';
import { traccarService } from '../services/traccarService';

interface TraccarData {
  devices: Device[];
  alerts: Alert[];
  trips: Trip[];
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
    trips: [],
    geofences: [],
    drivers: [],
    vehicles: [],
    loading: true,
    error: null
  });

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [devices, alerts, trips, geofences] = await Promise.all([
        traccarService.getDevices(),
        traccarService.getAlerts(),
        traccarService.getTrips(),
        traccarService.getGeofences()
      ]);

      // Criar drivers e vehicles baseados nos devices
      const drivers: Driver[] = devices
        .filter(device => device.position)
        .map((device, index) => ({
          id: `driver_${device.id}`,
          tenantId: device.tenantId,
          name: `Motorista ${index + 1}`,
          license: `CNH${String(index + 1).padStart(6, '0')}`,
          badge: `B${String(index + 1).padStart(3, '0')}`,
          phone: `+5511${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
          email: `motorista${index + 1}@linka.com`,
          score: Math.floor(Math.random() * 40) + 60,
          status: device.status === 'online' ? 'active' : 'inactive',
          createdAt: new Date().toISOString()
        }));

      const vehicles: Vehicle[] = devices.map((device, index) => ({
        id: `vehicle_${device.id}`,
        tenantId: device.tenantId,
        plate: `ABC${String(1000 + index)}`,
        model: device.model,
        year: 2020 + (index % 5),
        brand: ['Scania', 'Volvo', 'Mercedes', 'Iveco', 'Ford'][index % 5],
        fuelType: 'diesel',
        deviceId: device.id,
        driverId: `driver_${device.id}`,
        status: device.status === 'online' ? 'active' : 'inactive',
        odometer: device.position?.odometer || 0,
        nextMaintenance: (device.position?.odometer || 0) + 5000,
        vehicleType: 'truck'
      }));

      setData({
        devices,
        alerts,
        trips,
        geofences,
        drivers,
        vehicles,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching Traccar data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Configurar polling para atualizações em tempo real
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return {
    ...data,
    refetch: fetchData
  };
};