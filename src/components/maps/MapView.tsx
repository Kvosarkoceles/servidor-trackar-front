import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import {
  Crosshair,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Scan,
} from 'lucide-react';

import { resolveProvider, TILE_PROVIDER_LIST } from './tiles';
import { Button } from '@/components/ui/Button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSettingsStore } from '@/stores/settingsStore';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/utils/constants';
import { boundsOf, type LatLng } from '@/utils/geo';
import { cn } from '@/utils/cn';

export interface MapFocus {
  center: LatLng;
  zoom?: number;
  /** Cambia para forzar el recentrado (mismo centro, distinto nonce). */
  nonce: number;
}

interface MapViewProps {
  className?: string;
  center?: LatLng;
  zoom?: number;
  /** Si se indican, el mapa se encuadra automáticamente a estos puntos. */
  fitPoints?: LatLng[];
  /** `false` desactiva el encuadre automático (el botón "Encuadrar" sigue activo). */
  autoFit?: boolean;
  /** Recentrado imperativo (p. ej. al pulsar "centrar" en la lista). */
  focus?: MapFocus | null;
  /** Muestra los controles flotantes. */
  controls?: boolean;
  /** Leyenda u otra capa superpuesta. */
  overlay?: ReactNode;
  children?: ReactNode;
}

/** Ajusta el encuadre cuando cambia el conjunto de puntos. */
function FitBoundsEffect({ points, disabled }: { points: LatLng[]; disabled: boolean }) {
  const map = useMap();
  const signature = useMemo(
    () => points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|'),
    [points],
  );

  useEffect(() => {
    if (disabled) return;
    const bounds = boundsOf(points);
    if (!bounds) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 15));
      return;
    }

    map.fitBounds(
      [
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng],
      ],
      { padding: [48, 48], maxZoom: 16 },
    );
    // `signature` resume el contenido de `points`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature, disabled]);

  return null;
}

/** Recentrado puntual solicitado desde fuera del mapa. */
function FocusEffect({ focus }: { focus: MapFocus | null }) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.center.lat, focus.center.lng], focus.zoom ?? Math.max(map.getZoom(), 15), {
      duration: 0.6,
    });
  }, [map, focus]);

  return null;
}

/** Invalida el tamaño del mapa cuando cambia la visibilidad del contenedor. */
function ResizeObserverEffect() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

function Controls({
  fitPoints,
  fitDisabled,
}: {
  fitPoints: LatLng[];
  fitDisabled: boolean;
}) {
  const map = useMap();
  const geolocation = useGeolocation();
  const providerId = useSettingsStore((state) => state.mapProvider);
  const update = useSettingsStore((state) => state.update);
  const [fullscreen, setFullscreen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const container = map.getContainer().parentElement ?? map.getContainer();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.requestFullscreen();
    } catch {
      /* el navegador puede bloquearlo */
    }
  };

  const fit = () => {
    const bounds = boundsOf(fitPoints);
    if (!bounds) return;
    if (fitPoints.length === 1) {
      map.flyTo([fitPoints[0].lat, fitPoints[0].lng], 15);
      return;
    }
    map.fitBounds(
      [
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng],
      ],
      { padding: [48, 48], maxZoom: 16 },
    );
  };

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[400] flex flex-col items-end gap-2">
      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-lg border border-line bg-panel/95 shadow-panel backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-none border-b border-line"
          onClick={() => map.zoomIn()}
          aria-label="Acercar"
          title="Acercar"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-none"
          onClick={() => map.zoomOut()}
          aria-label="Alejar"
          title="Alejar"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      <div className="pointer-events-auto flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 border-line bg-panel/95 backdrop-blur"
          disabled={fitDisabled}
          onClick={fit}
          aria-label="Encuadrar todos los dispositivos"
          title="Encuadrar todos"
        >
          <Scan className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 border-line bg-panel/95 backdrop-blur"
          loading={geolocation.loading}
          onClick={geolocation.locate}
          aria-label="Ir a mi ubicación"
          title="Mi ubicación"
        >
          {geolocation.loading ? null : <Crosshair className="h-4 w-4" />}
        </Button>

        <div className="relative">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 border-line bg-panel/95 backdrop-blur"
            onClick={() => setLayersOpen((open) => !open)}
            aria-label="Cambiar capa del mapa"
            aria-expanded={layersOpen}
            title="Capas"
          >
            <Layers className="h-4 w-4" />
          </Button>

          {layersOpen ? (
            <div className="absolute right-0 top-11 w-44 overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
              {TILE_PROVIDER_LIST.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    update({ mapProvider: provider.id });
                    setLayersOpen(false);
                  }}
                  className={cn(
                    'block w-full px-3 py-2 text-left text-xs hover:bg-panel-soft',
                    provider.id === providerId ? 'text-brand-400' : 'text-content',
                  )}
                >
                  {provider.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 border-line bg-panel/95 backdrop-blur"
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {geolocation.error ? (
        <p className="pointer-events-auto max-w-[180px] rounded-md border border-line bg-panel/95 px-2 py-1 text-[11px] text-content-muted">
          {geolocation.error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Mapa base de la aplicación (Leaflet + OpenStreetMap).
 *
 * Responsabilidades: capas de mosaicos, controles (zoom, encuadre, ubicación,
 * capas, pantalla completa), recentrado imperativo y ajuste automático de
 * encuadre. Los hijos (marcadores, polilíneas, geocercas) se inyectan desde
 * las páginas.
 */
export function MapView({
  className,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  fitPoints,
  autoFit = true,
  focus = null,
  controls = true,
  overlay,
  children,
}: MapViewProps) {
  const providerId = useSettingsStore((state) => state.mapProvider);
  const provider = resolveProvider(providerId);
  const containerRef = useRef<HTMLDivElement>(null);
  const points = fitPoints ?? [];
  const fitDisabled = points.length === 0;

  return (
    <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden rounded-xl', className)}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        attributionControl
        preferCanvas
      >
        <TileLayer
          key={provider.id}
          url={provider.url}
          attribution={provider.attribution}
          maxZoom={provider.maxZoom}
        />

        <ResizeObserverEffect />
        <FitBoundsEffect points={points} disabled={!autoFit || fitDisabled} />
        <FocusEffect focus={focus} />

        {children}

        {controls ? <Controls fitPoints={points} fitDisabled={fitDisabled} /> : null}
      </MapContainer>

      {overlay ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-col gap-2">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}
