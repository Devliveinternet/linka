import { useEffect } from 'react';

type Handlers = {
  onPositions?: (positions: any[]) => void;
  onDevices?: (devices: any[]) => void;
  onEvents?: (events: any[]) => void;
};

export function useTraccarRealtime({ onPositions, onDevices, onEvents }: Handlers) {
  useEffect(() => {
    const es = new EventSource('/traccar/stream');
    es.addEventListener('positions', (e) => onPositions?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('devices',   (e) => onDevices?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('events',    (e) => onEvents?.(JSON.parse((e as MessageEvent).data)));
    es.onerror = () => {
      // o navegador tenta reconectar sozinho; aqui dá pra logar se quiser
    };
    return () => es.close();
  }, []);
}
