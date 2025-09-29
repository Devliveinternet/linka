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
import { 
  mockDevices, 
  mockDrivers, 
  mockVehicles, 
  mockTrips, 
  mockAlerts, 
  mockGeofences 
} from './data/mockData';
import { Alert } from './types';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real implementation, this would be WebSocket connections
      console.log('Real-time data update simulation');
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

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

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView devices={mockDevices} alerts={alerts} vehicles={mockVehicles} />;
      case 'map':
        return <FleetMapView 
          devices={mockDevices} 
          drivers={mockDrivers} 
          vehicles={mockVehicles}
          onNavigateToAdmin={() => setActiveView('admin')}
        />;
      case 'vehicles':
        return <VehiclesList devices={mockDevices} vehicles={mockVehicles} drivers={mockDrivers} />;
      case 'drivers':
        return <DriversView drivers={mockDrivers} devices={mockDevices} />;
      case 'geofences':
        return <GeofencesView geofences={mockGeofences} />;
      case 'alerts':
        return <AlertsView alerts={alerts} onAcknowledgeAlert={handleAcknowledgeAlert} />;
      case 'trips':
        return <TripsView trips={mockTrips} drivers={mockDrivers} vehicles={mockVehicles} />;
      case 'admin':
        return <AdminView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView devices={mockDevices} alerts={alerts} />;
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
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App;