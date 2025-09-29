import React, { useState } from 'react';
import { 
  Building, 
  Users, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Map,
  Settings as SettingsIcon,
  Save
} from 'lucide-react';
import { mapProviders, defaultMapConfig } from '../../data/mockData';
import { MapProvider, MapConfiguration } from '../../types';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [mapConfig, setMapConfig] = useState<MapConfiguration>(defaultMapConfig);

  const tabs = [
    { id: 'general', label: 'Geral', icon: SettingsIcon },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'integrations', label: 'Integrações', icon: Map },
    { id: 'branding', label: 'Marca', icon: Palette },
    { id: 'security', label: 'Segurança', icon: Shield },
  ];

  const handleProviderChange = (providerId: MapProvider['id']) => {
    setMapConfig(prev => ({
      ...prev,
      provider: providerId,
      apiKey: undefined // Reset API key when changing provider
    }));
  };

  const handleApiKeyChange = (apiKey: string) => {
    setMapConfig(prev => ({
      ...prev,
      apiKey
    }));
  };

  const handleSettingChange = (key: string, value: any) => {
    setMapConfig(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
  };

  const TabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    defaultValue="Transportadora ABC Ltda"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    defaultValue="12.345.678/0001-90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuso Horário
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>America/Sao_Paulo</option>
                    <option>America/Recife</option>
                    <option>America/Manaus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Português (Brasil)</option>
                    <option>English</option>
                    <option>Español</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Configurações de Notificação</h3>
            <div className="space-y-4">
              {[
                { label: 'Alertas de Velocidade', description: 'Notificar quando veículos excedem o limite' },
                { label: 'Cercas Virtuais', description: 'Entrada e saída de áreas definidas' },
                { label: 'Manutenção', description: 'Lembretes de manutenção preventiva' },
                { label: 'Combustível', description: 'Alertas de nível baixo ou possível roubo' },
                { label: 'Fadiga do Motorista', description: 'Detecção via DMS ou tempo de condução' }
              ].map((notification, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{notification.label}</h4>
                    <p className="text-sm text-gray-600">{notification.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-600">Email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-600">WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-gray-600">SMS</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {tabs.find(t => t.id === activeTab)?.icon && 
                React.createElement(tabs.find(t => t.id === activeTab)!.icon, { size: 48 })
              }
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <p className="text-gray-600">Configurações em desenvolvimento</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Personalize sua plataforma de gestão</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <TabContent />
          
          <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Save size={16} />
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};