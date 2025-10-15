import { Loader } from '@googlemaps/js-api-loader';

export const GOOGLE_MAPS_SCRIPT_ID = '__googleMapsScriptId';
export const GOOGLE_MAPS_LIBRARIES = ['maps', 'marker'] as const;
export const GOOGLE_MAPS_API_KEY_STORAGE_KEY = 'googleMapsApiKey';
export const GOOGLE_MAPS_MAP_ID_STORAGE_KEY = 'googleMapsMapId';

type LoaderWithInstance = typeof Loader & { instance?: InstanceType<typeof Loader> | undefined };

export function resetGoogleMapsLoaderInstance() {
  const loaderConstructor = Loader as LoaderWithInstance;
  if ('instance' in loaderConstructor) {
    loaderConstructor.instance = undefined;
  }
}

export function getStoredGoogleMapsApiKey(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage?.getItem(GOOGLE_MAPS_API_KEY_STORAGE_KEY)?.trim() ?? '';
}

export function getStoredGoogleMapsMapId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage?.getItem(GOOGLE_MAPS_MAP_ID_STORAGE_KEY)?.trim() ?? '';
}
