import { useEffect } from 'react';
import { useAuth, API_BASE_URL, buildApiUrl } from '../context/AuthContext';

type Handlers = {
  onPositions?: (positions: any[]) => void;
  onDevices?: (devices: any[]) => void;
  onEvents?: (events: any[]) => void;
};

export function useTraccarRealtime({ onPositions, onDevices, onEvents }: Handlers) {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return undefined;

    const fallbackBase = typeof window !== 'undefined' ? window.location.origin : '';
    const baseForUrl = API_BASE_URL || fallbackBase || 'http://localhost';
    const url = new URL(buildApiUrl('/traccar/stream'), baseForUrl);
    url.searchParams.set('token', token);

    const es = new EventSource(url.toString());
    const parse = (event: Event) => JSON.parse((event as MessageEvent).data);

    if (onPositions) {
      es.addEventListener('positions', (e) => onPositions(parse(e)));
    }
    if (onDevices) {
      es.addEventListener('devices', (e) => onDevices(parse(e)));
    }
    if (onEvents) {
      es.addEventListener('events', (e) => onEvents(parse(e)));
    }

    es.onerror = () => {
      // o navegador tenta reconectar sozinho; aqui dá pra logar se quiser
    };

    return () => es.close();
  }, [token, onPositions, onDevices, onEvents]);
}
