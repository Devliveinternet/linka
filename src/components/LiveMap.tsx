import React, { useEffect, useState } from 'react';
import type { MapProvider } from '../types';
import GoogleLiveMap from './GoogleLiveMap';
import { OpenStreetLiveMap } from './OpenStreetLiveMap';

const resolveProvider = (provider: string | null): MapProvider['id'] => {
  if (provider === 'google' || provider === 'openstreetmap') {
    return provider;
  }
  return 'openstreetmap';
};

const LiveMap: React.FC = () => {
  const [mapProvider, setMapProvider] = useState<MapProvider['id']>('openstreetmap');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setMapProvider(resolveProvider(localStorage.getItem('mapProvider')));
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'mapProvider') {
        setMapProvider(resolveProvider(event.newValue));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!initialized) {
    return null;
  }

  if (mapProvider !== 'google') {
    return <OpenStreetLiveMap />;
  }

  return <GoogleLiveMap />;
};

export default LiveMap;

