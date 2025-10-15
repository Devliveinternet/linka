import { Loader } from '@googlemaps/js-api-loader';

export const GOOGLE_MAPS_SCRIPT_ID = '__googleMapsScriptId';
export const GOOGLE_MAPS_LIBRARIES = ['maps', 'marker'] as const;

type LoaderWithInstance = typeof Loader & { instance?: InstanceType<typeof Loader> | undefined };

export function resetGoogleMapsLoaderInstance() {
  const loaderConstructor = Loader as LoaderWithInstance;
  if ('instance' in loaderConstructor) {
    loaderConstructor.instance = undefined;
  }
}
