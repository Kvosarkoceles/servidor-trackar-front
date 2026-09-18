import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Estilos base + Leaflet (mapa) y su plugin de clustering.
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './index.css';

import { App } from './App';
import { initAuthIntegration } from '@/stores/authStore';

// Conecta el cliente HTTP con el estado de sesión (API Key) antes de renderizar.
initAuthIntegration();

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el contenedor #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
