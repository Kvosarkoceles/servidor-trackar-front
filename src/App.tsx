import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from '@/routes/AppRoutes';

/**
 * Raíz de la aplicación.
 * El estado global (Zustand) no necesita provider; el enrutado sí.
 */
export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
