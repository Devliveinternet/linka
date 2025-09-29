import React, { useState, useEffect } from 'react';
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
import { FleetMapView } from './components/Map/FleetMapView';
import { useTraccarData } from './hooks/useTraccarData';
import { Alert } from './types';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Usar dados reais do Traccar
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

  // Atualizar alerts quando os dados do Traccar mudarem
  useEffect(() => {
    setAlerts(traccarAlerts);
  }, [traccarAlerts]);

  const currentUser = {
    name: 'Carlos Mendes',
    email: 'carlos.mendes@empresa.com',
    role: 'manager'
  };

  const pendingAlerts = alerts.filter(a => !a.acknowledged).length;

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            acknowledged: true, 
            acknowledgedBy: currentUser.name,
            acknowledgedAt: new Date().toISOString()
          }
        : alert
    ));
  };

  // Mostrar loading enquanto carrega dados
  if (loading && devices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Conectando ao servidor Traccar...</p>
        </div>
      </div>
    );
  }

  // Mostrar erro se houver
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
        return <FleetMapView 
          devices={devices} 
          drivers={drivers} 
          vehicles={vehicles}
          onNavigateToAdmin={() => setActiveView('admin')}
        />;
      case 'vehicles':
        return <VehiclesList devices={devices} vehicles={vehicles} drivers={drivers} />;
      case 'drivers':
        return <DriversView drivers={drivers} devices={devices} />;
      case 'geofences':
        return <GeofencesView geofences={geofences} />;
      case 'alerts':
        return <AlertsView alerts={alerts} onAcknowledgeAlert={handleAcknowledgeAlert} />;
      case 'trips':
        return <TripsView trips={trips} drivers={drivers} vehicles={vehicles} />;
      case 'admin':
        return <AdminView />;
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
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={currentUser} alertCount={pendingAlerts} />
        
        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          {/* Indicador de status da conexão */}
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
}

export default App;