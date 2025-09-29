import React, { useState } from 'react';
import { StatsCard } from './StatsCard';
import { FleetMap } from './FleetMap';
import { RecentAlerts } from './RecentAlerts';
import { Truck, Users, AlertTriangle, TrendingUp, Fuel, Clock } from 'lucide-react';
import { Device, Alert, Vehicle } from '../../types';

interface DashboardViewProps {
  devices: Device[];
  alerts: Alert[];
  vehicles?: Vehicle[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ devices, alerts, vehicles = [] }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>();
  
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const movingDevices = devices.filter(d => d.position?.ignition && d.position?.speed > 5).length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const avgScore = Math.round(devices.reduce((acc, d) => acc + (Math.random() * 100), 0) / devices.length);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard da Frota</h1>
        <p className="text-sm sm:text-base text-gray-600">Visão geral das operações em tempo real</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard
          title="Veículos Online"
          value={`${onlineDevices}/${devices.length}`}
          subtitle="Dispositivos conectados"
          icon={Truck}
          trend={{ value: 5, isPositive: true }}
          color="blue"
        />
        <StatsCard
          title="Em Movimento"
          value={movingDevices}
          subtitle="Veículos ativos"
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Alertas Críticos"
          value={criticalAlerts}
          subtitle="Requerem atenção"
          icon={AlertTriangle}
          trend={{ value: -12, isPositive: true }}
          color={criticalAlerts > 0 ? "red" : "green"}
        />
        <StatsCard
          title="Score Médio"
          value={`${avgScore}%`}
          subtitle="Comportamento de condução"
          icon={Users}
          trend={{ value: 3, isPositive: true }}
          color="green"
        />
      </div>

      {/* Map and Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <FleetMap
            devices={devices}
            vehicles={vehicles}
            selectedDevice={selectedDevice}
            onDeviceSelect={setSelectedDevice}
          />
        </div>
        <div>
          <RecentAlerts alerts={alerts.slice(0, 10)} />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <StatsCard
          title="Consumo de Combustível"
          value="2.847 L"
          subtitle="Últimas 24h"
          icon={Fuel}
          trend={{ value: -8, isPositive: true }}
          color="blue"
        />
        <StatsCard
          title="Tempo de Viagem"
          value="156h 32m"
          subtitle="Esta semana"
          icon={Clock}
          color="green"
        />
        <StatsCard
          title="Distância Total"
          value="12.847 km"
          subtitle="Este mês"
          icon={TrendingUp}
          trend={{ value: 15, isPositive: true }}
          color="blue"
        />
      </div>
    </div>
  );
};