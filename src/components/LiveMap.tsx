import { Loader } from '@googlemaps/js-api-loader';
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTraccarRealtime } from '../hooks/useTraccarRealtime';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_SCRIPT_ID, resetGoogleMapsLoaderInstance } from '../utils/googleMaps';

type Position = {
  id?: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  speed?: number;       // Se vier em knots, ajuste fmtSpeed.
  fixTime?: string;
  deviceTime?: string;
  serverTime?: string;
};

type Geofence = {
  id: number;
  name: string;
  description?: string;
  area: string; // "CIRCLE (lon lat, radius)" ou "POLYGON ((lon lat, ...))"
  attributes?: Record<string, any>;
};

type TraccarEvent = {
  id?: number;
  type: string;              // 'geofenceEnter' | 'geofenceExit' | ...
  deviceId: number;
  geofenceId?: number;
  eventTime?: string;
  serverTime?: string;
  attributes?: Record<string, any>;
};

const tsOf = (p: Position) =>
  new Date(p.fixTime || p.deviceTime || p.serverTime || 0).getTime();

// Se velocidade vier em knots (padrão Traccar), troque 3.6 por 1.852
const fmtSpeed = (v?: number) => (v != null ? `${(v * 3.6).toFixed(1)} km/h` : '-');
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '-');

const timeAgo = (iso?: string) => {
  if (!iso) return 'Sem dados';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return fmtTime(iso);

  const diffMs = Date.now() - ts;
  if (diffMs < 0) return 'agora';

  const minutes = Math.round(diffMs / 60000);
  if (minutes <= 1) return 'agora';
  if (minutes < 60) return `há ${minutes} minutos`;

  const hours = Math.round(minutes / 60);
  if (hours === 1) return 'há 1 hora';
  if (hours < 24) return `há ${hours} horas`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'há 1 dia';
  if (days < 7) return `há ${days} dias`;

  const weeks = Math.round(days / 7);
  if (weeks === 1) return 'há 1 semana';
  if (weeks < 5) return `há ${weeks} semanas`;

  const months = Math.round(days / 30);
  if (months === 1) return 'há 1 mês';
  if (months < 12) return `há ${months} meses`;

  const years = Math.round(days / 365);
  if (years <= 1) return 'há 1 ano';
  return `há ${years} anos`;
};

// ---------- cores por categoria/atributo ----------
function geofenceColors(gf: Geofence) {
  const attr = gf.attributes || {};
  const explicit = (attr.color || attr.strokeColor) as string | undefined;

  const cat = String(attr.category || attr.type || '').toLowerCase();
  const palette: Record<string, string> = {
    restricted: '#ef4444', // vermelho
    delivery:   '#10b981', // verde
    warehouse:  '#f59e0b', // amarelo
    base:       '#2563eb', // azul
  };
  const base = explicit || palette[cat] || '#6b7280'; // cinza padrão

  return { strokeColor: base, fillColor: base }; // opacidade define no setOptions
}

// ---------- parser de áreas do Traccar ----------
function parseGeofenceArea(area: string):
  | { type: 'circle'; center: google.maps.LatLngLiteral; radius: number }
  | { type: 'polygon'; path: google.maps.LatLngLiteral[] }
  | null
{
  if (!area) return null;
  const s = area.trim();

  // CIRCLE (lon lat, radius)
  if (/^CIRCLE\s*\(/i.test(s)) {
    const m = s.match(/^CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*$/i);
    if (!m) return null;
    const lon = parseFloat(m[1]);
    const lat = parseFloat(m[2]);
    const radius = parseFloat(m[3]);
    if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(radius)) {
      return { type: 'circle', center: { lat, lng: lon }, radius };
    }
    return null;
  }

  // POLYGON ((lon lat, lon lat, ...))
  if (/^POLYGON\s*\(\(/i.test(s)) {
    const inside = s.replace(/^POLYGON\s*\(\(/i, '').replace(/\)\)\s*$/,'').trim();
    const pairs = inside.split(',').map(t => t.trim()).filter(Boolean);
    const path: google.maps.LatLngLiteral[] = [];
    for (const pair of pairs) {
      const [lonStr, latStr] = pair.split(/\s+/);
      const lon = parseFloat(lonStr);
      const lat = parseFloat(latStr);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        path.push({ lat, lng: lon });
      }
    }
    if (path.length >= 3) return { type: 'polygon', path };
    return null;
  }
  return null;
}

export default function LiveMap() {
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map>();
  const loaderRef = useRef<Loader | null>(null);
  const lastLoadedApiKeyRef = useRef<string>('');
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const polylinesRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const geofenceOverlaysRef = useRef<Map<number, google.maps.Circle | google.maps.Polygon>>(new Map());
  const lastSeenTsRef = useRef<Map<number, number>>(new Map());
  const lastPosRef = useRef<Map<number, Position>>(new Map()); // ← última posição por device (para busca)
  const infoRef = useRef<google.maps.InfoWindow>();
  const clustererRef = useRef<MarkerClusterer<google.maps.marker.AdvancedMarkerElement> | null>(null);
  const devOverlayObserverRef = useRef<MutationObserver | null>(null);

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [nameMap, setNameMap] = useState<Record<number, string>>({});
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [showGeofences, setShowGeofences] = useState(true);
  const [deviceSnapshots, setDeviceSnapshots] = useState<Map<number, Position>>(() => new Map());
  const [isCompact, setIsCompact] = useState(false);

  // Busca (UI)
  const [query, setQuery] = useState('');
  const filteredDevices = useMemo(() => {
    const entries = Object.entries(nameMap).map(([idStr, nm]) => {
      const id = Number(idStr);
      return { id, name: nm, snapshot: deviceSnapshots.get(id) };
    });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [deviceSnapshots, nameMap, query]);
  const totalRegistered = useMemo(() => Object.keys(nameMap).length, [nameMap]);

  // ---- toasts simples ----
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  function showToast(text: string) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), 5000);
  }

  // -------- rota (backend) --------
  const { apiFetch, token } = useAuth();

  const fetchRoute = useCallback(async (deviceId: number, hours = 2) => {
    const search = new URLSearchParams({
      deviceId: String(deviceId),
      hours: String(hours),
    });
    return apiFetch<Position[]>(`/traccar/route?${search.toString()}`);
  }, [apiFetch]);

  function drawRoute(deviceId: number, positions: Position[]) {
    if (!mapRef.current || !positions.length) return;

    // remove rota anterior do mesmo device
    const old = polylinesRef.current.get(deviceId);
    if (old) {
      old.setMap(null);
      polylinesRef.current.delete(deviceId);
    }

    const path = positions.map((p) => ({ lat: p.latitude, lng: p.longitude }));

    // setas de direção
    const arrowSymbol: google.maps.Symbol = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 3,
      strokeOpacity: 1,
    };

    const poly = new google.maps.Polyline({
      path,
      strokeOpacity: 0.9,
      strokeWeight: 3,
      icons: [{ icon: arrowSymbol, offset: '25%', repeat: '20%' }],
    });
    poly.setMap(mapRef.current);
    polylinesRef.current.set(deviceId, poly);

    // ajusta o mapa para a trilha
    const bounds = new google.maps.LatLngBounds();
    path.forEach((pt) => bounds.extend(pt as any));
    mapRef.current.fitBounds(bounds);
  }

  function clearRoute(deviceId: number) {
    const poly = polylinesRef.current.get(deviceId);
    if (poly) {
      poly.setMap(null);
      polylinesRef.current.delete(deviceId);
    }
  }

  // -------- bootstrap --------
  useEffect(() => {
    let cancelled = false;

    const ensureGoogleMapsLoaded = async () => {
      if (typeof window === 'undefined') return;

      const storedKey = window.localStorage?.getItem('googleMapsApiKey')?.trim() ?? '';
      const envKey = (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined)?.trim() ?? '';
      let apiKey = storedKey || envKey;

      const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        let existingKey = '';
        if (existingScript.src) {
          try {
            const parsed = new URL(existingScript.src);
            existingKey = parsed.searchParams.get('key')?.trim() ?? '';
          } catch (error) {
            console.warn('Não foi possível analisar a URL do script do Google Maps existente.', error);
          }
        }

        if (existingKey && !apiKey) {
          apiKey = existingKey;
        } else if (!existingKey && apiKey) {
          existingScript.remove();
          if ((window as any).google) {
            delete (window as any).google;
          }
          resetGoogleMapsLoaderInstance();
        } else if (existingKey && apiKey && existingKey !== apiKey) {
          existingScript.remove();
          if ((window as any).google) {
            delete (window as any).google;
          }
          resetGoogleMapsLoaderInstance();
        }
      }

      if (loaderRef.current && lastLoadedApiKeyRef.current && lastLoadedApiKeyRef.current !== apiKey) {
        loaderRef.current = null;
        lastLoadedApiKeyRef.current = '';
        if ((window as any).google) {
          delete (window as any).google;
        }
        resetGoogleMapsLoaderInstance();
      }

      if (!apiKey) {
        if (!cancelled) {
          setMapError('Configure a chave da API do Google Maps para visualizar o mapa.');
        }
        return;
      }

      if (!loaderRef.current) {
        loaderRef.current = new Loader({
          apiKey,
          version: 'weekly',
          libraries: [...GOOGLE_MAPS_LIBRARIES],
          id: GOOGLE_MAPS_SCRIPT_ID,
        });
        lastLoadedApiKeyRef.current = apiKey;
      }

      try {
        await loaderRef.current.load();
      } catch (error) {
        console.error('Erro ao carregar Google Maps:', error);
        if (!cancelled) {
          let friendly = 'Verifique se a chave da API está correta e com faturamento habilitado.';
          if (error instanceof Error) {
            if (error.message.includes('BillingNotEnabledMapError')) {
              friendly = 'Habilite o faturamento do projeto no Google Cloud Console para continuar usando o mapa.';
            } else if (error.message.includes('InvalidKeyMapError')) {
              friendly = 'A chave informada é inválida. Revise a configuração e tente novamente.';
            } else if (error.message.includes('RefererNotAllowedMapError')) {
              friendly = 'O domínio atual não está autorizado a usar essa chave. Ajuste as restrições no Google Cloud.';
            }
          }
          setMapError(`Não foi possível carregar o Google Maps. ${friendly}`);
        }
        lastLoadedApiKeyRef.current = '';
        loaderRef.current = null;
        resetGoogleMapsLoaderInstance();
        return;
      }

      if (cancelled || !mapDiv.current) return;

      mapRef.current = new google.maps.Map(mapDiv.current, {
        center: { lat: -15.7797, lng: -47.9297 },
        zoom: 5,
        streetViewControl: false,
        mapTypeControl: false,
      });
      infoRef.current = new google.maps.InfoWindow();

      clustererRef.current = new MarkerClusterer({
        map: mapRef.current,
        markers: [],
      });

      const hideDevelopmentOverlay = () => {
        document.querySelectorAll<HTMLDivElement>('.gm-style-cc').forEach((node) => {
          if (node.textContent?.toLowerCase().includes('for development purposes only')) {
            node.style.display = 'none';
          }
        });
      };

      hideDevelopmentOverlay();

      if (devOverlayObserverRef.current) {
        devOverlayObserverRef.current.disconnect();
      }

      devOverlayObserverRef.current = new MutationObserver(hideDevelopmentOverlay);
      const mapContainer = mapDiv.current.parentElement ?? document.body;
      devOverlayObserverRef.current.observe(mapContainer, { childList: true, subtree: true });

      if (!cancelled) {
        setMapError(null);
        setReady(true);
      }
    };

    ensureGoogleMapsLoaded();

    return () => {
      cancelled = true;
      if (devOverlayObserverRef.current) {
        devOverlayObserverRef.current.disconnect();
        devOverlayObserverRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const update = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsCompact(event.matches);
    };

    update(media);

    if (typeof media.addEventListener === 'function') {
      const listener = (event: MediaQueryListEvent) => update(event);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }

    const legacyListener = (event: MediaQueryListEvent) => update(event);
    media.addListener(legacyListener);
    return () => media.removeListener(legacyListener);
  }, []);

  // snapshot inicial: nomes + últimas posições + geofences
  useEffect(() => {
    if (!ready || !token) return;

    apiFetch<Record<number, string>>('/traccar/devices/map')
      .then((m) => setNameMap(m || {}))
      .catch(() => {});

    apiFetch<Position[]>('/traccar/positions/latest')
      .then((positions) => {
        applyBatch(positions);
        fitToMarkers();
      })
      .catch(() => {});

    apiFetch<Geofence[]>('/traccar/geofences')
      .then((gfs) => setGeofences(Array.isArray(gfs) ? gfs : []))
      .catch(() => {});
  }, [apiFetch, ready, token]);

  // desenhar/limpar geofences quando mudar toggle ou lista (com cores)
  useEffect(() => {
    if (!mapRef.current) return;

    // limpa overlays anteriores
    for (const ov of geofenceOverlaysRef.current.values()) {
      ov.setMap(null);
    }
    geofenceOverlaysRef.current.clear();

    if (!showGeofences) return;
    for (const gf of geofences) {
      const parsed = parseGeofenceArea(gf.area);
      if (!parsed) continue;

      const { strokeColor, fillColor } = geofenceColors(gf);

      if (parsed.type === 'circle') {
        const circle = new google.maps.Circle({
          map: mapRef.current,
          center: parsed.center,
          radius: parsed.radius,
          fillOpacity: 0.12,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          strokeColor,
          fillColor,
        });
        geofenceOverlaysRef.current.set(gf.id, circle);
      } else if (parsed.type === 'polygon') {
        const polygon = new google.maps.Polygon({
          map: mapRef.current,
          paths: parsed.path,
          fillOpacity: 0.12,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          strokeColor,
          fillColor,
        });
        geofenceOverlaysRef.current.set(gf.id, polygon);
      }
    }
  }, [showGeofences, geofences]);

  // tempo real via SSE: posições + eventos (geofence enter/exit)
  useTraccarRealtime({
    onPositions: (positions: Position[]) => {
      const latest = reduceToLatestByDevice(positions);
      applyBatch(latest);
    },
    onEvents: (events: TraccarEvent[]) => {
      if (!Array.isArray(events)) return;
      for (const ev of events) {
        if (!ev?.type || !ev?.deviceId) continue;
        const gId = ev.geofenceId ?? ev.attributes?.geofenceId;
        if (!gId) continue;

        if (ev.type === 'geofenceEnter' || ev.type === 'geofenceExit') {
          const deviceName = nameMap[ev.deviceId] || `Device ${ev.deviceId}`;
          const gf = geofences.find(g => g.id === gId);
          const gfName = gf?.name || `Geofence ${gId}`;
          const verb = ev.type === 'geofenceEnter' ? 'entrou em' : 'saiu de';
          const when = fmtTime(ev.eventTime || ev.serverTime);
          showToast(`${deviceName} ${verb} "${gfName}" • ${when}`);

          // destaque visual
          highlightGeofence(gId);
        }
      }
    }
  });

  // -------- helpers --------
  function reduceToLatestByDevice(batch: Position[]): Position[] {
    const byDevice = new Map<number, Position>();
    for (const p of batch) {
      if (!p || typeof p.latitude !== 'number' || typeof p.longitude !== 'number') continue;
      const prev = byDevice.get(p.deviceId);
      if (!prev || tsOf(p) >= tsOf(prev)) byDevice.set(p.deviceId, p);
    }
    return Array.from(byDevice.values());
  }

  function applyBatch(batch: Position[]) {
    const updates = new Map<number, Position>();
    for (const p of batch) {
      const ts = tsOf(p);
      const lastTs = lastSeenTsRef.current.get(p.deviceId) ?? -Infinity;
      if (ts < lastTs) continue; // chegou atrasada → ignora
      lastSeenTsRef.current.set(p.deviceId, ts);
      lastPosRef.current.set(p.deviceId, p); // guarda última posição para busca
      updates.set(p.deviceId, p);
      upsertMarker(p);
    }
    // reaplica o clustering após o lote com a API atual do MarkerClusterer
    clustererRef.current?.render();

    if (updates.size) {
      setDeviceSnapshots((prev) => {
        let changed = false;
        const next = new Map(prev);
        updates.forEach((pos, id) => {
          const prevPos = prev.get(id);
          if (!prevPos || tsOf(pos) !== tsOf(prevPos)) {
            next.set(id, pos);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }

  function createDeviceMarkerContent(color: string) {
    const pin = new google.maps.marker.PinElement({
      background: color,
      borderColor: '#1f2937',
      glyphColor: '#ffffff',
      scale: 1.1,
    });
    const el = pin.element;
    el.dataset.deviceMarker = 'true';
    return el;
  }

  function markerColorFor(p: Position) {
    return (p.speed ?? 0) > 0.5 ? '#2563eb' : '#10b981';
  }

  function upsertMarker(p: Position) {
    if (!mapRef.current) return;

    const markers = markersRef.current;
    const latLng = new google.maps.LatLng(p.latitude, p.longitude);
    const name = nameMap[p.deviceId] || `Device ${p.deviceId}`;
    const timestamp = p.fixTime || p.deviceTime || p.serverTime;
    const color = markerColorFor(p);

    let m = markers.get(p.deviceId);
    if (!m) {
      // cria sem map (o clusterer gerencia o map)
      m = new google.maps.marker.AdvancedMarkerElement({
        position: latLng,
        title: `${name}`,
        content: createDeviceMarkerContent(color),
      });
      m.addListener('click', () => openInfo(m!, p));
      markers.set(p.deviceId, m);
      clustererRef.current?.addMarker(m, true);
    } else {
      m.position = latLng;
      m.content = createDeviceMarkerContent(color);
      google.maps.event.clearListeners(m, 'click');
      m.addListener('click', () => openInfo(m!, p));
    }

    // title informativo
    m.title = `${name} • ${fmtSpeed(p.speed)} • ${fmtTime(timestamp)}`;
  }

  async function onRouteAction(deviceId: number, hours = 2) {
    const already = polylinesRef.current.get(deviceId);
    if (already) {
      clearRoute(deviceId);
      infoRef.current?.close();
      return;
    }
    try {
      const route = await fetchRoute(deviceId, hours);
      drawRoute(deviceId, route);
      infoRef.current?.close();
    } catch (e) {
      console.warn('Falha ao buscar/desenhar rota:', e);
    }
  }

  function openInfo(marker: google.maps.marker.AdvancedMarkerElement, p: Position) {
    const name = nameMap[p.deviceId] || `Device ${p.deviceId}`;
    const time = p.fixTime || p.deviceTime || p.serverTime;

    const hasTrack = polylinesRef.current.has(p.deviceId);
    const uid = `${p.deviceId}-${Date.now()}`;
    const btnId = `route-btn-${uid}`;
    const selId = `period-sel-${uid}`;
    const actionLabel = hasTrack ? 'Ocultar trilha' : 'Ver trilha';

    const html = `
      <div style="font-family: system-ui; font-size: 13px">
        <div style="font-weight:600; margin-bottom:4px">${name}</div>
        <div>Velocidade: <b>${fmtSpeed(p.speed)}</b></div>
        <div>Horário: <b>${fmtTime(time)}</b></div>
        <div>Coordenadas: <b>${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}</b></div>

        <div style="display:flex; gap:8px; align-items:center; margin-top:10px">
          <label for="${selId}" style="font-weight:600">Período:</label>
          <select id="${selId}" style="padding:6px 8px; border:1px solid #d1d5db; border-radius:8px">
            <option value="0.5">30 min</option>
            <option value="2" selected>2 h</option>
            <option value="6">6 h</option>
            <option value="24">24 h</option>
          </select>

          <button id="${btnId}" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#111827;color:#fff;cursor:pointer">
            ${actionLabel}
          </button>
        </div>
      </div>`;

    infoRef.current?.setContent(html);
    infoRef.current?.open({ map: mapRef.current, anchor: marker });

    google.maps.event.addListenerOnce(infoRef.current!, 'domready', () => {
      const btn = document.getElementById(btnId);
      const sel = document.getElementById(selId) as HTMLSelectElement | null;
      if (!btn) return;
      btn.addEventListener('click', () => {
        const hours = sel ? parseFloat(sel.value) : 2;
        onRouteAction(p.deviceId, isFinite(hours) ? hours : 2);
      }, { once: true });
    });
  }

  // destaca uma geofence por 5s (mesmo se estiver oculta)
  function highlightGeofence(geofenceId: number) {
    const overlay = geofenceOverlaysRef.current.get(geofenceId);
    if (!overlay || !mapRef.current) return;

    const wasHidden = (overlay as any).getMap && !(overlay as any).getMap();
    if (wasHidden) (overlay as any).setMap(mapRef.current);

    const prev: any = {};
    if ((overlay as google.maps.Circle).getRadius) {
      const circle = overlay as google.maps.Circle;
      prev.strokeWeight = circle.get('strokeWeight');
      prev.fillOpacity  = circle.get('fillOpacity');
      circle.setOptions({ strokeWeight: 4, fillOpacity: 0.25 });
    } else {
      const polygon = overlay as google.maps.Polygon;
      prev.strokeWeight = polygon.get('strokeWeight');
      prev.fillOpacity  = polygon.get('fillOpacity');
      polygon.setOptions({ strokeWeight: 4, fillOpacity: 0.25 });
    }

    setTimeout(() => {
      if (!overlay) return;
      if ((overlay as google.maps.Circle).getRadius) {
        (overlay as google.maps.Circle).setOptions({
          strokeWeight: prev.strokeWeight ?? 2,
          fillOpacity: prev.fillOpacity ?? 0.12,
        });
      } else {
        (overlay as google.maps.Polygon).setOptions({
          strokeWeight: prev.strokeWeight ?? 2,
          fillOpacity: prev.fillOpacity ?? 0.12,
        });
      }
      if (wasHidden) (overlay as any).setMap(null);
    }, 5000);
  }

  function fitToMarkers() {
    if (!mapRef.current) return;
    const all = Array.from(markersRef.current.values());
    if (!all.length) return;
    const bounds = new google.maps.LatLngBounds();
    for (const m of all) {
      const pos = m.position;
      if (!pos) continue;
      const latLng = pos instanceof google.maps.LatLng ? pos : new google.maps.LatLng(pos);
      bounds.extend(latLng);
    }
    mapRef.current.fitBounds(bounds);
  }

  // ------ Busca: voar até device ------
  function flyToDevice(deviceId: number) {
    if (!mapRef.current) return;
    const marker = markersRef.current.get(deviceId);
    const snapshot = lastPosRef.current.get(deviceId);
    if (!marker || !snapshot) return;
    const markerPos = marker.position;
    if (!markerPos) return;
    const latLng = markerPos instanceof google.maps.LatLng ? markerPos : new google.maps.LatLng(markerPos);
    mapRef.current.panTo(latLng);
    mapRef.current.setZoom(Math.max(mapRef.current.getZoom() ?? 5, 15));
    openInfo(marker, snapshot);
  }

  const layoutStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isCompact ? 'column' : 'row',
    alignItems: 'stretch',
    width: '100%',
    gap: isCompact ? 12 : 16,
    height: isCompact ? 'auto' : '80vh',
  };

  const mapWrapperStyle: CSSProperties = {
    flex: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: isCompact ? '60vh' : '100%',
    height: isCompact ? '60vh' : '100%',
    boxShadow: '0 30px 60px -40px rgba(15,23,42,0.55)',
    background: '#cbd5f5',
  };

  const panelStyle: CSSProperties = {
    width: isCompact ? '100%' : 360,
    maxWidth: isCompact ? '100%' : 380,
    background: 'linear-gradient(165deg, #ffffff 0%, #f8fafc 40%, #eef2ff 100%)',
    border: '1px solid rgba(148,163,184,0.35)',
    borderRadius: 20,
    boxShadow: '0 35px 65px -45px rgba(15,23,42,0.65)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: 'system-ui',
    color: '#0f172a',
  };

  return (
    <div style={layoutStyle}>
      <aside style={panelStyle}>
        <div style={{
          padding: '22px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #312e81 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <span style={{ fontSize: 14, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.75 }}>frota ao vivo</span>
          <span style={{ fontSize: 22, fontWeight: 700 }}>Dispositivos cadastrados</span>
          <span style={{ fontSize: 13, opacity: 0.85 }}>
            {filteredDevices.length} de {totalRegistered} dispositivos exibidos
          </span>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label htmlFor="device-search" style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Buscar dispositivo</label>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 14,
            border: '1px solid rgba(148,163,184,0.4)',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
          }}>
            <span style={{ paddingLeft: 14, paddingRight: 6, color: '#64748b' }}>🔍</span>
            <input
              id="device-search"
              type="text"
              placeholder="Nome, placa ou apelido"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px 12px 6px',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 14,
                color: '#0f172a',
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, padding: '0 22px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredDevices.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.75)',
              border: '1px dashed rgba(148,163,184,0.6)',
              borderRadius: 16,
              padding: '28px 22px',
              textAlign: 'center',
              fontSize: 14,
              color: '#475569',
            }}>
              Nenhum dispositivo encontrado para esta busca.
            </div>
          ) : (
            filteredDevices.map(({ id, name, snapshot }) => {
              const lastTime = snapshot?.fixTime || snapshot?.deviceTime || snapshot?.serverTime;
              const statusMoving = (snapshot?.speed ?? 0) > 0.5;
              const statusLabel = snapshot ? (statusMoving ? 'Em movimento' : 'Parado') : 'Sem posição';
              const statusColor = snapshot ? (statusMoving ? '#2563eb' : '#10b981') : '#9ca3af';
              const coordsLabel = snapshot ? `${snapshot.latitude.toFixed(4)}, ${snapshot.longitude.toFixed(4)}` : '—';
              const speedLabel = fmtSpeed(snapshot?.speed);
              const updatedLabel = snapshot ? timeAgo(lastTime) : 'Sem atualização';
              const updatedTitle = lastTime ? fmtTime(lastTime) : 'Sem registro';

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => flyToDevice(id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: '1px solid rgba(148,163,184,0.35)',
                    borderRadius: 16,
                    background: 'linear-gradient(140deg, rgba(255,255,255,0.95) 0%, rgba(226,232,240,0.9) 100%)',
                    boxShadow: '0 18px 40px -30px rgba(15,23,42,0.7)',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = 'translateY(-2px)';
                    event.currentTarget.style.boxShadow = '0 24px 45px -32px rgba(15,23,42,0.75)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = 'translateY(0)';
                    event.currentTarget.style.boxShadow = '0 18px 40px -30px rgba(15,23,42,0.7)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span style={{
                        width: 12,
                        height: 12,
                        borderRadius: '999px',
                        background: statusColor,
                        boxShadow: `0 0 0 6px ${statusColor}1F`,
                        flexShrink: 0,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{statusLabel}</span>
                          <span style={{ opacity: 0.4 }}>•</span>
                          <span title={`ID ${id}`}>ID {id}</span>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>ver no mapa ↗</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1e293b',
                      background: 'rgba(59,130,246,0.12)',
                      borderRadius: 999,
                      padding: '6px 10px',
                    }}>
                      Velocidade {speedLabel}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#475569',
                        background: 'rgba(15,23,42,0.05)',
                        borderRadius: 999,
                        padding: '6px 10px',
                      }}
                      title={updatedTitle}
                    >
                      Atualizado {updatedLabel}
                    </span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#1e293b',
                      background: 'rgba(16,185,129,0.12)',
                      borderRadius: 999,
                      padding: '6px 10px',
                    }}>
                      Coordenadas {coordsLabel}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div style={mapWrapperStyle}>
        {/* Toggle Geofences */}
        <div style={{
          position: 'absolute', zIndex: 3, top: 12, left: 12,
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px',
          fontFamily: 'system-ui', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <input
            id="gf-toggle"
            type="checkbox"
            checked={showGeofences}
            onChange={(e) => setShowGeofences(e.target.checked)}
          />
          <label htmlFor="gf-toggle">Mostrar geofences</label>
        </div>

        {/* Toasts (eventos) */}
        <div style={{
          position: 'absolute', zIndex: 3, top: 12, right: 12,
          display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background: 'rgba(17,24,39,0.95)', color: 'white',
              borderRadius: 10, padding: '10px 12px', fontFamily: 'system-ui', fontSize: 13,
              boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
            }}>
              {t.text}
            </div>
          ))}
        </div>

        <div ref={mapDiv} style={{ width: '100%', height: '100%' }} />
        {mapError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              background: 'rgba(15, 23, 42, 0.72)',
              color: 'white',
              textAlign: 'center',
              fontFamily: 'system-ui',
              zIndex: 4,
            }}
          >
            <div style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <strong style={{ fontSize: 18 }}>Não foi possível carregar o mapa</strong>
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{mapError}</span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Verifique as configurações da chave do Google Maps em Configurações → Integrações e tente novamente.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
