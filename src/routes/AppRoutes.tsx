import { Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/pages/Login/LoginPage';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { LiveTrackingPage } from '@/pages/LiveTracking/LiveTrackingPage';
import { DevicesPage } from '@/pages/Devices/DevicesPage';
import { DeviceDetailsPage } from '@/pages/DeviceDetails/DeviceDetailsPage';
import { HistoryPage } from '@/pages/History/HistoryPage';
import { StatisticsPage } from '@/pages/Statistics/StatisticsPage';
import { EventsPage } from '@/pages/Events/EventsPage';
import { GeofencesPage } from '@/pages/Geofences/GeofencesPage';
import { SettingsPage } from '@/pages/Settings/SettingsPage';
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage';
import { ROUTES } from '@/utils/constants';

/**
 * Tabla de rutas.
 *
 * `/login` es pública; el resto vive tras `ProtectedRoute` + `AppLayout`
 * (sidebar, header, búsqueda global, alertas y polling de posiciones).
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="rastreo" element={<LiveTrackingPage />} />
          <Route path="dispositivos" element={<DevicesPage />} />
          <Route path="dispositivos/:deviceId" element={<DeviceDetailsPage />} />
          <Route path="historial" element={<HistoryPage />} />
          <Route path="estadisticas" element={<StatisticsPage />} />
          <Route path="eventos" element={<EventsPage />} />
          <Route path="geocercas" element={<GeofencesPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
