import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Driver } from '../types';
import { mockDrivers } from '../data/mockData';

export type DriverFormValues = {
  name: string;
  license: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended';
  score?: number;
  vehicleId?: string;
};

interface DriverContextValue {
  drivers: Driver[];
  addDriver: (values: DriverFormValues) => Driver;
  updateDriver: (id: string, values: DriverFormValues) => Driver | undefined;
  removeDriver: (id: string) => void;
  unassignVehicle: (driverId: string) => void;
}

const STORAGE_KEY = 'linka.drivers';

const DriverContext = createContext<DriverContextValue | undefined>(undefined);

const normalizeScore = (score?: number) => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 80;
  }
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
};

const ensureStatus = (status?: string): Driver['status'] => {
  if (status === 'active' || status === 'inactive' || status === 'suspended') {
    return status;
  }
  return 'active';
};

const loadInitialDrivers = (): Driver[] => {
  if (typeof window === 'undefined') {
    return mockDrivers.map(driver => ({ ...driver, tenantId: driver.tenantId || 'default' }));
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Driver[];
      if (Array.isArray(parsed)) {
        return parsed.map(driver => ({
          ...driver,
          score: normalizeScore(driver.score),
          status: ensureStatus(driver.status),
        }));
      }
    }
  } catch (error) {
    console.warn('Não foi possível carregar motoristas do armazenamento local:', error);
  }

  return mockDrivers.map(driver => ({
    ...driver,
    tenantId: driver.tenantId || 'default',
    score: normalizeScore(driver.score),
    status: ensureStatus(driver.status),
  }));
};

const persistDrivers = (drivers: Driver[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
  } catch (error) {
    console.warn('Não foi possível salvar motoristas no armazenamento local:', error);
  }
};

export const DriverProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [drivers, setDrivers] = useState<Driver[]>(() => loadInitialDrivers());

  useEffect(() => {
    persistDrivers(drivers);
  }, [drivers]);

  const releaseVehicle = useCallback((driverList: Driver[], vehicleId?: string, currentDriverId?: string) => {
    if (!vehicleId) {
      return driverList;
    }
    return driverList.map(driver =>
      driver.id !== currentDriverId && driver.vehicleId === vehicleId
        ? { ...driver, vehicleId: undefined }
        : driver
    );
  }, []);

  const addDriver = useCallback((values: DriverFormValues): Driver => {
    const id = `driver_${Date.now()}`;
    const createdAt = new Date().toISOString();
    setDrivers(prev => {
      const sanitizedScore = normalizeScore(values.score);
      const withReleasedVehicles = releaseVehicle(prev, values.vehicleId);
      const next: Driver[] = [
        ...withReleasedVehicles,
        {
          id,
          tenantId: 'default',
          name: values.name.trim(),
          license: values.license.trim(),
          phone: values.phone?.trim() || undefined,
          email: values.email?.trim() || undefined,
          score: sanitizedScore,
          status: ensureStatus(values.status),
          vehicleId: values.vehicleId,
          badge: undefined,
          rfid: undefined,
          createdAt,
        },
      ];
      return next;
    });
    return {
      id,
      tenantId: 'default',
      name: values.name.trim(),
      license: values.license.trim(),
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      score: normalizeScore(values.score),
      status: ensureStatus(values.status),
      vehicleId: values.vehicleId,
      badge: undefined,
      rfid: undefined,
      createdAt,
    };
  }, [releaseVehicle]);

  const updateDriver = useCallback((id: string, values: DriverFormValues): Driver | undefined => {
    let updatedDriver: Driver | undefined;
    setDrivers(prev => {
      const sanitizedScore = normalizeScore(values.score);
      const withReleasedVehicles = releaseVehicle(prev, values.vehicleId, id);
      const next = withReleasedVehicles.map(driver => {
        if (driver.id !== id) {
          return driver;
        }
        updatedDriver = {
          ...driver,
          name: values.name.trim(),
          license: values.license.trim(),
          phone: values.phone?.trim() || undefined,
          email: values.email?.trim() || undefined,
          status: ensureStatus(values.status),
          score: sanitizedScore,
          vehicleId: values.vehicleId,
        };
        return updatedDriver;
      });
      return next;
    });
    return updatedDriver;
  }, [releaseVehicle]);

  const removeDriver = useCallback((id: string) => {
    setDrivers(prev => prev.filter(driver => driver.id !== id));
  }, []);

  const unassignVehicle = useCallback((driverId: string) => {
    setDrivers(prev =>
      prev.map(driver =>
        driver.id === driverId
          ? { ...driver, vehicleId: undefined }
          : driver
      )
    );
  }, []);

  const value = useMemo<DriverContextValue>(() => ({
    drivers,
    addDriver,
    updateDriver,
    removeDriver,
    unassignVehicle,
  }), [drivers, addDriver, updateDriver, removeDriver, unassignVehicle]);

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
};

export const useDrivers = (): DriverContextValue => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDrivers deve ser utilizado dentro de um DriverProvider');
  }
  return context;
};

