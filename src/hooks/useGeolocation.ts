import { useCallback, useState } from 'react';

import { DEFAULT_MAP_CENTER } from '@/utils/constants';
import type { LatLng } from '@/utils/geo';

interface GeolocationState {
  position: LatLng | null;
  loading: boolean;
  error: string | null;
}

/**
 * Ubicación del navegador (función "mi ubicación" del mapa).
 * Es una función del cliente: no depende del backend.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    loading: false,
    error: null,
  });

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ position: null, loading: false, error: 'Tu navegador no permite geolocalización.' });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (result) => {
        setState({
          position: { lat: result.coords.latitude, lng: result.coords.longitude },
          loading: false,
          error: null,
        });
      },
      () => {
        setState({
          position: null,
          loading: false,
          error: 'No fue posible obtener tu ubicación.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return { ...state, locate, fallback: DEFAULT_MAP_CENTER };
}
