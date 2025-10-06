import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Location } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import { VehiclesList } from './components/Vehicles/VehiclesList';
import { DriversView } from './components/Drivers/DriversView';
import { GeofencesView } from './components/Geofences/GeofencesView';
import { AlertsView } from './components/Alerts/AlertsView';
import { TripsView } from './components/Trips/TripsView';
import { SettingsView } from './components/Settings/SettingsView';
import { AdminView } from './components/Admin/AdminView';
// import { FleetMapView } from './components/Map/FleetMapView';
import { useTraccarData } from './hooks/useTraccarData';
import { Alert } from './types';
import LiveMap from './components/LiveMap';
import { LoginPage } from './components/Auth/LoginPage';
import { useAuth, AuthUser } from './context/AuthContext';

const VIEW_ORDER: Array<'dashboard' | 'map' | 'vehicles' | 'drivers' | 'geofences' | 'alerts' | 'trips' | 'admin' | 'settings'> = [
  'dashboard',
  'map',
  'vehicles',
  'drivers',
  'geofences',
  'alerts',
  'trips',
  'admin',
  'settings',
];

function getAllowedViewsForUser(user: AuthUser) {
  if (user.role === 'admin' || user.role === 'master') {
    return [...VIEW_ORDER];
  }
  const restricted = Array.isArray(user.restrictions?.allowedViews) ? user.restrictions?.allowedViews : undefined;
  const allowed = restricted?.length ? restricted : ['dashboard', 'map', 'alerts'];
  const sanitized = allowed.filter((view): view is typeof VIEW_ORDER[number] => VIEW_ORDER.includes(view as any));
  return sanitized.length ? sanitized : ['dashboard'];
}

function canAcknowledgeAlerts(user: AuthUser) {
  if (user.role === 'child') {
    return user.restrictions?.canAcknowledgeAlerts !== false;
  }
  return true;
}

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center space-y-3">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

const AuthenticatedApp: React.FC<{ user: AuthUser; onLogout: () => Promise<void> }> = ({ user, onLogout }) => {
  const allowedViews = useMemo(() => getAllowedViewsForUser(user), [user]);
  const [activeView, setActiveView] = useState<typeof VIEW_ORDER[number]>(
    allowedViews.includes('dashboard') ? 'dashboard' : allowedViews[0]
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    devices,
    alerts: traccarAlerts,
    trips,
    geofences,
    drivers,
    vehicles,
    loading,
    error,
    refetch
  } = useTraccarData();

  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => { setAlerts(traccarAlerts); }, [traccarAlerts]);

  useEffect(() => {
    if (!allowedViews.includes(activeView)) {
      setActiveView(allowedViews[0]);
    }
  }, [allowedViews, activeView]);

  const pendingAlerts = alerts.filter(a => !a.acknowledged).length;
  const canAck = canAcknowledgeAlerts(user);

  const handleAcknowledgeAlert = (alertId: string) => {
    if (!canAck) return;
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? { ...alert, acknowledged: true, acknowledgedBy: user.name, acknowledgedAt: new Date().toISOString() }
        : alert
    ));
  };

  if (loading && devices.length === 0) {
    return <LoadingScreen message="Conectando ao servidor Traccar..." />;
  }

  if (error && devices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro de Conexão</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView devices={devices} alerts={alerts} vehicles={vehicles} />;
      case 'map':
        return <LiveMap />;
      case 'vehicles':
        return <VehiclesList devices={devices} vehicles={vehicles} drivers={drivers} />;
      case 'drivers':
        return <DriversView drivers={drivers} devices={devices} />;
      case 'geofences':
        return <GeofencesView geofences={geofences} />;
      case 'alerts':
        return (
          <AlertsView
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            canAcknowledge={canAck}
          />
        );
      case 'trips':
        return <TripsView trips={trips} drivers={drivers} vehicles={vehicles} />;
      case 'admin':
        return <AdminView currentUser={user} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView devices={devices} alerts={alerts} vehicles={vehicles} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        allowedViews={allowedViews}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} alertCount={pendingAlerts} onLogout={onLogout} />

        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          {error && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm">Problemas de conexão com o servidor Traccar. Alguns dados podem estar desatualizados.</span>
              </div>
            </div>
          )}
          {renderView()}
        </main>
      </div>
    </div>
  );
};

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <LoadingScreen message="Carregando sessão..." />;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
};

type LoginLocationState = { from?: Location };

const LoginRoute: React.FC = () => {
  const { login, user, isSubmitting, error, isBootstrapping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as LoginLocationState | undefined)?.from;
  const redirectPath = useMemo(() => {
    if (!fromLocation?.pathname) {
      return '/app';
    }
    const search = fromLocation.search ?? '';
    const hash = fromLocation.hash ?? '';
    const path = fromLocation.pathname || '/';
    return `${path}${search}${hash}`;
  }, [fromLocation]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login(email, password);
      navigate(redirectPath, { replace: true });
    },
    [login, navigate, redirectPath]
  );

  if (isBootstrapping) {
    return <LoadingScreen message="Carregando sessão..." />;
  }

  if (user) {
    return <Navigate to={redirectPath} replace />;
  }

  return <LoginPage onLogin={handleLogin} isSubmitting={isSubmitting} serverError={error} />;
};

const ProtectedAppRoute: React.FC = () => {
  const { user, logout } = useAuth();
  if (!user) {
    return null;
  }
  const handleLogout = useCallback(() => logout(), [logout]);
  return <AuthenticatedApp user={user} onLogout={handleLogout} />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginRoute />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route
        path="/app/*"
        element={(
          <RequireAuth>
            <ProtectedAppRoute />
          </RequireAuth>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
